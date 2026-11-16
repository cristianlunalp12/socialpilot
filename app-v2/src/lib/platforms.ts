import type { Platform, Post, SocialAccount } from "@prisma/client";

/** Datos visibles de cada red. El color sigue a la red en todos los gráficos. */
export const PLATFORMS: Record<Platform, { label: string; color: string; maxLength: number }> = {
  FACEBOOK: { label: "Facebook", color: "#2a78d6", maxLength: 63206 },
  INSTAGRAM: { label: "Instagram", color: "#eb6834", maxLength: 2200 },
  TIKTOK: { label: "TikTok", color: "#1baf7a", maxLength: 2200 },
  YOUTUBE: { label: "YouTube", color: "#eda100", maxLength: 5000 },
};

export const PLATFORM_ORDER: Platform[] = ["FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE"];

export type PublishResult = { externalId: string; url: string };
export type PostStats = { likes: number; comments: number; shares: number; views: number };
export type AccountStats = { followers: number; impressions: number; engagements: number };

/** Lo que cada integración con una red debe implementar. */
export interface PlatformAdapter {
  publish(account: SocialAccount, post: Pick<Post, "id" | "content" | "mediaUrl">): Promise<PublishResult>;
  postStats(account: SocialAccount, externalId: string, publishedAt: Date): Promise<PostStats>;
  accountStats(account: SocialAccount, previousFollowers: number): Promise<AccountStats>;
}

// ---------- Simulación (PLATFORM_MODE=mock) ----------

function seeded(str: string) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

const mockAdapter: PlatformAdapter = {
  async publish(account, post) {
    // ~5 % de fallos simulados para ver los reintentos en acción.
    if (Math.random() < 0.05) throw new Error(`${PLATFORMS[account.platform].label} no respondió (simulado)`);
    const externalId = `${account.platform.toLowerCase()}_${post.id}_${Date.now().toString(36)}`;
    return { externalId, url: `https://example.com/${account.handle}/${externalId}` };
  },
  async postStats(account, externalId, publishedAt) {
    const hours = Math.max(1, (Date.now() - publishedAt.getTime()) / 3_600_000);
    const growth = Math.min(1, Math.log10(hours + 1) / 2); // crece rápido y luego se estabiliza
    const base = 400 + seeded(externalId) * 4000;
    const views = Math.round(base * growth);
    return {
      views,
      likes: Math.round(views * (0.04 + seeded(externalId + "l") * 0.06)),
      comments: Math.round(views * (0.004 + seeded(externalId + "c") * 0.01)),
      shares: Math.round(views * (0.002 + seeded(externalId + "s") * 0.008)),
    };
  },
  async accountStats(account, previousFollowers) {
    const start = previousFollowers || Math.round(500 + seeded(account.id) * 20000);
    const followers = start + Math.round(start * (Math.random() * 0.004 - 0.0005));
    const impressions = Math.round(followers * (0.2 + Math.random() * 0.5));
    return { followers, impressions, engagements: Math.round(impressions * (0.03 + Math.random() * 0.04)) };
  },
};

export function getAdapter(platform: Platform): PlatformAdapter {
  const mode = process.env.PLATFORM_MODE ?? "mock";
  if (mode === "mock") return mockAdapter;
  throw new Error(`La integración real con ${PLATFORMS[platform].label} todavía no está implementada. Usa PLATFORM_MODE=mock.`);
}
