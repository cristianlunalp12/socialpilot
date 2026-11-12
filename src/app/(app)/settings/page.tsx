import { requireWorkspace, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { Card, PageHeader, PlatformBadge } from "@/components/ui";
import { InviteForm, WorkspaceSettingsForm } from "@/components/SettingsForms";
import { disconnectAccount, removeMember } from "@/app/actions";

const PROVIDERS = [
  { id: "meta", label: "Facebook + Instagram", note: "Páginas de Facebook y cuentas de Instagram Business/Creator vinculadas." },
  { id: "tiktok", label: "TikTok", note: "Publicación de videos y métricas. Comentarios no disponibles vía API pública." },
  { id: "youtube", label: "YouTube", note: "Subida de videos, estadísticas, tiempo de visualización y comentarios." },
];

export default async function Settings({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const { workspace, role, user } = await requireWorkspace();
  const sp = await searchParams;
  const admin = can(role, "ADMIN");
  const [accounts, members, invites] = await Promise.all([
    db.socialAccount.findMany({ where: { workspaceId: workspace.id }, orderBy: { platform: "asc" } }),
    db.membership.findMany({ where: { workspaceId: workspace.id }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    db.invite.findMany({ where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: new Date() } } }),
  ]);

  return (
    <>
      <PageHeader title="Configuración" subtitle={workspace.name} />
      {sp.connected && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">✓ {sp.connected} cuenta(s) conectada(s).</p>}
      {sp.error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}

      <div className="space-y-6">
        <Card>
          <h2 className="mb-1 font-medium">Cuentas sociales</h2>
          <p className="mb-4 text-sm text-slate-500">{env.mockPlatforms ? "Modo simulado: las conexiones crean cuentas de prueba sin salir de la app." : "Conecta vía OAuth oficial de cada plataforma."}</p>
          {admin && (
            <div className="mb-6 grid gap-3 md:grid-cols-3">
              {PROVIDERS.map((p) => (
                <a key={p.id} href={`/api/oauth/${p.id}/start`} className="rounded-xl border border-slate-200 p-4 hover:border-brand-500 hover:bg-brand-50">
                  <div className="font-medium">Conectar {p.label}</div>
                  <p className="mt-1 text-xs text-slate-500">{p.note}</p>
                </a>
              ))}
            </div>
          )}
          {accounts.length === 0 ? <p className="text-sm text-slate-500">Sin cuentas conectadas.</p> : (
            <ul className="divide-y divide-slate-100">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <PlatformBadge platform={a.platform} /><span className="font-medium">{a.name}</span>
                    {a.status !== "active" && <span className="text-xs text-red-600" title={a.lastError ?? ""}>{a.status} — reconecta</span>}
                  </div>
                  {admin && <form action={disconnectAccount}><input type="hidden" name="accountId" value={a.id} /><button className="text-xs text-red-600">Desconectar</button></form>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-medium">Marca</h2>
          <WorkspaceSettingsForm name={workspace.name} brandVoice={workspace.brandVoice ?? ""} disabled={!admin} />
        </Card>

        <Card>
          <h2 className="mb-4 font-medium">Equipo</h2>
          <ul className="mb-4 divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span><b className="font-medium">{m.user.name}</b> <span className="text-slate-500">{m.user.email}</span></span>
                <span className="flex items-center gap-3 text-xs text-slate-500">{m.role}
                  {admin && m.role !== "OWNER" && m.userId !== user.id && <form action={removeMember}><input type="hidden" name="membershipId" value={m.id} /><button className="text-red-600">Quitar</button></form>}
                </span>
              </li>
            ))}
            {invites.map((i) => <li key={i.id} className="py-2 text-sm text-slate-500">{i.email} · invitación pendiente ({i.role})</li>)}
          </ul>
          {admin && <InviteForm />}
          <p className="mt-4 text-xs text-slate-400">Roles: Owner/Admin gestionan cuentas y equipo · Editor crea y programa publicaciones · Solo lectura ve métricas.</p>
        </Card>
      </div>
    </>
  );
}
