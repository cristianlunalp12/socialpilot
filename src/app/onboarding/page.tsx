import { Backdrop, Logo } from "@/components/Brand";
import { requireUser } from "@/lib/auth";
import { WorkspaceForm } from "@/components/WorkspaceForm";

export default async function Onboarding() {
  const user = await requireUser();
  return (
    <div className="ui-dark relative flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0911] p-4">
      <Backdrop />
      <div className="relative"><Logo /></div>
      <div className="card relative w-full max-w-md border-violet-300/20 p-6 shadow-[0_0_80px_-20px_rgba(139,92,246,0.35)]">
        <h1 className="text-xl font-semibold">Hola, {user.name.split(" ")[0]} 👋</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Crea tu primer workspace. Cada workspace agrupa las cuentas sociales, el equipo y los datos de una marca o cliente.</p>
        <WorkspaceForm />
      </div>
    </div>
  );
}
