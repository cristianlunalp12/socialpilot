import { requireWorkspace } from "@/lib/auth";
import { logout, switchWorkspace } from "@/app/actions";
import { SidebarNav } from "@/components/Sidebar";
import { env } from "@/lib/env";
import { isAppAdmin } from "@/lib/admin";
import { ComingSoon } from "@/components/ComingSoon";
import Link from "next/link";
import { ViewerProvider } from "@/components/ViewerContext";
import { DEMO_EMAIL } from "@/lib/upcoming";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace, memberships, role } = await requireWorkspace();
  return (
    <ViewerProvider value={{ email: user.email, isDemo: user.email === DEMO_EMAIL }}>
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="mb-6 px-3 text-xl font-bold text-brand-600">SocialPilot</div>
        <form action={switchWorkspace} className="mb-6 px-1">
          <label className="label text-xs uppercase tracking-wide text-slate-400">Workspace</label>
          <select name="workspaceId" defaultValue={workspace.id} className="input" aria-label="Workspace">
            {memberships.map((m) => <option key={m.workspaceId} value={m.workspaceId}>{m.workspace.name}</option>)}
          </select>
          <button className="mt-2 w-full text-left text-xs text-brand-600">Cambiar →</button>
        </form>
        <SidebarNav />
        {isAppAdmin(user.email) && <Link href="/admin" className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"><span aria-hidden>🛡️</span>Admin</Link>}
        <ComingSoon feature="upgrade" badge={false} className="mt-6 w-full rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-3 text-left text-sm font-medium text-white shadow-sm hover:opacity-95">
          <span className="block">⭐ Mejorar a Pro</span>
          <span className="block text-xs font-normal opacity-80">Calendario, reportes PDF, IA ilimitada…</span>
        </ComingSoon>
        <div className="mt-auto border-t border-slate-100 px-3 pt-4 text-sm">
          {env.mockPlatforms && <div className="mb-3 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">Modo simulado (PLATFORM_MODE=mock)</div>}
          <div className="font-medium">{user.name}</div>
          <div className="text-xs text-slate-500">{user.email} · {role}</div>
          <form action={logout}><button className="mt-2 text-xs text-slate-500 hover:text-slate-800">Cerrar sesión</button></form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
    </ViewerProvider>
  );
}
