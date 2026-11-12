"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod/v4";
import type { Platform } from "@prisma/client";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { requireUser, requireWorkspace } from "@/lib/auth";
import { createSession, destroySession, setActiveWorkspace } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { AIError, generateCopy } from "@/lib/ai";
import { JOBS, enqueue } from "@/lib/queue";
import { targetPerformance } from "@/lib/analytics";
import { analyzePendingComments, buildRecommendations, syncMetrics } from "@/lib/services/sync";
import { env } from "@/lib/env";

export type FormState = { error?: string; ok?: string } | undefined;

// ───────────── Auth ─────────────

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const p = z.object({ name: z.string().min(2), email: z.email(), password: z.string().min(8) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Revisa los datos: nombre, email válido y contraseña de 8+ caracteres." };
  const email = p.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) return { error: "Ese email ya está registrado." };
  const user = await db.user.create({ data: { name: p.data.name, email, passwordHash: await bcrypt.hash(p.data.password, 10) } });
  await createSession(user.id);
  const invite = fd.get("invite");
  redirect(typeof invite === "string" && invite ? `/invite/${invite}` : "/onboarding");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(String(fd.get("password") ?? ""), user.passwordHash))) return { error: "Credenciales inválidas." };
  await createSession(user.id);
  const invite = fd.get("invite");
  redirect(typeof invite === "string" && invite ? `/invite/${invite}` : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ───────────── Workspaces & team ─────────────

export async function createWorkspace(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return { error: "El nombre es muy corto." };
  const slug = `${slugify(name)}-${randomBytes(3).toString("hex")}`;
  const ws = await db.workspace.create({
    data: { name, slug, brandVoice: String(fd.get("brandVoice") ?? "") || null, memberships: { create: { userId: user.id, role: "OWNER" } } },
  });
  await setActiveWorkspace(ws.id);
  redirect("/dashboard");
}

export async function switchWorkspace(fd: FormData) {
  const { memberships } = await requireWorkspace();
  const id = String(fd.get("workspaceId"));
  if (memberships.some((m) => m.workspaceId === id)) await setActiveWorkspace(id);
  redirect("/dashboard");
}

export async function updateWorkspace(_: FormState, fd: FormData): Promise<FormState> {
  const { workspace } = await requireWorkspace("ADMIN");
  await db.workspace.update({
    where: { id: workspace.id },
    data: { name: String(fd.get("name") || workspace.name), brandVoice: String(fd.get("brandVoice") ?? "") || null },
  });
  revalidatePath("/settings");
  return { ok: "Guardado" };
}

export async function inviteMember(_: FormState, fd: FormData): Promise<FormState> {
  const { workspace } = await requireWorkspace("ADMIN");
  const p = z.object({ email: z.email(), role: z.enum(["ADMIN", "EDITOR", "VIEWER"]) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Email o rol inválido." };
  const token = randomBytes(24).toString("base64url");
  await db.invite.create({ data: { workspaceId: workspace.id, email: p.data.email.toLowerCase(), role: p.data.role, token, expiresAt: addDays(new Date(), 7) } });
  revalidatePath("/settings");
  // TODO: send via your email provider (Resend, SES...). For now, the link is shown in the UI.
  return { ok: `${env.appUrl}/invite/${token}` };
}

export async function acceptInvite(token: string) {
  const user = await requireUser();
  const inv = await db.invite.findUnique({ where: { token } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) redirect("/dashboard");
  if (inv.email !== user.email) throw new Error("Esta invitación es para otro email.");
  await db.$transaction([
    db.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: inv.workspaceId } },
      create: { userId: user.id, workspaceId: inv.workspaceId, role: inv.role }, update: {},
    }),
    db.invite.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
  ]);
  await setActiveWorkspace(inv.workspaceId);
  redirect("/dashboard");
}

export async function removeMember(fd: FormData) {
  const { workspace, user } = await requireWorkspace("ADMIN");
  const id = String(fd.get("membershipId"));
  const m = await db.membership.findFirst({ where: { id, workspaceId: workspace.id } });
  if (m && m.role !== "OWNER" && m.userId !== user.id) await db.membership.delete({ where: { id } });
  revalidatePath("/settings");
}

export async function disconnectAccount(fd: FormData) {
  const { workspace } = await requireWorkspace("ADMIN");
  await db.socialAccount.deleteMany({ where: { id: String(fd.get("accountId")), workspaceId: workspace.id } });
  revalidatePath("/settings");
}

// ───────────── Posts ─────────────

const PostInput = z.object({
  title: z.string().optional(),
  baseCaption: z.string().min(1, "Escribe un texto base"),
  mediaType: z.enum(["TEXT", "IMAGE", "VIDEO"]),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  mode: z.enum(["draft", "now", "schedule"]),
  scheduledAt: z.string().optional(),
  targets: z.array(z.object({ accountId: z.string(), caption: z.string().min(1) })).min(1, "Elige al menos una cuenta"),
});
export type PostInputT = z.input<typeof PostInput>;

