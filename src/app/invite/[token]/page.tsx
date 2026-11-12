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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md text-center">
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
