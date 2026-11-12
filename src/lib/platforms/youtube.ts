import { env } from "../env";
import { form, http, qs } from "./http";
import { type ProviderAdapter, PlatformError, emptyMetrics } from "./types";

const YT = "https://www.googleapis.com/youtube/v3";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

/** YouTube Data API v3 (upload, stats, comments) + YouTube Analytics API (watch time). */
export const youtubeAdapter: ProviderAdapter = {
  provider: "youtube",

  authUrl(state, redirectUri) {
    return "https://accounts.google.com/o/oauth2/v2/auth?" + qs({
      client_id: env.google.clientId, redirect_uri: redirectUri, response_type: "code",
      scope: SCOPES, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
    });
  },

  async handleCallback(code, redirectUri) {
    const tok = await http("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: form({ code, client_id: env.google.clientId, client_secret: env.google.clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const ch = await http(`${YT}/channels?part=snippet&mine=true`, { headers: bearer(tok.access_token) });
    return (ch.items ?? []).map((c: any) => ({
      platform: "YOUTUBE" as const, externalId: c.id, name: c.snippet.title,
      avatarUrl: c.snippet.thumbnails?.default?.url,
      accessToken: tok.access_token, refreshToken: tok.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tok.expires_in * 1000), scopes: tok.scope,
    }));
  },

  async refresh(a) {
    const tok = await http("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: form({ client_id: env.google.clientId, client_secret: env.google.clientSecret, refresh_token: a.refreshToken ?? "", grant_type: "refresh_token" }),
    });
    return { accessToken: tok.access_token, refreshToken: a.refreshToken, tokenExpiresAt: new Date(Date.now() + tok.expires_in * 1000) };
  },

  async publish(a, input) {
    if (input.mediaType !== "VIDEO" || !input.mediaUrl) throw new PlatformError("YouTube requiere un video (mediaUrl).");
    const media = await fetch(input.mediaUrl);
    if (!media.ok || !media.body) throw new PlatformError(`No se pudo descargar el video: ${media.status}`);
    const type = media.headers.get("content-type") ?? "video/mp4";
    const len = media.headers.get("content-length");

    // 1) Start a resumable upload session with the metadata.
    const start = await fetch(`https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`, {
      method: "POST",
      headers: {
        ...bearer(a.accessToken), "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": type, ...(len ? { "X-Upload-Content-Length": len } : {}),
      },
      body: JSON.stringify({
        snippet: { title: (input.title || input.caption.split("\n")[0]).slice(0, 100), description: input.caption.slice(0, 5000), tags: input.tags },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      }),
    });
    const location = start.headers.get("location");
    if (!start.ok || !location) throw new PlatformError(`YouTube upload init failed: ${start.status} ${await start.text()}`, start.status);

    // 2) Upload the bytes (buffered; for very large files switch to chunked uploads).
    const bytes = Buffer.from(await media.arrayBuffer());
    const video = await http(location, { method: "PUT", headers: { "Content-Type": type }, body: bytes });
    return { externalId: video.id, permalink: `https://www.youtube.com/watch?v=${video.id}` };
  },

  async fetchMetrics(a, id) {
    const m = emptyMetrics();
    const r = await http(`${YT}/videos?part=statistics,snippet&id=${id}`, { headers: bearer(a.accessToken) });
    const v = r.items?.[0];
    if (!v) return m;
    m.views = m.impressions = Number(v.statistics.viewCount ?? 0);
    m.likes = Number(v.statistics.likeCount ?? 0);
    m.comments = Number(v.statistics.commentCount ?? 0);
    try {
      const start = v.snippet.publishedAt.slice(0, 10);
      const end = new Date().toISOString().slice(0, 10);
      const an = await http("https://youtubeanalytics.googleapis.com/v2/reports?" + qs({
        ids: "channel==MINE", startDate: start, endDate: end, filters: `video==${id}`,
        metrics: "estimatedMinutesWatched,shares",
      }), { headers: bearer(a.accessToken) });
      const row = an.rows?.[0];
      if (row) { m.watchTimeSec = Math.round(row[0] * 60); m.shares = row[1]; }
    } catch { /* analytics data lags ~48h */ }
    return m;
  },

  async fetchComments(a, id) {
    const r = await http(`${YT}/commentThreads?` + qs({ part: "snippet", videoId: id, maxResults: 100, order: "time", textFormat: "plainText" }), { headers: bearer(a.accessToken) });
    return (r.items ?? []).map((t: any) => {
      const s = t.snippet.topLevelComment.snippet;
      return { externalId: t.id, authorName: s.authorDisplayName, text: s.textDisplay, postedAt: new Date(s.publishedAt) };
    });
  },

  async fetchAccountStats(a) {
    const r = await http(`${YT}/channels?part=statistics&id=${a.externalId}`, { headers: bearer(a.accessToken) });
    return { followers: Number(r.items?.[0]?.statistics?.subscriberCount ?? 0), reach: 0 };
  },
};