export async function savePost(input: PostInputT): Promise<{ error?: string; id?: string }> {
  const { workspace, user } = await requireWorkspace("EDITOR");
  const p = PostInput.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Datos inválidos" };
  const d = p.data;
  const accounts = await db.socialAccount.findMany({ where: { workspaceId: workspace.id, id: { in: d.targets.map((t) => t.accountId) } } });
  if (accounts.length !== d.targets.length) return { error: "Cuenta inválida" };

  // Validate media requirements per platform up front, so users see errors before scheduling.
  for (const a of accounts) {
    if (a.platform === "INSTAGRAM" && d.mediaType === "TEXT") return { error: "Instagram requiere imagen o video." };
    if ((a.platform === "TIKTOK" || a.platform === "YOUTUBE") && d.mediaType !== "VIDEO") return { error: `${a.platform === "TIKTOK" ? "TikTok" : "YouTube"} requiere un video.` };
  }
  if (d.mediaType !== "TEXT" && !d.mediaUrl) return { error: "Agrega la URL o sube el archivo multimedia." };

  let scheduledAt: Date | null = null;
  if (d.mode === "schedule") {
    scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : null;
    if (!scheduledAt || isNaN(+scheduledAt) || scheduledAt < new Date()) return { error: "La fecha programada debe ser futura." };
  }

  const post = await db.post.create({
    data: {
      workspaceId: workspace.id, authorId: user.id, title: d.title || null, baseCaption: d.baseCaption,
      mediaType: d.mediaType, mediaUrl: d.mediaUrl || null, tags: d.tags,
      status: d.mode === "draft" ? "DRAFT" : d.mode === "now" ? "PUBLISHING" : "SCHEDULED", scheduledAt,
      targets: { create: d.targets.map((t) => ({ accountId: t.accountId, caption: t.caption })) },
    },
  });
  if (d.mode === "now") await enqueue(JOBS.publishPost, { postId: post.id }, { singletonKey: post.id });
  revalidatePath("/posts");
  return { id: post.id };
}

export async function retryPost(fd: FormData) {
  const { workspace } = await requireWorkspace("EDITOR");
  const post = await db.post.findFirst({ where: { id: String(fd.get("postId")), workspaceId: workspace.id } });
  if (!post) return;
  await db.postTarget.updateMany({ where: { postId: post.id, status: "FAILED" }, data: { status: "PENDING" } });
  await db.post.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });
  await enqueue(JOBS.publishPost, { postId: post.id });
  revalidatePath(`/posts/${post.id}`);
}

export async function deletePost(fd: FormData) {
  const { workspace } = await requireWorkspace("EDITOR");
  await db.post.deleteMany({ where: { id: String(fd.get("postId")), workspaceId: workspace.id, status: { in: ["DRAFT", "SCHEDULED", "FAILED"] } } });
  redirect("/posts");
}

// ───────────── AI ─────────────

export async function aiGenerateCopy(input: { brief: string; platforms: Platform[] }) {
  const { workspace } = await requireWorkspace("EDITOR");
  if (!env.aiEnabled) return { error: "Configura ANTHROPIC_API_KEY para usar la IA." };
  if (!input.brief.trim() || input.platforms.length === 0) return { error: "Escribe un brief y elige redes." };
  try {
    const top = (await targetPerformance(workspace.id, 90))
      .sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5).map((p) => p.caption.slice(0, 400));
    const variants = await generateCopy({ brief: input.brief, platforms: [...new Set(input.platforms)], brandVoice: workspace.brandVoice, topPerformers: top });
    return { variants };
  } catch (e) {
    return { error: e instanceof AIError ? e.message : "Error generando el copy." };
  }
}

export async function refreshInsights(): Promise<FormState> {
  const { workspace } = await requireWorkspace("EDITOR");
  if (!env.aiEnabled) return { error: "Configura ANTHROPIC_API_KEY para usar la IA." };
  try {
    await analyzePendingComments();
    const r = await buildRecommendations(workspace.id);
    revalidatePath("/insights");
    return r ? { ok: "Recomendaciones actualizadas" } : { error: "Aún no hay publicaciones con métricas para analizar." };
  } catch (e) {
    return { error: e instanceof AIError ? e.message : "Error generando recomendaciones." };
  }
}

export async function syncNow(): Promise<FormState> {
  const { workspace } = await requireWorkspace("EDITOR");
  const created = await syncMetrics({ workspaceId: workspace.id });
  let analyzed = 0;
  try { analyzed = await analyzePendingComments(); } catch (e) { console.error(e); }
  revalidatePath("/", "layout");
  return { ok: `Métricas sincronizadas · ${created.length} comentarios nuevos · ${analyzed} analizados` };
}

// ───────────── Fake doors (coming soon) ─────────────

export async function recordInterest(feature: string, notifyEmail?: string): Promise<{ error?: string } | void> {
  const { isUpcomingFeature } = await import("@/lib/upcoming");
  if (!isUpcomingFeature(feature)) return;
  const { user, workspace } = await requireWorkspace();
  const notify = notifyEmail !== undefined;
  if (notify) {
    const email = z.email().safeParse(notifyEmail.trim().toLowerCase());
    if (!email.success) return { error: "Escribe un email válido." };
    await db.waitlistEntry.upsert({
      where: { email_feature: { email: email.data, feature } },
      create: { email: email.data, feature, userId: user.id }, update: {},
    });
  }
  await db.featureInterest.upsert({
    where: { userId_feature: { userId: user.id, feature } },
    create: { userId: user.id, workspaceId: workspace.id, feature, notify },
    update: notify ? { notify: true } : { clicks: { increment: 1 } },
  });
}
