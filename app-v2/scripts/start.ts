/** Producción: aplica migraciones, carga la demo si DEMO_SEED=1 y arranca la web y el worker juntos. */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const bin = (p: string) => path.join(ROOT, "node_modules", ...p.split("/"));
const node = (script: string, args: string[]) => spawnSync(process.execPath, [script, ...args], { stdio: "inherit", env: process.env });

if (node(bin("prisma/build/index.js"), ["migrate", "deploy"]).status !== 0) process.exit(1);
if (process.env.DEMO_SEED === "1") node(bin("tsx/dist/cli.mjs"), ["prisma/seed.ts"]);

const port = process.env.PORT ?? "3000";
const web = spawn(process.execPath, [bin("next/dist/bin/next"), "start", "-p", port], { stdio: "inherit" });
const worker = spawn(process.execPath, [bin("tsx/dist/cli.mjs"), "src/worker/index.ts"], { stdio: "inherit" });

for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => { web.kill(sig); worker.kill(sig); });
web.on("exit", (code) => { worker.kill(); process.exit(code ?? 0); });
worker.on("exit", (code) => console.error(`[start] El worker terminó (código ${code}).`));
