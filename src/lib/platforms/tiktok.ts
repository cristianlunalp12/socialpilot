import { env } from "../env";
import { form, http, qs, sleep } from "./http";
import { type ProviderAdapter, PlatformError, emptyMetrics } from "./types";

const API = "https://open.tiktokapis.com/v2";
const SCOPES = "user.info.basic,user.info.stats,video.publish,video.list";

/**
 * TikTok Login Kit + Content Posting API (Direct Post) + Display API.
 * Notes:
 * - Until your app passes TikTok's audit, Direct Post only allows privacy_level SELF_ONLY.
 * - PULL_FROM_URL requires the media domain to be verified in the TikTok developer portal.
 * - Comments are not exposed to regular apps (Research API only), so fetchComments returns [].
 */
export const tiktokAdapter: ProviderAdapter = {
  provider: "tiktok",

  authUrl(state, redirectUri) {
    return "https://www.tiktok.com/v2/auth/authorize/?" +
      qs({ client_key: env.tiktok.clientKey, scope: SCOPES, response_type: "code", redirect_uri: redirectUri, state });
  },

  async handleCallback(code, redirectUri) {
    const tok = await http(`${API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form({ client_key: env.tiktok.clientKey, client_secret: env.tiktok.clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }),
    });
    const me = await http(`${API}/user/info/?fields=open_id,display_name,avatar_url`, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const u = me.data.user;
    return [{
      platform: "TIKTOK", externalId: u.open_id ?? tok.open_id, name: u.display_name, avatarUrl: u.avatar_url,
      accessToken: tok.access_token, refreshToken: tok.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tok.expires_in * 1000), scopes: tok.scope,
    }];
  },

  async refresh(a) {
    const tok = await http(`${API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form({ client_key: env.tiktok.clientKey, client_secret: env.tiktok.clientSecret, grant_type: "refresh_token", refresh_token: a.refreshToken ?? "" }),
    });
    return { accessToken: tok.access_token, refreshToken: tok.refresh_token, tokenExpiresAt: new Date(Date.now() + tok.expires_in * 1000) };
  },

  async publish(a, input) {
    if (input.mediaType !== "VIDEO" || !input.mediaUrl) throw new PlatformError("TikTok requiere un video (mediaUrl público).");
    const auth = { Authorization: `Bearer ${a.accessToken}`, "Content-Type": "application/json; charset=UTF-8" };
    const creator = await http(`${API}/post/publish/creator_info/query/`, { method: "POST", headers: auth });
    const options: string[] = creator.data?.privacy_level_options ?? ["SELF_ONLY"];
    const privacy = options.includes("PUBLIC_TO_EVERYONE") ? "PUBLIC_TO_EVERYONE" : options[0];

    const init = await http(`${API}/post/publish/video/init/`, {
      method: "POST", headers: auth,
      body: JSON.stringify({
        post_info: { title: input.caption.slice(0, 2200), privacy_level: privacy, disable_comment: false },
        source_info: { source: "PULL_FROM_URL", video_url: input.mediaUrl },
      }),
    });
    const publishId: string = init.data.publish_id;

    for (let i = 0; i < 40; i++) {
      await sleep(6000);
      const s = await http(`${API}/post/publish/status/fetch/`, { method: "POST", headers: auth, body: JSON.stringify({ publish_id: publishId }) });
      const st = s.data?.status;
      if (st === "PUBLISH_COMPLETE") {
        const vid = s.data.publicaly_available_post_id?.[0];
        return { externalId: String(vid ?? publishId), permalink: vid ? `https://www.tiktok.com/video/${vid}` : null };
      }
      if (st === "FAILED") throw new PlatformError(`TikTok publish failed: ${s.data.fail_reason}`);
    }
    // Still processing (e.g. SELF_ONLY posts have no public id): keep publish_id as reference.
    return { externalId: publishId, permalink: null };
  },

  async fetchMetrics(a, id) {
    const m = emptyMetrics();
    if (id.startsWith("v_pub")) return m; // publish_id, not a public video id
    const r = await http(`${API}/video/query/?fields=id,like_count,comment_count,share_count,view_count`, {
      method: "POST",
      headers: { Authorization: `Bearer ${a.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ filters: { video_ids: [id] } }),
    });
    const v = r.data?.videos?.[0];
    if (!v) return m;
    m.views = m.impressions = v.view_count ?? 0;
    m.likes = v.like_count ?? 0;
    m.comments = v.comment_count ?? 0;
    m.shares = v.share_count ?? 0;
    return m;
  },

  async fetchComments() {
    return [];
  },

  async fetchAccountStats(a) {
    const r = await http(`${API}/user/info/?fields=follower_count`, { headers: { Authorization: `Bearer ${a.accessToken}` } });
    return { followers: r.data?.user?.follower_count ?? 0, reach: 0 };
  },
};
