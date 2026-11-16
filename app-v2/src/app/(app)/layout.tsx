import { logout } from "@/app/actions";
import { Nav } from "@/components/Nav";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { requireWorkspace } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace, memberships } = await requireWorkspace();
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="mb-4 flex items-center justify-between md:block">
          <p className="text-lg font-bold text-brand-700">SocialPilot</p>
          <div className="w-44 md:mt-4 md:w-auto">
            <WorkspaceSwitcher current={workspace.id} options={memberships.map((m) => ({ id: m.workspaceId, name: m.workspace.name }))} />
          </div>
        </div>
        <Nav />
        <div className="mt-4 hidden border-t border-slate-200 pt-4 text-sm md:block">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-slate-500">{user.email}</p>
          <form action={logout} className="mt-2">
            <button className="text-slate-500 hover:text-slate-900 hover:underline">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
