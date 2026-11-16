import type { PostStatus } from "@prisma/client";
import { db } from "./db";
import { getAdapter } from "./platforms";

export const MAX_ATTEMPTS = 3;

/**
 * Publica una Post en todas sus cuentas pendientes.
 * Toma la Post de forma atómica (SCHEDULED -> PUBLISHING) para que dos procesos no la publiquen a la vez.
 * Si alguna cuenta falla y quedan intentos, la reprograma con espera creciente (2, 4 min...).
 */
export async function publishPost(postId: string) {
  const claimed = await db.post.updateMany({
    where: { id: postId, status: "SCHEDULED" },
    data: { status: "PUBLISHING" },
  });
  if (claimed.count === 0) return;

  const post = await db.post.findUniqueOrThrow({
    where: { id: postId },
    include: { targets: { include: { account: true } } },
  });

  for (const t of post.targets) {
    if (t.status !== "PENDING") continue;
    if (t.account.disconnectedAt) {
      await db.postTarget.update({ where: { id: t.id }, data: { status: "FAILED", error: "La cuenta está desconectada" } });
      continue;
    }
    try {
      const r = await getAdapter(t.account.platform).publish(t.account, post);
      await db.postTarget.update({
        where: { id: t.id },
        data: { status: "PUBLISHED", externalId: r.externalId, url: r.url, publishedAt: new Date(), error: null, attempts: { increment: 1 } },
      });
    } catch (e) {
      const attempts = t.attempts + 1;
      await db.postTarget.update({
        where: { id: t.id },
        data: { attempts, error: e instanceof Error ? e.message : String(e), status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING" },
      });
    }
  }

  const targets = await db.postTarget.findMany({ where: { postId } });
  const pending = targets.filter((t) => t.status === "PENDING");
  const ok = targets.filter((t) => t.status === "PUBLISHED").length;

  if (pending.length > 0) {
    const maxAttempts = Math.max(...pending.map((t) => t.attempts));
    await db.post.update({
      where: { id: postId },
      data: { status: "SCHEDULED", scheduledAt: new Date(Date.now() + 2 ** maxAttempts * 60_000) },
    });
    return;
  }
  const status: PostStatus = ok === targets.length ? "PUBLISHED" : ok > 0 ? "PARTIAL" : "FAILED";
  await db.post.update({ where: { id: postId }, data: { status, publishedAt: ok > 0 ? new Date() : null } });
}

/** Publica todo lo que ya tocaba. Lo llama el worker cada 30 s. */
export async function publishDuePosts() {
  const due = await db.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    select: { id: true },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
  for (const p of due) {
    try {
      await publishPost(p.id);
    } catch (e) {
      console.error(`[publisher] Error con la publicación ${p.id}:`, e);
      await db.post.updateMany({ where: { id: p.id, status: "PUBLISHING" }, data: { status: "SCHEDULED" } });
    }
  }
  return due.length;
}

/** Recupera publicaciones que se quedaron en PUBLISHING (p. ej. el proceso se cayó a mitad). */
export async function recoverStuckPosts() {
  await db.post.updateMany({
    where: { status: "PUBLISHING", updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
    data: { status: "SCHEDULED" },
  });
}
