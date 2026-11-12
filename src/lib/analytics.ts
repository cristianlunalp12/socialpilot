import type { Platform } from "@prisma/client";
import { subDays } from "date-fns";
import { db } from "./db";

export type TargetPerf = {
  targetId: string; postId: string; platform: Platform; account: string;
  caption: string; mediaType: string; publishedAt: Date; permalink: string | null;
  views: number; reach: number; likes: number; comments: number; shares: number; saves: number;
  engagement: number; engagementRate: number;
};

/** Latest metric snapshot per published target in the window. */
export async function targetPerformance(workspaceId: string, days = 30): Promise<TargetPerf[]> {
  const since = subDays(new Date(), days);
  const targets = await db.postTarget.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: since }, post: { workspaceId } },
    include: {
      post: { select: { id: true, baseCaption: true, mediaType: true } },
      account: { select: { platform: true, name: true } },
      metrics: { orderBy: { capturedAt: "desc" }, take: 1 },
    },
    orderBy: { publishedAt: "desc" },
  });
  return targets.map((t) => {
    const m = t.metrics[0];
    const engagement = m ? m.likes + m.comments + m.shares + m.saves : 0;
    const denom = m ? Math.max(m.reach, m.views, 1) : 1;
    return {
      targetId: t.id, postId: t.post.id, platform: t.account.platform, account: t.account.name,
      caption: t.caption, mediaType: t.post.mediaType, publishedAt: t.publishedAt!, permalink: t.permalink,
      views: m?.views ?? 0, reach: m?.reach ?? 0, likes: m?.likes ?? 0, comments: m?.comments ?? 0,
      shares: m?.shares ?? 0, saves: m?.saves ?? 0, engagement, engagementRate: engagement / denom,
    };
  });
}

export async function workspaceReport(workspaceId: string, days = 30) {
  const perf = await targetPerformance(workspaceId, days);
  const byPlatform = new Map<Platform, { posts: number; views: number; engagement: number; reach: number }>();
  const byHour = new Map<string, { posts: number; er: number }>();
  const byMedia = new Map<string, { posts: number; er: number }>();
  const DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

  for (const p of perf) {
    const b = byPlatform.get(p.platform) ?? { posts: 0, views: 0, engagement: 0, reach: 0 };
    b.posts++; b.views += p.views; b.engagement += p.engagement; b.reach += p.reach;
    byPlatform.set(p.platform, b);
    const slot = `${p.platform}|${DAYS[p.publishedAt.getDay()]}|${p.publishedAt.getHours()}h`;
    const h = byHour.get(slot) ?? { posts: 0, er: 0 }; h.posts++; h.er += p.engagementRate; byHour.set(slot, h);
    const mk = `${p.platform}|${p.mediaType}`;
    const md = byMedia.get(mk) ?? { posts: 0, er: 0 }; md.posts++; md.er += p.engagementRate; byMedia.set(mk, md);
  }

  const comments = await db.comment.findMany({
    where: { target: { post: { workspaceId } }, postedAt: { gte: subDays(new Date(), days) } },
    select: { sentiment: true, topics: true, needsReply: true, text: true },
  });
  const sentiment = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, UNANALYZED: 0 };
  const topics = new Map<string, { count: number; negative: number }>();
  for (const c of comments) {
    sentiment[c.sentiment ?? "UNANALYZED"]++;
    for (const t of c.topics) {
      const x = topics.get(t) ?? { count: 0, negative: 0 };
      x.count++; if (c.sentiment === "NEGATIVE") x.negative++;
      topics.set(t, x);
    }
  }

  const accounts = await db.socialAccount.findMany({
    where: { workspaceId },
    include: { snapshots: { where: { date: { gte: subDays(new Date(), days) } }, orderBy: { date: "asc" } } },
  });

  const totals = perf.reduce((a, p) => ({
    posts: a.posts + 1, views: a.views + p.views, reach: a.reach + p.reach, engagement: a.engagement + p.engagement,
  }), { posts: 0, views: 0, reach: 0, engagement: 0 });

  return {
    periodDays: days,
    totals: { ...totals, engagementRate: totals.engagement / Math.max(totals.reach, totals.views, 1) },
    byPlatform: [...byPlatform].map(([platform, v]) => ({ platform, ...v, engagementRate: v.engagement / Math.max(v.reach, v.views, 1) })),
    timeSlots: [...byHour].map(([k, v]) => { const [platform, day, hour] = k.split("|"); return { platform, day, hour, posts: v.posts, avgEngagementRate: +(v.er / v.posts).toFixed(4) }; })
      .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate).slice(0, 25),
    mediaTypes: [...byMedia].map(([k, v]) => { const [platform, mediaType] = k.split("|"); return { platform, mediaType, posts: v.posts, avgEngagementRate: +(v.er / v.posts).toFixed(4) }; }),
    topPosts: [...perf].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5)
      .map((p) => ({ platform: p.platform, caption: p.caption.slice(0, 280), mediaType: p.mediaType, views: p.views, engagementRate: +p.engagementRate.toFixed(4) })),
    bottomPosts: [...perf].sort((a, b) => a.engagementRate - b.engagementRate).slice(0, 3)
      .map((p) => ({ platform: p.platform, caption: p.caption.slice(0, 280), mediaType: p.mediaType, views: p.views, engagementRate: +p.engagementRate.toFixed(4) })),
    audience: {
      comments: comments.length, sentiment,
      topTopics: [...topics].sort((a, b) => b[1].count - a[1].count).slice(0, 12).map(([topic, v]) => ({ topic, ...v })),
      pendingReplies: comments.filter((c) => c.needsReply).length,
      sampleNegative: comments.filter((c) => c.sentiment === "NEGATIVE").slice(0, 8).map((c) => c.text.slice(0, 200)),
    },
    followers: accounts.map((a) => ({
      platform: a.platform, account: a.name,
      start: a.snapshots[0]?.followers ?? null, end: a.snapshots.at(-1)?.followers ?? null,
      series: a.snapshots.map((s) => ({ date: s.date.toISOString().slice(0, 10), followers: s.followers })),
    })),
  };
}
export type WorkspaceReport = Awaited<ReturnType<typeof workspaceReport>>;
