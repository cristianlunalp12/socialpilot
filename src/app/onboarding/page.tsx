import { requireUser } from "@/lib/auth";
import { WorkspaceForm } from "@/components/WorkspaceForm";

export default async function Onboarding() {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <h1 className="text-xl font-semibold">Hola, {user.name.split(" ")[0]} 👋</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Crea tu primer workspace. Cada workspace agrupa las cuentas sociales, el equipo y los datos de una marca o cliente.</p>
        <WorkspaceForm />
      </div>
    </div>
  );
}
