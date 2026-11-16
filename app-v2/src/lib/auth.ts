import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { getActiveWorkspaceId, readSession } from "./session";

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Lector",
};

export function can(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

export async function getUser() {
  const s = await readSession();
  if (!s) return null;
  return db.user.findUnique({ where: { id: s.userId } });
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Usuario + workspace activo. Lanza error si el rol no alcanza el mínimo. */
export async function requireWorkspace(minRole: Role = "VIEWER") {
  const user = await requireUser();
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) redirect("/register?step=workspace");
  const activeId = await getActiveWorkspaceId();
  const m = memberships.find((x) => x.workspaceId === activeId) ?? memberships[0];
  if (!can(m.role, minRole)) throw new Error(`Tu rol (${ROLE_LABEL[m.role]}) no permite esta acción.`);
  return { user, workspace: m.workspace, role: m.role, memberships };
}
