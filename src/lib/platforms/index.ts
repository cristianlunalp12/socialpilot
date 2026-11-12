import type { Platform, SocialAccount } from "@prisma/client";
import { db } from "../db";
import { decrypt, encrypt } from "../crypto";
import { env } from "../env";
import { metaAdapter } from "./meta";
import { mockAdapter } from "./mock";
import { tiktokAdapter } from "./tiktok";
import { youtubeAdapter } from "./youtube";
import { type AccountCtx, PROVIDER_OF, type Provider, type ProviderAdapter } from "./types";

export * from "./types";

const LIVE: Record<Provider, ProviderAdapter> = { meta: metaAdapter, tiktok: tiktokAdapter, youtube: youtubeAdapter };

export function adapterFor(p: Provider | Platform): ProviderAdapter {
  const provider = (p in PROVIDER_OF ? PROVIDER_OF[p as Platform] : p) as Provider;
  return env.mockPlatforms ? mockAdapter(provider) : LIVE[provider];
}

export const redirectUriFor = (provider: Provider) => `${env.appUrl}/api/oauth/${provider}/callback`;

/** Decrypts tokens and refreshes them when they expire within 5 minutes. */
export async function accountCtx(acc: SocialAccount): Promise<AccountCtx> {
  let ctx: AccountCtx = {
    platform: acc.platform, externalId: acc.externalId,
    accessToken: decrypt(acc.accessToken), refreshToken: acc.refreshToken ? decrypt(acc.refreshToken) : null,
  };
  const adapter = adapterFor(acc.platform);
  if (adapter.refresh && acc.tokenExpiresAt && acc.tokenExpiresAt.getTime() < Date.now() + 5 * 60_000) {
    try {
      const t = await adapter.refresh(ctx);
      await db.socialAccount.update({
        where: { id: acc.id },
        data: {
          accessToken: encrypt(t.accessToken),
          refreshToken: t.refreshToken ? encrypt(t.refreshToken) : acc.refreshToken,
          tokenExpiresAt: t.tokenExpiresAt ?? null, status: "active", lastError: null,
        },
      });
      ctx = { ...ctx, accessToken: t.accessToken, refreshToken: t.refreshToken ?? ctx.refreshToken };
    } catch (e) {
      await db.socialAccount.update({ where: { id: acc.id }, data: { status: "expired", lastError: String(e) } });
      throw e;
    }
  }
  return ctx;
}
