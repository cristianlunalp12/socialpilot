import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { getActiveWorkspaceId, readSession } from "./session";

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };

export async function requireUser() {
  const s = await readSession();
  if (!s) redirect("/login");
  const user = await db.user.findUnique({ where: { id: s.userId } });
  if (!user) redirect("/login");
  return user;
}

/** Resolves the current user + active workspace and enforces a minimum role. */
export async function requireWorkspace(minRole: Role = "VIEWER") {
  const user = await requireUser();
  const activeId = await getActiveWorkspaceId();
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) redirect("/onboarding");
  const m = memberships.find((x) => x.workspaceId === activeId) ?? memberships[0];
  if (RANK[m.role] < RANK[minRole]) throw new ForbiddenError(`Requires role ${minRole}`);
  return { user, workspace: m.workspace, role: m.role, memberships };
}

export function can(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

export class ForbiddenError extends Error {}
