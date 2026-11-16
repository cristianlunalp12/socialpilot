export function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "workspace";
}

export const fmt = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export const PLATFORM_LABEL = {
  FACEBOOK: "Facebook", INSTAGRAM: "Instagram", TIKTOK: "TikTok", YOUTUBE: "YouTube",
} as const;

export const PLATFORM_COLOR = {
  FACEBOOK: "#1877F2", INSTAGRAM: "#C13584", TIKTOK: "#25F4EE", YOUTUBE: "#FF0000",
} as const;
