import type { Platform } from "@prisma/client";
import { db } from "./db";
import { PLATFORM_ORDER } from "./platforms";

const DAY = 86_400_000;

function utcDay(offsetDays = 0) {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + offsetDays * DAY);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export type FollowerPoint = { date: string } & Partial<Record<Platform, number>>;

export async function getDashboard(workspaceId: string, days: number) {
  const start = utcDay(-(days - 1));
  const prevStart = new Date(start.getTime() - days * DAY);

  const accounts = await db.socialAccount.findMany({
    where: { workspaceId, disconnectedAt: null },
    orderBy: { connectedAt: "asc" },
  });
  const accountIds = accounts.map((a) => a.id);
  const platformOf = new Map(accounts.map((a) => [a.id, a.platform]));
  const platforms = PLATFORM_ORDER.filter((p) => accounts.some((a) => a.platform === p));

  const metrics = await db.accountMetric.findMany({
    where: { accountId: { in: accountIds }, date: { gte: prevStart } },
    orderBy: { date: "asc" },
  });

  // Seguidores por día y red (suma de cuentas de la misma red).
  const byDate = new Map<string, FollowerPoint>();
  for (let t = start.getTime(); t <= utcDay().getTime(); t += DAY) byDate.set(iso(new Date(t)), { date: iso(new Date(t)) });
  const lastFollowers = new Map<string, number>(); // por cuenta, último valor conocido
  const followersAt = (date: Date) => {
    let total = 0;
    for (const id of accountIds) {
      const m = metrics.filter((x) => x.accountId === id && x.date <= date).at(-1);
      total += m?.followers ?? 0;
    }
    return total;
  };

  let impressions = 0, engagements = 0, prevImpressions = 0, prevEngagements = 0;
  const perPlatform = new Map<Platform, { impressions: number; engagements: number; followers: number }>();
  for (const p of platforms) perPlatform.set(p, { impressions: 0, engagements: 0, followers: 0 });

  for (const m of metrics) {
    const platform = platformOf.get(m.accountId)!;
    if (m.date < start) {
      prevImpressions += m.impressions;
      prevEngagements += m.engagements;
      continue;
    }
    impressions += m.impressions;
    engagements += m.engagements;
    const pp = perPlatform.get(platform)!;
    pp.impressions += m.impressions;
    pp.engagements += m.engagements;
    lastFollowers.set(m.accountId, m.followers);
    const point = byDate.get(iso(m.date));
    if (point) point[platform] = (point[platform] ?? 0) + m.followers;
  }
  for (const [id, f] of lastFollowers) perPlatform.get(platformOf.get(id)!)!.followers += f;

  const followersNow = [...lastFollowers.values()].reduce((a, b) => a + b, 0);
  const followersBefore = followersAt(new Date(start.getTime() - DAY));

  const published = await db.postTarget.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: start }, account: { workspaceId } },
    include: { post: { select: { id: true, content: true } }, account: { select: { platform: true, handle: true } } },
  });
  const prevPublishedCount = await db.postTarget.count({
    where: { status: "PUBLISHED", publishedAt: { gte: prevStart, lt: start }, account: { workspaceId } },
  });

  const topPosts = published
    .map((t) => ({ ...t, interactions: t.likes + t.comments + t.shares }))
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, 5);

  // Quita días sin datos al final (p. ej. hoy antes de la primera sincronización).
  const series = [...byDate.values()];
  while (series.length > 1 && platforms.every((p) => series.at(-1)![p] === undefined)) series.pop();

  return {
    accounts,
    platforms,
    series,
    kpis: {
      followers: followersNow,
      followersDelta: followersNow - followersBefore,
      impressions,
      impressionsPrev: prevImpressions,
      engagements,
      engagementsPrev: prevEngagements,
      engagementRate: impressions ? engagements / impressions : 0,
      engagementRatePrev: prevImpressions ? prevEngagements / prevImpressions : 0,
      posts: published.length,
      postsPrev: prevPublishedCount,
    },
    perPlatform: platforms.map((p) => ({ platform: p, ...perPlatform.get(p)! })),
    topPosts,
  };
}
