import { db } from "./db";
import { getAdapter } from "./platforms";

function todayUtc() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Actualiza métricas de las publicaciones de los últimos 30 días y la fila diaria de cada cuenta. */
export async function syncMetrics() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const targets = await db.postTarget.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: since }, externalId: { not: null }, account: { disconnectedAt: null } },
    include: { account: true },
  });
  for (const t of targets) {
    try {
      const s = await getAdapter(t.account.platform).postStats(t.account, t.externalId!, t.publishedAt!);
      await db.postTarget.update({ where: { id: t.id }, data: { ...s, metricsAt: new Date() } });
    } catch (e) {
      console.error(`[metrics] Publicación ${t.id}:`, e instanceof Error ? e.message : e);
    }
  }

  const accounts = await db.socialAccount.findMany({ where: { disconnectedAt: null } });
  const date = todayUtc();
  for (const a of accounts) {
    try {
      const last = await db.accountMetric.findFirst({ where: { accountId: a.id, date: { lt: date } }, orderBy: { date: "desc" } });
      const s = await getAdapter(a.platform).accountStats(a, last?.followers ?? 0);
      await db.accountMetric.upsert({
        where: { accountId_date: { accountId: a.id, date } },
        create: { accountId: a.id, date, ...s },
        update: s,
      });
    } catch (e) {
      console.error(`[metrics] Cuenta ${a.id}:`, e instanceof Error ? e.message : e);
    }
  }
  return { posts: targets.length, accounts: accounts.length };
}
