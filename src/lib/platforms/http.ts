import { PlatformError } from "./types";

export async function http<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: any = text;
  try { body = text ? JSON.parse(text) : {}; } catch { /* non-JSON */ }
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.error?.description ?? body?.message ?? text.slice(0, 300);
    throw new PlatformError(`${res.status} ${msg}`, res.status, res.status === 429 || res.status >= 500);
  }
  // TikTok returns 200 with error.code != "ok"
  if (body?.error?.code && body.error.code !== "ok") {
    throw new PlatformError(`${body.error.code}: ${body.error.message}`, res.status);
  }
  return body as T;
}

export const form = (o: Record<string, string>) => new URLSearchParams(o);
export const qs = (o: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
