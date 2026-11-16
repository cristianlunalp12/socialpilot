/**
 * Datos de demo: usuario demo@socialpilot.dev / demo12345 con un workspace, 4 redes,
 * 90 días de métricas, publicaciones publicadas, programadas y borradores.
 * Se puede ejecutar varias veces: borra y vuelve a crear los datos de demo.
 */
import { PrismaClient, type Platform } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DAY = 86_400_000;
const EMAIL = "demo@socialpilot.dev";

let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const between = (a: number, b: number) => Math.round(a + rand() * (b - a));

const ACCOUNTS: { platform: Platform; handle: string; displayName: string; followers: number; growth: number }[] = [
  { platform: "FACEBOOK", handle: "cafeaurora", displayName: "Café Aurora", followers: 12400, growth: 0.0008 },
  { platform: "INSTAGRAM", handle: "cafe.aurora", displayName: "Café Aurora", followers: 8300, growth: 0.0035 },
  { platform: "TIKTOK", handle: "cafeaurora", displayName: "Café Aurora", followers: 3100, growth: 0.009 },
  { platform: "YOUTUBE", handle: "CafeAuroraTV", displayName: "Café Aurora TV", followers: 1450, growth: 0.002 },
];

const IDEAS = [
  "☕ Nuevo blend de temporada: notas de cacao y naranja. ¡Ven a probarlo!",
  "Detrás de cámaras: así tostamos nuestro café cada mañana 🔥",
  "Tip del barista: la temperatura ideal del agua está entre 90 y 96 °C.",
  "¿Latte o capuchino? Cuéntanos en comentarios 👇",
  "Hoy celebramos 5 años con 2x1 en bebidas calientes 🎉",
  "Conoce a Lucía, nuestra barista campeona regional 🏆",
  "Receta rápida: cold brew en casa en 3 pasos.",
  "Música en vivo este viernes desde las 19:00 🎶",
  "Nuestro pan de plátano vuelve al menú 🍌",
  "Cómo elegir el molido correcto para tu cafetera.",
  "Mañanas lluviosas = chocolate caliente ☔",
  "Taller de latte art el próximo sábado. Cupos limitados.",
];

const iso = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

async function main() {
  const old = await db.user.findUnique({ where: { email: EMAIL }, include: { memberships: true } });
  if (old) {
    await db.workspace.deleteMany({ where: { id: { in: old.memberships.map((m) => m.workspaceId) } } });
    await db.user.delete({ where: { id: old.id } });
  }

  const user = await db.user.create({
    data: { email: EMAIL, name: "Demo", passwordHash: await bcrypt.hash("demo12345", 10) },
  });
  const ws = await db.workspace.create({
    data: { name: "Café Aurora", memberships: { create: { userId: user.id, role: "OWNER" } } },
  });

  const today = iso(new Date());
  const accounts = [];
  for (const a of ACCOUNTS) {
    const account = await db.socialAccount.create({
      data: {
        workspaceId: ws.id, platform: a.platform, handle: a.handle, displayName: a.displayName,
        externalId: `demo_${a.platform.toLowerCase()}`, connectedAt: new Date(today.getTime() - 120 * DAY),
      },
    });
    accounts.push(account);
    let followers = a.followers;
    const rows = [];
    for (let i = 89; i >= 0; i--) {
      followers += Math.round(followers * (a.growth + (rand() - 0.5) * a.growth));
      const impressions = Math.round(followers * (0.15 + rand() * 0.45));
      rows.push({ accountId: account.id, date: new Date(today.getTime() - i * DAY), followers, impressions, engagements: Math.round(impressions * (0.025 + rand() * 0.05)) });
    }
    await db.accountMetric.createMany({ data: rows });
  }

  // Publicadas en los últimos 60 días.
  for (let i = 0; i < 36; i++) {
    const publishedAt = new Date(Date.now() - between(1, 60 * 24) * 3_600_000);
    const targets = accounts.filter(() => rand() < 0.6);
    if (targets.length === 0) targets.push(accounts[i % accounts.length]);
    await db.post.create({
      data: {
        workspaceId: ws.id, authorId: user.id, content: IDEAS[i % IDEAS.length],
        status: "PUBLISHED", scheduledAt: publishedAt, publishedAt,
        targets: {
          create: targets.map((acc) => {
            const views = between(300, 9000);
            return {
              accountId: acc.id, status: "PUBLISHED" as const, attempts: 1, publishedAt,
              externalId: `demo_${acc.platform}_${i}`, url: `https://example.com/${acc.handle}/${i}`,
              views, likes: Math.round(views * (0.03 + rand() * 0.07)), comments: Math.round(views * rand() * 0.012),
              shares: Math.round(views * rand() * 0.008), metricsAt: new Date(),
            };
          }),
        },
      },
    });
  }

  // Un fallo parcial para ver cómo se muestra.
  await db.post.create({
    data: {
      workspaceId: ws.id, authorId: user.id, content: "Promo relámpago: 20 % en granos para llevar ⚡",
      status: "PARTIAL", scheduledAt: new Date(Date.now() - 2 * DAY), publishedAt: new Date(Date.now() - 2 * DAY),
      targets: {
        create: [
          { accountId: accounts[0].id, status: "PUBLISHED", attempts: 1, publishedAt: new Date(Date.now() - 2 * DAY), externalId: "demo_partial", views: 2100, likes: 96, comments: 12, shares: 7 },
          { accountId: accounts[2].id, status: "FAILED", attempts: 3, error: "El video no cumple el formato requerido (simulado)" },
        ],
      },
    },
  });

  // Programadas para los próximos 14 días.
  for (let i = 0; i < 8; i++) {
    const at = new Date(Date.now() + between(6, 14 * 24) * 3_600_000);
    at.setUTCMinutes(0, 0, 0);
    await db.post.create({
      data: {
        workspaceId: ws.id, authorId: user.id, content: IDEAS[(i + 5) % IDEAS.length], status: "SCHEDULED", scheduledAt: at,
        targets: { create: accounts.filter((_, k) => (k + i) % 2 === 0).map((acc) => ({ accountId: acc.id })) },
      },
    });
  }

  for (const content of ["Idea: encuesta sobre nuevos sabores para el menú de invierno", "Borrador: anuncio de la nueva sucursal"]) {
    await db.post.create({
      data: { workspaceId: ws.id, authorId: user.id, content, status: "DRAFT", targets: { create: [{ accountId: accounts[1].id }] } },
    });
  }

  console.log(`Datos de demo listos: ${EMAIL} / demo12345`);
}

main().finally(() => db.$disconnect());
