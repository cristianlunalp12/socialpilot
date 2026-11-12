import { db } from "../db";
import { accountCtx, adapterFor } from "../platforms";

/** Publishes every pending target of a post. Idempotent: already-published targets are skipped. */
export async function publishPost(postId: string) {
  const post = await db.post.findUnique({ where: { id: postId }, include: { targets: { include: { account: true } } } });
  if (!post) return;
  await db.post.update({ where: { id: postId }, data: { status: "PUBLISHING" } });

  for (const t of post.targets) {
    if (t.status === "PUBLISHED") continue;
    await db.postTarget.update({ where: { id: t.id }, data: { status: "PUBLISHING", attempts: { increment: 1 } } });
    try {
      const ctx = await accountCtx(t.account);
      const res = await adapterFor(t.account.platform).publish(ctx, {
        caption: t.caption, title: post.title, mediaType: post.mediaType, mediaUrl: post.mediaUrl, tags: post.tags,
      });
      await db.postTarget.update({
        where: { id: t.id },
        data: { status: "PUBLISHED", externalId: res.externalId, permalink: res.permalink ?? null, error: null, publishedAt: new Date() },
      });
    } catch (e) {
      console.error(`[publish] target ${t.id} failed`, e);
      await db.postTarget.update({ where: { id: t.id }, data: { status: "FAILED", error: e instanceof Error ? e.message : String(e) } });
    }
  }

  const targets = await db.postTarget.findMany({ where: { postId } });
  const ok = targets.filter((t) => t.status === "PUBLISHED").length;
  const status = ok === targets.length ? "PUBLISHED" : ok === 0 ? "FAILED" : "PARTIAL";
  await db.post.update({ where: { id: postId }, data: { status } });
  return status;
}

/** Atomically claims due scheduled posts (so multiple workers never double-publish). */
export async function claimDuePosts(): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "Post" SET status = 'PUBLISHING', "updatedAt" = now()
    WHERE id IN (
      SELECT id FROM "Post" WHERE status = 'SCHEDULED' AND "scheduledAt" <= now()
      ORDER BY "scheduledAt" LIMIT 50 FOR UPDATE SKIP LOCKED
    ) RETURNING id`;
  return rows.map((r) => r.id);
}
