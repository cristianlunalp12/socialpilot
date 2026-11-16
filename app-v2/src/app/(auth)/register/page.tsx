import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/AuthForms";
import { NewWorkspaceForm } from "@/components/NewWorkspaceForm";
import { getUser } from "@/lib/auth";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string; step?: string }> }) {
  const { next, email, step } = await searchParams;
  const user = await getUser();
  if (user && step === "workspace") {
    return (
      <>
        <h1 className="mb-1 text-lg font-semibold">Crea tu workspace</h1>
        <p className="mb-6 text-sm text-slate-500">Un workspace agrupa las redes y publicaciones de una marca.</p>
        <NewWorkspaceForm />
      </>
    );
  }
  if (user) redirect("/dashboard");
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Crea tu cuenta</h1>
      <p className="mb-6 text-sm text-slate-500">
        ¿Ya tienes cuenta? <Link className="text-brand-600 hover:underline" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Inicia sesión</Link>
      </p>
      <RegisterForm next={next} email={email} />
    </>
  );
}
