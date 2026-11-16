/**
 * Worker en segundo plano: `npm run worker`
 * - Cada 30 s publica las publicaciones programadas que ya tocan.
 * - Cada 15 min actualiza las métricas de publicaciones y cuentas.
 */
import { syncMetrics } from "../lib/metrics";
import { publishDuePosts, recoverStuckPosts } from "../lib/publisher";
import { db } from "../lib/db";

const PUBLISH_EVERY = 30_000;
const METRICS_EVERY = 15 * 60_000;

let running = true;
const log = (msg: string) => console.log(`[worker ${new Date().toISOString()}] ${msg}`);

async function loop(name: string, everyMs: number, fn: () => Promise<unknown>) {
  while (running) {
    try {
      await fn();
    } catch (e) {
      console.error(`[worker] ${name} falló:`, e);
    }
    await new Promise((r) => setTimeout(r, everyMs));
  }
}

async function main() {
  log(`Iniciado (PLATFORM_MODE=${process.env.PLATFORM_MODE ?? "mock"})`);
  const stop = async () => {
    running = false;
    await db.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await Promise.all([
    loop("publicación", PUBLISH_EVERY, async () => {
      await recoverStuckPosts();
      const n = await publishDuePosts();
      if (n) log(`Publicaciones procesadas: ${n}`);
    }),
    loop("métricas", METRICS_EVERY, async () => {
      const r = await syncMetrics();
      log(`Métricas actualizadas: ${r.posts} publicaciones, ${r.accounts} cuentas`);
    }),
  ]);
}

main();
