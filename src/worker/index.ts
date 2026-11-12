/**
 * Background worker (run separately from Next.js): `npm run worker`
 * Uses pg-boss on the same Postgres DB, so there's no Redis dependency.
 */
import { db } from "../lib/db";
import { JOBS, enqueue, getBoss } from "../lib/queue";
import { claimDuePosts, publishPost } from "../lib/services/publish";
import { analyzePendingComments, buildRecommendations, syncAccountStats, syncMetrics } from "../lib/services/sync";

async function main() {
  const boss = await getBoss();

  // Schedules (cron, UTC)
  await boss.schedule(JOBS.dispatchScheduled, "* * * * *");
  await boss.schedule(JOBS.syncMetrics, "0 */2 * * *");
  await boss.schedule(JOBS.syncAccountStats, "15 6 * * *");
  await boss.schedule(JOBS.recommendations, "0 7 * * 1");

  await boss.work(JOBS.dispatchScheduled, async () => {
    for (const id of await claimDuePosts()) await enqueue(JOBS.publishPost, { postId: id }, { singletonKey: id });
  });

  await boss.work<{ postId: string }>(JOBS.publishPost, { batchSize: 1 }, async ([job]) => {
    const status = await publishPost(job.data.postId);
    console.log(`[publish] ${job.data.postId} → ${status}`);
  });

  await boss.work<{ workspaceId?: string }>(JOBS.syncMetrics, async ([job]) => {
    const created = await syncMetrics({ workspaceId: job?.data?.workspaceId });
    console.log(`[sync] ${created.length} new comments`);
    if (created.length) await enqueue(JOBS.analyzeComments, {});
  });

  await boss.work(JOBS.syncAccountStats, async () => { await syncAccountStats(); });

  await boss.work(JOBS.analyzeComments, async () => {
    console.log(`[ai] analyzed ${await analyzePendingComments()} comments`);
  });

  await boss.work<{ workspaceId?: string }>(JOBS.recommendations, async ([job]) => {
    const ids = job?.data?.workspaceId ? [job.data.workspaceId] : (await db.workspace.findMany({ select: { id: true } })).map((w) => w.id);
    for (const id of ids) {
      try { await buildRecommendations(id); } catch (e) { console.error(`[ai] recommendations ${id}`, e); }
    }
  });

  console.log("SocialPilot worker running");
  const stop = async () => { await boss.stop({ graceful: true }); await db.$disconnect(); process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => { console.error(e); process.exit(1); });
