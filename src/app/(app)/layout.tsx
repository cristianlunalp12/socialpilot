import { requireWorkspace } from "@/lib/auth";
import { logout, switchWorkspace } from "@/app/actions";
import { SidebarNav } from "@/components/Sidebar";
import { env } from "@/lib/env";
import { isAppAdmin } from "@/lib/admin";
import { ComingSoon } from "@/components/ComingSoon";
import Link from "next/link";
import { ViewerProvider } from "@/components/ViewerContext";
import { DEMO_EMAIL } from "@/lib/upcoming";
import { Backdrop, Icon, Logo } from "@/components/Brand";

const ROLE_LABEL: Record<string, string> = { OWNER: "Propietario", ADMIN: "Administrador", EDITOR: "Editor", VIEWER: "Lector" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace, memberships, role } = await requireWorkspace();
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <ViewerProvider value={{ email: user.email, isDemo: user.email === DEMO_EMAIL }}>
      <div className="ui-dark relative min-h-screen bg-[#0a0911]">
        <Backdrop />
        <div className="relative flex min-h-screen flex-col md:flex-row">
          <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-[#0e0d17]/80 p-4 backdrop-blur md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto md:border-b-0 md:border-r">
            <div className="mb-6 px-2 pt-1">
              <Logo href="/dashboard" />
            </div>

            <form action={switchWorkspace} className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Workspace</label>
              <select name="workspaceId" defaultValue={workspace.id} className="input" aria-label="Workspace">
                {memberships.map((m) => <option key={m.workspaceId} value={m.workspaceId}>{m.workspace.name}</option>)}
              </select>
              {memberships.length > 1 && <button className="mt-2 w-full text-left text-xs text-brand-600 hover:text-brand-700">Cambiar →</button>}
            </form>

            <SidebarNav />
            {isAppAdmin(user.email) && (
              <Link href="/admin" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-white/5 hover:text-white">
                <Icon name="shield" className="h-[18px] w-[18px]" />Admin
              </Link>
            )}

            <ComingSoon
              feature="upgrade"
              badge={false}
              className="group relative mt-6 w-full overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-[#2a1740] via-[#1d1638] to-[#151a3a] p-4 text-left text-sm text-white transition hover:border-violet-400/60"
            >
              <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-rose-500/30 blur-2xl" />
              <span className="relative flex items-center gap-2 font-display font-semibold">
                <Icon name="star" className="h-4 w-4 text-rose-300" /> Mejorar a Pro
              </span>
              <span className="relative mt-1 block text-xs text-slate-600">Calendario, reportes PDF, IA ilimitada…</span>
            </ComingSoon>

            <div className="mt-auto pt-6">
              {env.mockPlatforms && <div className="mb-3 rounded-lg bg-amber-100 px-3 py-1.5 text-xs text-amber-800">Modo simulado (PLATFORM_MODE=mock)</div>}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff7a85] to-[#8b5cf6] text-xs font-semibold text-white">{initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{user.name}</div>
                  <div className="truncate text-xs text-slate-400">{ROLE_LABEL[role] ?? role}</div>
                </div>
                <form action={logout}>
                  <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white" title="Cerrar sesión" aria-label="Cerrar sesión">
                    <Icon name="logout" className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </aside>
          <main className="min-w-0 flex-1 p-4 md:p-8 lg:p-10">{children}</main>
        </div>
      </div>
    </ViewerProvider>
  );
}
