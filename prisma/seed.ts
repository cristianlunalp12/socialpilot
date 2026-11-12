/**
 * Demo data: user demo@socialpilot.dev / demo12345, one workspace, 4 mock accounts,
 * ~40 published posts over 30 days with metrics, comments and follower snapshots.
 */
import { PrismaClient, type Platform } from "@prisma/client";
import bcrypt from "bcryptjs";
import { startOfDay, subDays, subHours } from "date-fns";
import { encrypt } from "../src/lib/crypto";
import { mockAdapter } from "../src/lib/platforms/mock";

const db = new PrismaClient();

const CAPTIONS = [
  "☕ Nuevo blend Cusco: chocolate y frutos rojos. ¿Ya lo probaste?",
  "Detrás de cámaras: así tostamos cada lote 🔥",
  "3 errores que arruinan tu café en casa (y cómo evitarlos)",
  "15% OFF este fin de semana con el código CAFE15",
  "Conoce a Rosa, productora en Villa Rica 🌱",
  "Tutorial: V60 en 4 minutos",
  "¿Espresso o filtrado? Cuéntanos en comentarios 👇",
  "Nuestra nueva tienda en Miraflores abre el sábado",
];

async function main() {
  const user = await db.user.upsert({
    where: { email: "demo@socialpilot.dev" }, update: {},
    create: { email: "demo@socialpilot.dev", name: "Demo User", passwordHash: await bcrypt.hash("demo12345", 10) },
  });
  const ws = await db.workspace.upsert({
    where: { slug: "cafe-demo" }, update: {},
    create: {
      name: "Café Andino (demo)", slug: "cafe-demo",
      brandVoice: "Café de especialidad peruano. Tono cálido, cercano y experto; tuteo. Audiencia 25–40, urbana, interesada en origen y sostenibilidad.",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const accounts = [];
  for (const [platform, name] of [["FACEBOOK", "Café Andino"], ["INSTAGRAM", "@cafeandino"], ["TIKTOK", "@cafeandino.tt"], ["YOUTUBE", "Café Andino TV"]] as [Platform, string][]) {
    accounts.push(await db.socialAccount.upsert({
      where: { workspaceId_platform_externalId: { workspaceId: ws.id, platform, externalId: `mock-${platform.toLowerCase()}` } },
      update: {},
      create: { workspaceId: ws.id, platform, externalId: `mock-${platform.toLowerCase()}`, name, accessToken: encrypt("mock-token"), refreshToken: encrypt("mock-refresh") },
    }));
  }

  if (await db.post.count({ where: { workspaceId: ws.id } })) return console.log("Seed already applied");

  for (let i = 0; i < 40; i++) {
    const publishedAt = subHours(subDays(new Date(), Math.floor(i * 0.75)), Math.floor(Math.random() * 12));
    const acc = accounts[i % accounts.length];
    const media = acc.platform === "TIKTOK" || acc.platform === "YOUTUBE" ? "VIDEO" : i % 3 ? "IMAGE" : "TEXT";
    const mediaType = acc.platform === "INSTAGRAM" && media === "TEXT" ? "IMAGE" : media;
    const caption = CAPTIONS[i % CAPTIONS.length];
    const extId = `${acc.platform.toLowerCase()}_${publishedAt.getTime().toString(36)}${i}`;
    const adapter = mockAdapter(acc.platform === "TIKTOK" ? "tiktok" : acc.platform === "YOUTUBE" ? "youtube" : "meta");
    const ctx = { platform: acc.platform, externalId: acc.externalId, accessToken: "mock" };
    const m = await adapter.fetchMetrics(ctx, extId);
    const comments = await adapter.fetchComments(ctx, extId);
    await db.post.create({
      data: {
        workspaceId: ws.id, authorId: user.id, baseCaption: caption, mediaType, status: "PUBLISHED",
        mediaUrl: mediaType === "TEXT" ? null : "https://picsum.photos/1080",
        scheduledAt: publishedAt, createdAt: publishedAt,
        targets: { create: { accountId: acc.id, caption, status: "PUBLISHED", externalId: extId, permalink: `https://example.com/${extId}`, publishedAt,
          metrics: { create: m },
          comments: { create: comments.map((c) => ({ ...c, postedAt: new Date(Math.max(+publishedAt, +c.postedAt)) })) } } },
      },
    });
  }

  for (const a of accounts) {
    for (let d = 30; d >= 0; d--) {
      const base = { FACEBOOK: 12000, INSTAGRAM: 25000, TIKTOK: 40000, YOUTUBE: 8000 }[a.platform];
      await db.accountSnapshot.create({ data: { accountId: a.id, date: startOfDay(subDays(new Date(), d)), followers: Math.round(base * (1 + (30 - d) * 0.004 + Math.random() * 0.002)) } });
    }
  }
  console.log("Seeded: demo@socialpilot.dev / demo12345");
}

main().finally(() => db.$disconnect());
