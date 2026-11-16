import Link from "next/link";
import { acceptInvitation, logout } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ROLE_LABEL, getUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await db.invitation.findUnique({ where: { token }, include: { workspace: true } });
  const user = await getUser();
  const next = `/invite/${token}`;

  let body: React.ReactNode;
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) {
    body = <p className="text-sm text-slate-600">Esta invitación no existe, ya se usó o caducó. Pide a quien te invitó que te envíe una nueva.</p>;
  } else if (!user) {
    const q = `?next=${encodeURIComponent(next)}&email=${encodeURIComponent(inv.email)}`;
    body = (
      <div className="flex gap-2">
        <Link href={`/register${q}`} className="btn-primary">Crear cuenta</Link>
        <Link href={`/login${q}`} className="btn-secondary">Ya tengo cuenta</Link>
      </div>
    );
  } else if (user.email !== inv.email) {
    body = (
      <div className="space-y-3 text-sm text-slate-600">
        <p>La invitación es para <strong>{inv.email}</strong>, pero entraste como <strong>{user.email}</strong>.</p>
        <form action={logout}><SubmitButton className="btn-secondary">Cerrar sesión y cambiar de cuenta</SubmitButton></form>
      </div>
    );
  } else {
    body = (
      <form action={acceptInvitation}>
        <input type="hidden" name="token" value={token} />
        <SubmitButton pendingText="Uniéndote...">Aceptar invitación</SubmitButton>
      </form>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md space-y-4">
        <h1 className="text-lg font-semibold">
          {inv ? <>Te invitaron a <span className="text-brand-700">{inv.workspace.name}</span></> : "Invitación"}
        </h1>
        {inv && <p className="text-sm text-slate-500">Rol: {ROLE_LABEL[inv.role]}</p>}
        {body}
      </div>
    </main>
  );
}
