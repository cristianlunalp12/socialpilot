import { Backdrop, Logo } from "@/components/Brand";
import Link from "next/link";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";
import { acceptInvite } from "@/app/actions";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await db.invite.findUnique({ where: { token }, include: { workspace: true } });
  const valid = inv && !inv.acceptedAt && inv.expiresAt > new Date();
  const session = await readSession();
  return (
    <div className="ui-dark relative flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0911] p-4">
      <Backdrop />
      <div className="relative"><Logo /></div>
      <div className="card relative w-full max-w-md border-violet-300/20 p-6 shadow-[0_0_80px_-20px_rgba(139,92,246,0.35)] text-center">
        {!valid ? <p>Esta invitación no es válida o ya expiró.</p> : (
          <>
            <h1 className="text-xl font-semibold">Te invitaron a {inv.workspace.name}</h1>
            <p className="mb-6 mt-1 text-sm text-slate-500">Rol: {inv.role} · para {inv.email}</p>
            {session ? (
              <form action={acceptInvite.bind(null, token)}><button className="btn-primary w-full">Aceptar invitación</button></form>
            ) : (
              <div className="flex gap-2">
                <Link className="btn-secondary flex-1" href={`/login?invite=${token}`}>Entrar</Link>
                <Link className="btn-primary flex-1" href={`/register?invite=${token}`}>Crear cuenta</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
