"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Platform, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, requireWorkspace } from "@/lib/auth";
import { createSession, destroySession, setActiveWorkspaceId } from "@/lib/session";
import { TIMEZONES, zonedToUtc } from "@/lib/dates";
import { PLATFORMS, getAdapter } from "@/lib/platforms";
import { publishPost } from "@/lib/publisher";

export type FormState = { error?: string; ok?: string; link?: string; values?: Record<string, string> } | undefined;

/**
 * Error para mostrar en el formulario. React vacía el formulario tras cada envío,
 * así que devolvemos lo que escribió el usuario (sin contraseñas) para volver a rellenarlo.
 */
const fail = (error: string, form?: FormData): FormState => {
  if (!form) return { error };
  const values: Record<string, string> = {};
  for (const [k, v] of form) if (typeof v === "string" && k !== "password" && !k.startsWith("$")) values[k] = v;
  return { error, values };
};
/** Mensaje para el usuario. Deja pasar las redirecciones internas de Next (p. ej. sesión caducada). */
const message = (e: unknown) => {
  unstable_rethrow(e);
  return e instanceof Error ? e.message : "Algo salió mal. Inténtalo de nuevo.";
};

/** Solo rutas internas, para evitar redirecciones abiertas. */
const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
};

// ---------- Cuenta ----------

const registerSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre").max(80),
  email: z.email("Correo no válido").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200),
  workspace: z.string().trim().max(80).optional(),
});

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error.issues[0].message, form);
  const { name, email, password, workspace } = parsed.data;
  const next = safeNext(form.get("next"));

  if (await db.user.findUnique({ where: { email } })) return fail("Ya existe una cuenta con ese correo. Inicia sesión.", form);
  const user = await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  // Si viene de una invitación no creamos workspace propio: se une al invitado.
  if (!next.startsWith("/invite/")) {
    const ws = await db.workspace.create({
      data: { name: workspace || `Equipo de ${name}`, memberships: { create: { userId: user.id, role: "OWNER" } } },
    });
    await setActiveWorkspaceId(ws.id);
  }
  await createSession(user.id);
  redirect(next);
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return fail("Correo o contraseña incorrectos.", form);
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---------- Workspaces ----------

const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre").max(80),
  timezone: z.string().refine((t) => TIMEZONES.includes(t), "Zona horaria no válida"),
});

export async function createWorkspace(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = workspaceSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error.issues[0].message, form);
  const ws = await db.workspace.create({ data: { ...parsed.data, memberships: { create: { userId: user.id, role: "OWNER" } } } });
  await setActiveWorkspaceId(ws.id);
  redirect("/dashboard");
}

export async function switchWorkspace(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("workspaceId"));
  const m = await db.membership.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId: id } } });
  if (m) await setActiveWorkspaceId(id);
  redirect("/dashboard");
}

export async function updateWorkspace(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { workspace } = await requireWorkspace("ADMIN");
    const parsed = workspaceSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return fail(parsed.error.issues[0].message, form);
    await db.workspace.update({ where: { id: workspace.id }, data: parsed.data });
  } catch (e) {
    return fail(message(e), form);
  }
  revalidatePath("/", "layout");
  return { ok: "Cambios guardados." };
}

// ---------- Miembros ----------

const ASSIGNABLE: Role[] = ["ADMIN", "EDITOR", "VIEWER"];

export async function inviteMember(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { workspace } = await requireWorkspace("ADMIN");
    const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
    if (!email.success) return fail("Correo no válido.", form);
    const role = String(form.get("role")) as Role;
    if (!ASSIGNABLE.includes(role)) return fail("Rol no válido.", form);
    const existing = await db.membership.findFirst({ where: { workspaceId: workspace.id, user: { email: email.data } } });
    if (existing) return fail("Esa persona ya es miembro del workspace.", form);

    const token = randomBytes(24).toString("base64url");
    await db.invitation.create({
      data: { workspaceId: workspace.id, email: email.data, role, token, expiresAt: new Date(Date.now() + 7 * 86_400_000) },
    });
    revalidatePath("/settings");
    const base = process.env.APP_URL ?? "";
    return { ok: `Invitación creada para ${email.data}. Envíale este enlace (caduca en 7 días):`, link: `${base}/invite/${token}` };
  } catch (e) {
    return fail(message(e), form);
  }
}

