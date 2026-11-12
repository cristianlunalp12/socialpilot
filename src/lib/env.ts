function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export const env = {
  // RENDER_EXTERNAL_URL is set automatically on Render.
  get appUrl() { return process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000"; },
  get authSecret() { return req("AUTH_SECRET"); },
  get encryptionKey() { return req("ENCRYPTION_KEY"); },
  get mockPlatforms() { return (process.env.PLATFORM_MODE ?? "mock") === "mock"; },
  get aiEnabled() { return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN); },
  meta: {
    get appId() { return req("META_APP_ID"); },
    get appSecret() { return req("META_APP_SECRET"); },
    get version() { return process.env.META_GRAPH_VERSION ?? "v23.0"; },
  },
  tiktok: {
    get clientKey() { return req("TIKTOK_CLIENT_KEY"); },
    get clientSecret() { return req("TIKTOK_CLIENT_SECRET"); },
  },
  google: {
    get clientId() { return req("GOOGLE_CLIENT_ID"); },
    get clientSecret() { return req("GOOGLE_CLIENT_SECRET"); },
  },
};
