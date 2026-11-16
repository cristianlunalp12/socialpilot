import type { Role } from "@prisma/client";
import { changeRole, logout, removeMember, revokeInvitation } from "@/app/actions";
import { NewWorkspaceForm } from "@/components/NewWorkspaceForm";
import { PageHeader } from "@/components/PageHeader";
import { InviteForm, WorkspaceForm } from "@/components/SettingsForms";
import { SubmitButton } from "@/components/SubmitButton";
import { ROLE_LABEL, can, requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";

const ROLE_HELP: Record<Role, string> = {
  OWNER: "Control total del workspace.",
  ADMIN: "Gestiona redes, miembros y configuración.",
  EDITOR: "Crea, programa y publica.",
  VIEWER: "Solo ve publicaciones y estadísticas.",
};

export default async function SettingsPage() {
  const { user, workspace, role } = await requireWorkspace();
  const admin = can(role, "ADMIN");
  const [members, invitations] = await Promise.all([
    db.membership.findMany({ where: { workspaceId: workspace.id }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    admin ? db.invitation.findMany({ where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }) : [],
  ]);

  return (
    <>
      <PageHeader title="Configuración" description={`Tu rol: ${ROLE_LABEL[role]} — ${ROLE_HELP[role]}`} />
      <div className="space-y-6">
        {admin && (
          <section className="card">
            <h2 className="mb-4 font-semibold">Workspace</h2>
            <WorkspaceForm name={workspace.name} timezone={workspace.timezone} />
          </section>
        )}

        <section className="card">
          <h2 className="mb-4 font-semibold">Miembros</h2>
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.user.name}{m.userId === user.id && <span className="ml-1 text-slate-400">(tú)</span>}</p>
                  <p className="truncate text-sm text-slate-500">{m.user.email}</p>
                </div>
                {admin && m.role !== "OWNER" && m.userId !== user.id ? (
                  <div className="flex items-center gap-2">
                    <form action={changeRole} className="flex items-center gap-2">
                      <input type="hidden" name="membershipId" value={m.id} />
                      <select name="role" defaultValue={m.role} className="input py-1.5" aria-label={`Rol de ${m.user.name}`}>
                        <option value="ADMIN">Administrador</option>
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Lector</option>
                      </select>
                      <SubmitButton className="btn-secondary py-1.5" pendingText="...">Cambiar</SubmitButton>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="membershipId" value={m.id} />
                      <SubmitButton className="btn-danger py-1.5" pendingText="...">Quitar</SubmitButton>
                    </form>
                  </div>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{ROLE_LABEL[m.role]}</span>
                )}
              </li>
            ))}
          </ul>

          {admin && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-sm font-semibold">Invitar a alguien</h3>
              <InviteForm />
              {invitations.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm">
                  {invitations.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="truncate">{i.email} · {ROLE_LABEL[i.role]} · caduca {formatDateTime(i.expiresAt, workspace.timezone)}</span>
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={i.id} />
                        <button className="text-red-600 hover:underline">Revocar</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="mb-1 font-semibold">Crear otro workspace</h2>
          <p className="mb-4 text-sm text-slate-500">Útil si gestionas varias marcas o clientes.</p>
          <NewWorkspaceForm />
        </section>

        <section className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Tu cuenta</h2>
            <p className="text-sm text-slate-500">{user.name} · {user.email}</p>
          </div>
          <form action={logout}><SubmitButton className="btn-secondary" pendingText="Saliendo...">Cerrar sesión</SubmitButton></form>
        </section>
      </div>
    </>
  );
}
