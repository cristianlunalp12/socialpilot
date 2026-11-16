import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { getUser } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams;
  if (await getUser()) redirect(next?.startsWith("/") ? next : "/dashboard");
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Inicia sesión</h1>
      <p className="mb-6 text-sm text-slate-500">
        ¿No tienes cuenta? <Link className="text-brand-600 hover:underline" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Regístrate</Link>
      </p>
      <LoginForm next={next} email={email} />
    </>
  );
}
