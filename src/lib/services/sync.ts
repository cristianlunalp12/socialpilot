import { startOfDay, subDays } from "date-fns";
import { analyzeComments } from "../ai";
import { workspaceReport } from "../analytics";
import { generateRecommendations } from "../ai";
import { db } from "../db";
import { env } from "../env";
import { accountCtx, adapterFor } from "../platforms";

/** Pull metrics + comments for targets published in the last `days` days. Returns ids of new comments. */
export async function syncMetrics(opts: { workspaceId?: string; days?: number } = {}) {
  const targets = await db.postTarget.findMany({
    where: {
      status: "PUBLISHED", externalId: { not: null },
      publishedAt: { gte: subDays(new Date(), opts.days ?? 30) },
      ...(opts.workspaceId ? { post: { workspaceId: opts.workspaceId } } : {}),
    },
    include: { account: true },
  });
  const newComments: string[] = [];
  for (const t of targets) {
    try {
      const ctx = await accountCtx(t.account);
      const adapter = adapterFor(t.account.platform);
      const m = await adapter.fetchMetrics(ctx, t.externalId!);
      await db.postMetric.create({ data: { targetId: t.id, ...m } });
      for (const c of await adapter.fetchComments(ctx, t.externalId!)) {
        const existing = await db.comment.findUnique({ where: { targetId_externalId: { targetId: t.id, externalId: c.externalId } } });
        if (existing) continue;
        const row = await db.comment.create({ data: { targetId: t.id, ...c } });
        newComments.push(row.id);
      }
    } catch (e) {
      console.error(`[sync] target ${t.id}`, e);
    }
  }
  return newComments;
}

export async function syncAccountStats() {
  const accounts = await db.socialAccount.findMany({ where: { status: "active" } });
  const date = startOfDay(new Date());
  for (const a of accounts) {
    try {
      const s = await adapterFor(a.platform).fetchAccountStats(await accountCtx(a));
      await db.accountSnapshot.upsert({
        where: { accountId_date: { accountId: a.id, date } },
        create: { accountId: a.id, date, followers: s.followers, reach: s.reach },
        update: { followers: s.followers, reach: s.reach },
      });
    } catch (e) {
      console.error(`[stats] account ${a.id}`, e);
    }
  }
}

/** Classifies unanalyzed comments with Claude in batches of 50. */
export async function analyzePendingComments(limit = 200) {
  if (!env.aiEnabled) return 0;
  const pending = await db.comment.findMany({ where: { analyzedAt: null }, take: limit, orderBy: { postedAt: "desc" } });
  let done = 0;
  for (let i = 0; i < pending.length; i += 50) {
    const batch = pending.slice(i, i + 50);
    const results = await analyzeComments(batch.map((c) => ({ id: c.id, text: c.text })));
    for (const r of results) {
      await db.comment.update({
        where: { id: r.id },
        data: { sentiment: r.sentiment, topics: r.topics.map((t) => t.toLowerCase()), needsReply: r.needsReply, analyzedAt: new Date() },
      });
      done++;
    }
  }
  return done;
}

export async function buildRecommendations(workspaceId: string) {
  const ws = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const report = await workspaceReport(workspaceId, 30);
  if (report.totals.posts === 0) return null;
  // Charts-only data is dropped to keep the prompt focused.
  const { followers, ...rest } = report;
  const payload = await generateRecommendations(
    { ...rest, followers: followers.map(({ series: _s, ...f }) => f) },
    ws.brandVoice,
  );
  return db.recommendation.create({ data: { workspaceId, summary: payload.summary, payload } });
}