export async function revokeInvitation(form: FormData) {
  const { workspace } = await requireWorkspace("ADMIN");
  await db.invitation.deleteMany({ where: { id: String(form.get("id")), workspaceId: workspace.id } });
  revalidatePath("/settings");
}

export async function acceptInvitation(form: FormData) {
  const user = await requireUser();
  const inv = await db.invitation.findUnique({ where: { token: String(form.get("token")) } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date() || inv.email !== user.email) redirect(`/invite/${form.get("token")}`);
  await db.$transaction([
    db.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: inv.workspaceId } },
      create: { userId: user.id, workspaceId: inv.workspaceId, role: inv.role },
      update: {},
    }),
    db.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
  ]);
  await setActiveWorkspaceId(inv.workspaceId);
  redirect("/dashboard");
}

export async function changeRole(form: FormData) {
  const { workspace } = await requireWorkspace("ADMIN");
  const role = String(form.get("role")) as Role;
  if (!ASSIGNABLE.includes(role)) return;
  await db.membership.updateMany({
    where: { id: String(form.get("membershipId")), workspaceId: workspace.id, role: { not: "OWNER" } },
    data: { role },
  });
  revalidatePath("/settings");
}

export async function removeMember(form: FormData) {
  const { workspace } = await requireWorkspace("ADMIN");
  await db.membership.deleteMany({ where: { id: String(form.get("membershipId")), workspaceId: workspace.id, role: { not: "OWNER" } } });
  revalidatePath("/settings");
}

// ---------- Redes sociales ----------

export async function connectAccount(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { workspace } = await requireWorkspace("ADMIN");
    const platform = String(form.get("platform")) as Platform;
    if (!(platform in PLATFORMS)) return fail("Elige una red.", form);
    const handle = String(form.get("handle") ?? "").trim().replace(/^@/, "");
    if (!/^[\w.]{2,50}$/.test(handle)) return fail("Usuario no válido: usa letras, números, puntos o guiones bajos.", form);
    if ((process.env.PLATFORM_MODE ?? "mock") !== "mock") {
      return fail(`La conexión real con ${PLATFORMS[platform].label} (OAuth) todavía no está implementada.`, form);
    }

    const externalId = `mock_${handle.toLowerCase()}`;
    const account = await db.socialAccount.upsert({
      where: { workspaceId_platform_externalId: { workspaceId: workspace.id, platform, externalId } },
      create: { workspaceId: workspace.id, platform, externalId, handle, displayName: handle },
      update: { disconnectedAt: null, handle },
    });

    // En simulación rellenamos 30 días de historial para que el panel tenga datos.
    if ((await db.accountMetric.count({ where: { accountId: account.id } })) === 0) {
      const adapter = getAdapter(platform);
      const today = new Date();
      let followers = 0;
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
        const s = await adapter.accountStats(account, followers);
        followers = s.followers;
        await db.accountMetric.create({ data: { accountId: account.id, date, ...s } });
      }
    }
  } catch (e) {
    return fail(message(e), form);
  }
  revalidatePath("/accounts");
  return { ok: "Cuenta conectada." };
}

export async function disconnectAccount(form: FormData) {
  const { workspace } = await requireWorkspace("ADMIN");
  await db.socialAccount.updateMany({
    where: { id: String(form.get("accountId")), workspaceId: workspace.id },
    data: { disconnectedAt: new Date(), accessToken: null },
  });
  revalidatePath("/accounts");
}

// ---------- Publicaciones ----------

