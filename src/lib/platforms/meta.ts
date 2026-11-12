import { env } from "../env";
import { http, qs, sleep } from "./http";
import {
  type AccountCtx, type ConnectedAccount, type ProviderAdapter, PlatformError, emptyMetrics,
} from "./types";

const G = () => `https://graph.facebook.com/${env.meta.version}`;

const SCOPES = [
  "pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_read_user_content",
  "pages_manage_engagement", "read_insights", "business_management",
  "instagram_basic", "instagram_content_publish", "instagram_manage_comments", "instagram_manage_insights",
].join(",");

/**
 * Facebook Pages + Instagram Business/Creator accounts via the Graph API.
 * One OAuth login yields a page token per page; IG accounts linked to a page use that page token.
 */
export const metaAdapter: ProviderAdapter = {
  provider: "meta",

  authUrl(state, redirectUri) {
    return `https://www.facebook.com/${env.meta.version}/dialog/oauth?` +
      qs({ client_id: env.meta.appId, redirect_uri: redirectUri, state, scope: SCOPES, response_type: "code" });
  },

  async handleCallback(code, redirectUri) {
    const short = await http(`${G()}/oauth/access_token?` + qs({
      client_id: env.meta.appId, client_secret: env.meta.appSecret, redirect_uri: redirectUri, code,
    }));
    const long = await http(`${G()}/oauth/access_token?` + qs({
      grant_type: "fb_exchange_token", client_id: env.meta.appId,
      client_secret: env.meta.appSecret, fb_exchange_token: short.access_token,
    }));
    // Page tokens derived from a long-lived user token do not expire.
    const pages = await http(`${G()}/me/accounts?` + qs({
      access_token: long.access_token,
      fields: "id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}",
      limit: 100,
    }));
    const out: ConnectedAccount[] = [];
    for (const p of pages.data ?? []) {
      out.push({
        platform: "FACEBOOK", externalId: p.id, name: p.name,
        avatarUrl: p.picture?.data?.url, accessToken: p.access_token, scopes: SCOPES,
      });
      const ig = p.instagram_business_account;
      if (ig) out.push({
        platform: "INSTAGRAM", externalId: ig.id, name: `@${ig.username}`,
        avatarUrl: ig.profile_picture_url, accessToken: p.access_token, scopes: SCOPES,
      });
    }
    return out;
  },

  async publish(a, input) {
    const token = a.accessToken;
    if (a.platform === "FACEBOOK") {
      let r: any;
      if (input.mediaType === "IMAGE" && input.mediaUrl) {
        r = await http(`${G()}/${a.externalId}/photos`, { method: "POST", body: new URLSearchParams({ url: input.mediaUrl, caption: input.caption, access_token: token }) });
        return { externalId: r.post_id ?? r.id, permalink: `https://www.facebook.com/${r.post_id ?? r.id}` };
      }
      if (input.mediaType === "VIDEO" && input.mediaUrl) {
        r = await http(`${G()}/${a.externalId}/videos`, { method: "POST", body: new URLSearchParams({ file_url: input.mediaUrl, description: input.caption, title: input.title ?? "", access_token: token }) });
        return { externalId: r.id, permalink: `https://www.facebook.com/${a.externalId}/videos/${r.id}` };
      }
      r = await http(`${G()}/${a.externalId}/feed`, { method: "POST", body: new URLSearchParams({ message: input.caption, access_token: token }) });
      return { externalId: r.id, permalink: `https://www.facebook.com/${r.id}` };
    }

    // Instagram: create container → wait until FINISHED → publish.
    if (!input.mediaUrl || input.mediaType === "TEXT") {
      throw new PlatformError("Instagram requiere una imagen o video (mediaUrl público).");
    }
    const params: Record<string, string> = { caption: input.caption, access_token: token };
    if (input.mediaType === "VIDEO") { params.media_type = "REELS"; params.video_url = input.mediaUrl; }
    else params.image_url = input.mediaUrl;
    const container = await http(`${G()}/${a.externalId}/media`, { method: "POST", body: new URLSearchParams(params) });

    for (let i = 0; i < 30; i++) {
      const s = await http(`${G()}/${container.id}?` + qs({ fields: "status_code,status", access_token: token }));
      if (s.status_code === "FINISHED") break;
      if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new PlatformError(`IG container ${s.status_code}: ${s.status ?? ""}`);
      await sleep(5000);
    }
    const pub = await http(`${G()}/${a.externalId}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: container.id, access_token: token }) });
    const info = await http(`${G()}/${pub.id}?` + qs({ fields: "permalink", access_token: token }));
    return { externalId: pub.id, permalink: info.permalink };
  },

  async fetchMetrics(a, id) {
    const m = emptyMetrics();
    const t = a.accessToken;
    if (a.platform === "FACEBOOK") {
      const p = await http(`${G()}/${id}?` + qs({ fields: "shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)", access_token: t }));
      m.likes = p.reactions?.summary?.total_count ?? 0;
      m.comments = p.comments?.summary?.total_count ?? 0;
      m.shares = p.shares?.count ?? 0;
      try {
        const ins = await http(`${G()}/${id}/insights?` + qs({ metric: "post_impressions,post_impressions_unique", access_token: t }));
        for (const row of ins.data ?? []) {
          const v = row.values?.[0]?.value ?? 0;
          if (row.name === "post_impressions") m.impressions = v;
          if (row.name === "post_impressions_unique") m.reach = v;
        }
      } catch { /* insights unavailable for some post types */ }
      m.views = m.impressions;
      return m;
    }
    const p = await http(`${G()}/${id}?` + qs({ fields: "like_count,comments_count,media_product_type", access_token: t }));
    m.likes = p.like_count ?? 0;
    m.comments = p.comments_count ?? 0;
    try {
      const ins = await http(`${G()}/${id}/insights?` + qs({ metric: "reach,views,saved,shares", access_token: t }));
      for (const row of ins.data ?? []) {
        const v = row.values?.[0]?.value ?? row.total_value?.value ?? 0;
        if (row.name === "reach") m.reach = v;
        if (row.name === "views") { m.views = v; m.impressions = v; }
        if (row.name === "saved") m.saves = v;
        if (row.name === "shares") m.shares = v;
      }
    } catch { /* insights need instagram_manage_insights */ }
    return m;
  },

  async fetchComments(a, id) {
    const t = a.accessToken;
    if (a.platform === "FACEBOOK") {
      const r = await http(`${G()}/${id}/comments?` + qs({ fields: "id,from{name},message,created_time", limit: 100, access_token: t }));
      return (r.data ?? []).map((c: any) => ({ externalId: c.id, authorName: c.from?.name ?? "Usuario", text: c.message ?? "", postedAt: new Date(c.created_time) }));
    }
    const r = await http(`${G()}/${id}/comments?` + qs({ fields: "id,text,username,timestamp", limit: 100, access_token: t }));
    return (r.data ?? []).map((c: any) => ({ externalId: c.id, authorName: c.username ?? "usuario", text: c.text ?? "", postedAt: new Date(c.timestamp) }));
  },

  async fetchAccountStats(a: AccountCtx) {
    const fields = a.platform === "FACEBOOK" ? "followers_count,fan_count" : "followers_count";
    const r = await http(`${G()}/${a.externalId}?` + qs({ fields, access_token: a.accessToken }));
    return { followers: r.followers_count ?? r.fan_count ?? 0, reach: 0 };
  },
};
