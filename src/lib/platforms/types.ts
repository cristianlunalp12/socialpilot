import type { MediaType, Platform } from "@prisma/client";

export type Provider = "meta" | "tiktok" | "youtube";

export const PROVIDER_OF: Record<Platform, Provider> = {
  FACEBOOK: "meta", INSTAGRAM: "meta", TIKTOK: "tiktok", YOUTUBE: "youtube",
};

export type ConnectedAccount = {
  platform: Platform;
  externalId: string;
  name: string;
  avatarUrl?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string | null;
};

/** Decrypted account handed to adapters. */
export type AccountCtx = {
  platform: Platform;
  externalId: string;
  accessToken: string;
  refreshToken?: string | null;
};

export type PublishInput = {
  caption: string;
  title?: string | null;
  mediaType: MediaType;
  mediaUrl?: string | null;
  tags: string[];
};

export type PublishResult = { externalId: string; permalink?: string | null };

export type MetricValues = {
  impressions: number; reach: number; views: number; likes: number;
  comments: number; shares: number; saves: number; watchTimeSec: number;
};

export type RawComment = { externalId: string; authorName: string; text: string; postedAt: Date };

export type AccountStats = { followers: number; reach: number };

export type TokenRefresh = { accessToken: string; refreshToken?: string | null; tokenExpiresAt?: Date | null };

export interface ProviderAdapter {
  provider: Provider;
  authUrl(state: string, redirectUri: string): string;
  /** Exchange the OAuth code and return every account (page/profile/channel) it grants. */
  handleCallback(code: string, redirectUri: string): Promise<ConnectedAccount[]>;
  refresh?(account: AccountCtx): Promise<TokenRefresh>;
  publish(account: AccountCtx, input: PublishInput): Promise<PublishResult>;
  fetchMetrics(account: AccountCtx, externalId: string): Promise<MetricValues>;
  fetchComments(account: AccountCtx, externalId: string): Promise<RawComment[]>;
  fetchAccountStats(account: AccountCtx): Promise<AccountStats>;
}

export const emptyMetrics = (): MetricValues => ({
  impressions: 0, reach: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0, watchTimeSec: 0,
});

export class PlatformError extends Error {
  constructor(message: string, public status?: number, public retryable = false) {
    super(message);
  }
}
