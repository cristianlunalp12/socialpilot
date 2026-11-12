import type { Platform } from "@prisma/client";
import type { ProviderAdapter, Provider, MetricValues } from "./types";

// Deterministic pseudo-random from a string, so metrics grow consistently between syncs.
function seeded(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 10000) / 10000;
}

const SAMPLE_COMMENTS = [
  "¡Me encanta este contenido! 🔥", "¿Dónde puedo comprarlo?", "No me llegó mi pedido, llevo 2 semanas esperando 😡",
  "Muy útil, gracias por compartir", "El precio es demasiado alto", "¿Tienen envíos a Colombia?",
  "Esto es justo lo que necesitaba", "La calidad bajó mucho últimamente", "Hagan más videos así 👏",
  "¿Cuál es la canción del video?", "Atención al cliente nunca responde", "Excelente explicación, muy clara",
];

const MOCK_ACCOUNTS: Record<Provider, { platform: Platform; name: string }[]> = {
  meta: [{ platform: "FACEBOOK", name: "Mi Marca (Página)" }, { platform: "INSTAGRAM", name: "@mimarca" }],
  tiktok: [{ platform: "TIKTOK", name: "@mimarca.tt" }],
  youtube: [{ platform: "YOUTUBE", name: "Mi Marca TV" }],
};

export function mockAdapter(provider: Provider): ProviderAdapter {
  return {
    provider,
    authUrl: (state, redirectUri) => `${redirectUri}?code=mock-code&state=${encodeURIComponent(state)}`,
    async handleCallback() {
      return MOCK_ACCOUNTS[provider].map((a) => ({
        platform: a.platform, externalId: `mock-${a.platform.toLowerCase()}`, name: a.name,
        accessToken: "mock-token", refreshToken: "mock-refresh",
      }));
    },
    async refresh(a) { return { accessToken: a.accessToken, refreshToken: a.refreshToken }; },
    async publish(a, input) {
      if (a.platform === "INSTAGRAM" && input.mediaType === "TEXT") throw new Error("Instagram requiere imagen o video");
      if ((a.platform === "TIKTOK" || a.platform === "YOUTUBE") && input.mediaType !== "VIDEO") throw new Error(`${a.platform} requiere video`);
      const id = `${a.platform.toLowerCase()}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      return { externalId: id, permalink: `https://example.com/${id}` };
    },
    async fetchMetrics(a, id) {
      const r = seeded(id);
      const ageH = Math.min(72, (Date.now() - parseInt(id.split("_")[1]?.slice(0, 8) ?? "0", 36)) / 36e5 || 1);
      const growth = Math.log2(2 + ageH);
      const base = { FACEBOOK: 800, INSTAGRAM: 1500, TIKTOK: 4000, YOUTUBE: 1200 }[a.platform] * (0.4 + r() * 1.6);
      const views = Math.round(base * growth);
      const m: MetricValues = {
        views, impressions: Math.round(views * 1.25), reach: Math.round(views * 0.8),
        likes: Math.round(views * (0.03 + r() * 0.07)), comments: Math.round(views * (0.002 + r() * 0.01)),
        shares: Math.round(views * (0.002 + r() * 0.015)), saves: Math.round(views * r() * 0.02),
        watchTimeSec: a.platform === "YOUTUBE" || a.platform === "TIKTOK" ? Math.round(views * (8 + r() * 40)) : 0,
      };
      return m;
    },
    async fetchComments(a, id) {
      if (a.platform === "TIKTOK") return [];
      const r = seeded(id + "c");
      const n = 2 + Math.floor(r() * 6);
      return Array.from({ length: n }, (_, i) => ({
        externalId: `${id}_c${i}`, authorName: `usuario${Math.floor(r() * 900 + 100)}`,
        text: SAMPLE_COMMENTS[Math.floor(r() * SAMPLE_COMMENTS.length)],
        postedAt: new Date(Date.now() - Math.floor(r() * 48) * 36e5),
      }));
    },
    async fetchAccountStats(a) {
      const r = seeded(a.externalId + new Date().toISOString().slice(0, 10));
      const base = { FACEBOOK: 12000, INSTAGRAM: 25000, TIKTOK: 40000, YOUTUBE: 8000 }[a.platform];
      const days = Math.floor(Date.now() / 864e5) % 1000;
      return { followers: base + days * 15 + Math.floor(r() * 50), reach: Math.floor(base * (0.5 + r())) };
    },
  };
}
