/**
 * One-command local demo: `npm run demo`
 *
 * - Starts an embedded PostgreSQL (no Docker / no install needed), data in ./.demo/pg
 * - Generates stable secrets in ./.demo/secrets.json
 * - Applies migrations and loads demo data
 * - Runs the web app + background worker in simulated platform mode
 * - Opens the browser
 *
 * Ctrl+C stops everything. Delete the ./.demo folder to start from scratch.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const ROOT = process.cwd();
const DEMO = path.join(ROOT, ".demo");
const PG_DIR = path.join(DEMO, "pg");
const SECRETS = path.join(DEMO, "secrets.json");
const PG_PORT = 54339;

const bin = {
  next: path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
  prisma: path.join(ROOT, "node_modules", "prisma", "build", "index.js"),
  tsx: path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
};

const log = (msg: string) => console.log(`\x1b[36m[demo]\x1b[0m ${msg}`);
const children: ChildProcess[] = [];
let pgInstance: EmbeddedPostgres | null = null;

function freePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(freePort(start + 1)));
    srv.once("listening", () => srv.close(() => resolve(start)));
    srv.listen(start);
  });
}

function run(script: string, args: string[], env: NodeJS.ProcessEnv, name: string, wait = true): Promise<void> {
  const child = spawn(process.execPath, [script, ...args], { cwd: ROOT, env, stdio: wait ? "inherit" : ["ignore", "pipe", "pipe"] });
  if (!wait) {
    children.push(child);
    const prefix = (d: Buffer) => d.toString().split("\n").filter(Boolean).forEach((l) => console.log(`\x1b[90m[${name}]\x1b[0m ${l}`));
    child.stdout?.on("data", prefix);
    child.stderr?.on("data", prefix);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${name} terminó con código ${code}`)))));
}

/**
 * Creates the app database as UTF-8 (template0 lets it differ from the cluster default).
 * A database left by an earlier run with another encoding only holds demo data, so it is recreated.
 */
async function ensureUtf8Database(pg: EmbeddedPostgres, name: string) {
  const client = pg.getPgClient("postgres", "localhost");
  await client.connect();
  try {
    const { rows } = await client.query("SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = $1", [name]);
    if (rows[0]?.enc === "UTF8") return;
    if (rows[0]) {
      log(`La base de datos de demo usa ${rows[0].enc}; se recrea en UTF-8...`);
      await client.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    }
    await client.query(`CREATE DATABASE "${name}" ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`);
  } finally {
    await client.end();
  }
}

async function waitFor(url: string, timeoutMs = 180_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try { if ((await fetch(url)).status < 500) return true; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

function openBrowser(url: string) {
  const cmd = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try { spawn(cmd[0] as string, cmd[1] as string[], { stdio: "ignore", detached: true }).on("error", () => {}).unref(); } catch { /* ignore */ }
}

async function main() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 20) throw new Error(`Necesitas Node.js 20 o superior (tienes ${process.version}). Descárgalo en https://nodejs.org`);
  mkdirSync(DEMO, { recursive: true });

  // Stable secrets (the encryption key must not change between runs).
  if (!existsSync(SECRETS)) {
    writeFileSync(SECRETS, JSON.stringify({ AUTH_SECRET: randomBytes(32).toString("base64") }, null, 2));
  }
  const secrets = JSON.parse(readFileSync(SECRETS, "utf8"));
  // Optional .env; demo values below take precedence over it.
  if (existsSync(path.join(ROOT, ".env"))) {
    try { process.loadEnvFile(path.join(ROOT, ".env")); } catch { /* ignore malformed .env */ }
  }

  log("Iniciando base de datos integrada...");
  const pg = new EmbeddedPostgres({
    databaseDir: PG_DIR, port: PG_PORT, user: "postgres", password: "postgres", persistent: true,
    // Postgres refuses to run as root (e.g. in containers); the package creates a dedicated user then.
    createPostgresUser: typeof process.getuid === "function" && process.getuid() === 0,
    // Force UTF-8: on Windows initdb otherwise uses the system code page (e.g. WIN1252),
    // which cannot store emojis or many non-Latin characters.
    initdbFlags: ["--encoding=UTF8", "--no-locale"],
    onLog: () => {},
  });
  pgInstance = pg;
  if (!existsSync(path.join(PG_DIR, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  await ensureUtf8Database(pg, "socialpilot_v2");

  const port = await freePort(3000);
  const url = `http://localhost:${port}`;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/socialpilot_v2`,
    APP_URL: url,
    PLATFORM_MODE: "mock",
    AUTH_SECRET: secrets.AUTH_SECRET,
    NEXT_TELEMETRY_DISABLED: "1",
  };

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    log("Deteniendo...");
    for (const c of children) c.kill("SIGTERM");
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  log("Preparando tablas y datos de demo...");
  await run(bin.prisma, ["migrate", "deploy"], env, "prisma");
  await run(bin.tsx, ["prisma/seed.ts"], env, "seed");

  log("Arrancando la aplicación y el worker...");
  await run(bin.next, ["dev", "-p", String(port)], env, "web", false);
  await run(bin.tsx, ["src/worker/index.ts"], env, "worker", false);

  log("Compilando la primera página (puede tardar ~30 s la primera vez)...");
  if (await waitFor(`${url}/login`)) {
    console.log(`
\x1b[32m  ✔ SocialPilot v2 está listo:  ${url}\x1b[0m

    Usuario:     demo@socialpilot.dev
    Contraseña:  demo12345

    Las redes sociales están simuladas (no se publica nada real).
    Pulsa Ctrl+C para detener.
`);
    openBrowser(url);
  } else {
    log(`La app no respondió a tiempo. Revisa los mensajes de arriba e intenta abrir ${url}`);
  }
}

main().catch(async (e) => {
  console.error("\n\x1b[31m[demo] Error:\x1b[0m", e instanceof Error ? e.message : e);
  console.error("Si necesitas ayuda, copia también los mensajes que aparecen más arriba.");
  for (const c of children) c.kill("SIGTERM");
  // Stop Postgres too, otherwise it keeps running in the background and blocks the next start.
  await pgInstance?.stop().catch(() => {});
  process.exit(1);
});
