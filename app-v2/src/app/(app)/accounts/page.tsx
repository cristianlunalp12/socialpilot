import { disconnectAccount } from "@/app/actions";
import { PlatformBadge } from "@/components/Badges";
import { ConnectAccountForm } from "@/components/ConnectAccountForm";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { can, requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { number } from "@/lib/format";

export default async function AccountsPage() {
  const { workspace, role } = await requireWorkspace();
  const admin = can(role, "ADMIN");
  const accounts = await db.socialAccount.findMany({
    where: { workspaceId: workspace.id, disconnectedAt: null },
    orderBy: { platform: "asc" },
    include: { metrics: { orderBy: { date: "desc" }, take: 1 }, _count: { select: { targets: { where: { status: "PUBLISHED" } } } } },
  });
  const mock = (process.env.PLATFORM_MODE ?? "mock") === "mock";

  return (
    <>
      <PageHeader title="Redes conectadas" description="Las cuentas donde este workspace puede publicar." />
      {admin && (
        <section className="card mb-6">
          <h2 className="mb-1 font-semibold">Conectar una red</h2>
          {mock && <p className="mb-4 text-sm text-amber-800">Modo simulación: las cuentas y métricas son de prueba y no se publica nada real.</p>}
          <ConnectAccountForm />
        </section>
      )}
      {accounts.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">Todavía no hay redes conectadas.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {accounts.map((a) => (
            <div key={a.id} className="card flex items-start justify-between gap-4">
              <div>
                <PlatformBadge platform={a.platform} />
                <p className="mt-2 font-semibold">@{a.handle}</p>
                <p className="text-sm text-slate-500">
                  {number(a.metrics[0]?.followers ?? 0)} seguidores · {a._count.targets} publicaciones
                </p>
                <p className="mt-1 text-xs text-slate-400">Conectada el {formatDateTime(a.connectedAt, workspace.timezone)}</p>
              </div>
              {admin && (
                <form action={disconnectAccount}>
                  <input type="hidden" name="accountId" value={a.id} />
                  <SubmitButton className="btn-danger" pendingText="...">Desconectar</SubmitButton>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
