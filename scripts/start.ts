/**
 * Production entrypoint for single-service hosts (Render, Railway, Fly...): `npm run start:prod`
 * 1. applies pending migrations
 * 2. optionally loads demo data (DEMO_SEED=true)
 * 3. runs the web server and the background worker together
 * If either process dies, everything exits so the host restarts the service.
 */
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const node = (script: string, args: string[]) => spawn(process.execPath, [script, ...args], { cwd: ROOT, stdio: "inherit", env: process.env });
const bin = {
  next: path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
  prisma: path.join(ROOT, "node_modules", "prisma", "build", "index.js"),
  tsx: path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
};
const once = (c: ChildProcess) => new Promise<number>((r) => c.on("exit", (code) => r(code ?? 1)));

async function main() {
  if (await once(node(bin.prisma, ["migrate", "deploy"]))) throw new Error("prisma migrate deploy failed");
  if (process.env.DEMO_SEED === "true" && (await once(node(bin.tsx, ["prisma/seed.ts"])))) throw new Error("seed failed");

  const port = process.env.PORT || "3000";
  const procs = [node(bin.next, ["start", "-p", port, "-H", "0.0.0.0"]), node(bin.tsx, ["src/worker/index.ts"])];
  const shutdown = (code: number) => { procs.forEach((p) => p.kill("SIGTERM")); setTimeout(() => process.exit(code), 5000).unref(); };
  process.on("SIGTERM", () => shutdown(0));
  process.on("SIGINT", () => shutdown(0));
  const code = await Promise.race(procs.map(once));
  console.error(`[start] a process exited with code ${code}; stopping service`);
  shutdown(code || 1);
}

main().catch((e) => { console.error("[start]", e); process.exit(1); });