const postSchema = z.object({
  content: z.string().trim().min(1, "Escribe el texto de la publicación").max(63206),
  mediaUrl: z.union([z.literal(""), z.url("La URL de la imagen o video no es válida")]).optional(),
  mode: z.enum(["draft", "schedule", "now"]),
  scheduledAt: z.string().optional(),
});

export async function savePost(_: FormState, form: FormData): Promise<FormState> {
  let postId: string;
  try {
    const { user, workspace } = await requireWorkspace("EDITOR");
    const parsed = postSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return fail(parsed.error.issues[0].message, form);
    const { content, mediaUrl, mode } = parsed.data;

    const accountIds = [...new Set(form.getAll("accountIds").map(String))];
    const accounts = await db.socialAccount.findMany({ where: { id: { in: accountIds }, workspaceId: workspace.id, disconnectedAt: null } });
    if (mode !== "draft" && accounts.length === 0) return fail("Elige al menos una red donde publicar.", form);
    const tooLong = accounts.find((a) => content.length > PLATFORMS[a.platform].maxLength);
    if (tooLong) return fail(`El texto supera el máximo de ${PLATFORMS[tooLong.platform].label} (${PLATFORMS[tooLong.platform].maxLength} caracteres).`, form);

    let scheduledAt: Date | null = null;
    if (mode === "schedule") {
      scheduledAt = zonedToUtc(parsed.data.scheduledAt ?? "", workspace.timezone);
      if (!scheduledAt) return fail("Elige fecha y hora.", form);
      if (scheduledAt.getTime() < Date.now() + 60_000) return fail("La fecha debe ser en el futuro.", form);
    } else if (mode === "now") {
      scheduledAt = new Date();
    }

    const data = {
      content,
      mediaUrl: mediaUrl || null,
      status: mode === "draft" ? ("DRAFT" as const) : ("SCHEDULED" as const),
      scheduledAt,
      publishedAt: null,
      targets: { create: accounts.map((a) => ({ accountId: a.id })) },
    };

    const id = form.get("id") ? String(form.get("id")) : null;
    if (id) {
      const existing = await db.post.findFirst({ where: { id, workspaceId: workspace.id }, include: { targets: true } });
      if (!existing) return fail("La publicación no existe.", form);
      if (!["DRAFT", "SCHEDULED", "FAILED"].includes(existing.status) || existing.targets.some((t) => t.status === "PUBLISHED")) {
        return fail("Esta publicación ya salió y no se puede editar.", form);
      }
      await db.$transaction([
        db.postTarget.deleteMany({ where: { postId: id } }),
        db.post.update({ where: { id }, data }),
      ]);
      postId = id;
    } else {
      postId = (await db.post.create({ data: { ...data, workspaceId: workspace.id, authorId: user.id } })).id;
    }

    if (mode === "now") await publishPost(postId);
  } catch (e) {
    return fail(message(e), form);
  }
  revalidatePath("/posts");
  redirect(`/posts/${postId}`);
}

export async function deletePost(form: FormData) {
  const { workspace } = await requireWorkspace("EDITOR");
  await db.post.deleteMany({ where: { id: String(form.get("id")), workspaceId: workspace.id, status: { not: "PUBLISHING" } } });
  revalidatePath("/posts");
  redirect("/posts");
}

/** Vuelve a intentar las cuentas que fallaron. */
export async function retryPost(form: FormData) {
  const { workspace } = await requireWorkspace("EDITOR");
  const id = String(form.get("id"));
  const post = await db.post.findFirst({ where: { id, workspaceId: workspace.id, status: { in: ["FAILED", "PARTIAL"] } } });
  if (!post) return;
  await db.$transaction([
    db.postTarget.updateMany({ where: { postId: id, status: "FAILED" }, data: { status: "PENDING", attempts: 0, error: null } }),
    db.post.update({ where: { id }, data: { status: "SCHEDULED", scheduledAt: new Date() } }),
  ]);
  await publishPost(id);
  revalidatePath(`/posts/${id}`);
}
