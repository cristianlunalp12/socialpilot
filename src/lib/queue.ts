import PgBoss from "pg-boss";

export const JOBS = {
  dispatchScheduled: "dispatch-scheduled", // cron: find due posts
  publishPost: "publish-post",
  syncMetrics: "sync-metrics",             // cron: metrics + comments for recent posts
  syncAccountStats: "sync-account-stats",  // cron: daily followers snapshot
  analyzeComments: "analyze-comments",
  recommendations: "recommendations",      // cron: weekly AI insights per workspace
} as const;

const g = globalThis as unknown as { boss?: Promise<PgBoss> };

export function getBoss(): Promise<PgBoss> {
  g.boss ??= (async () => {
    const boss = new PgBoss(process.env.DATABASE_URL!);
    boss.on("error", (e) => console.error("[pg-boss]", e));
    await boss.start();
    for (const q of Object.values(JOBS)) await boss.createQueue(q);
    return boss;
  })();
  return g.boss;
}

export async function enqueue(name: (typeof JOBS)[keyof typeof JOBS], data: object, opts: { singletonKey?: string } = {}) {
  const boss = await getBoss();
  return boss.send(name, data, { retryLimit: 3, retryDelay: 60, retryBackoff: true, ...opts });
}
