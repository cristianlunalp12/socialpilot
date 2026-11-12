import { notFound } from "next/navigation";
import { subDays } from "date-fns";
import { requireUser } from "@/lib/auth";
import { isAppAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { UPCOMING, isUpcomingFeature } from "@/lib/upcoming";
import { Card, Empty, PageHeader } from "@/components/ui";

/** Demand for "coming soon" features across ALL workspaces (app owners only). */
export default async function AdminPage() {
  const user = await requireUser();
  if (!isAppAdmin(user.email)) notFound();

  const [rows, recent, totals] = await Promise.all([
    db.featureInterest.groupBy({ by: ["feature"], _count: { _all: true }, _sum: { clicks: true } }),
    db.featureInterest.groupBy({ by: ["feature"], where: { updatedAt: { gte: subDays(new Date(), 7) } }, _count: { _all: true } }),
    Promise.all([db.user.count(), db.workspace.count(), db.post.count()]),
  ]);
  const notify = await db.waitlistEntry.groupBy({ by: ["feature"], _count: { _all: true } });
  const waitlist = await db.waitlistEntry.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const by = (arr: { feature: string; _count: { _all: number } }[]) => Object.fromEntries(arr.map((r) => [r.feature, r._count._all]));
  const notifyBy = by(notify), recentBy = by(recent);

  const data = rows
    .filter((r) => isUpcomingFeature(r.feature))
    .map((r) => ({
      feature: r.feature as keyof typeof UPCOMING,
      users: r._count._all,
      clicks: r._sum.clicks ?? 0,
      notify: notifyBy[r.feature] ?? 0,
      last7: recentBy[r.feature] ?? 0,
    }))
    .sort((a, b) => b.notify - a.notify || b.users - a.users);
  const max = Math.max(1, ...data.map((d) => d.users));

  return (
    <>
      <PageHeader title="Admin · Demanda de funciones" subtitle="Clics en los botones “Próximamente” de todos los workspaces. Úsalo para decidir qué construir y qué cobrar." />
      <div className="mb-6 grid grid-cols-3 gap-4 text-sm">
        {[["Usuarios", totals[0]], ["Workspaces", totals[1]], ["Publicaciones", totals[2]]].map(([l, v]) => (
          <Card key={l}><div className="text-slate-500">{l}</div><div className="text-2xl font-semibold">{v}</div></Card>
        ))}
      </div>
      {data.length === 0 ? <Empty>Aún nadie ha hecho clic en funciones “Próximamente”.</Empty> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr><th className="py-2">Función</th><th>Plan</th><th className="w-1/3">Usuarios interesados</th><th className="text-right">Clics</th><th className="text-right">Pidieron aviso</th><th className="text-right">Últimos 7 días</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((d) => (
                <tr key={d.feature}>
                  <td className="py-2 font-medium">{UPCOMING[d.feature].title}</td>
                  <td className="text-slate-500">{UPCOMING[d.feature].plan}</td>
                  <td><div className="flex items-center gap-2"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(d.users / max) * 100}%` }} /><span className="tabular-nums">{d.users}</span></div></td>
                  <td className="text-right tabular-nums">{d.clicks}</td>
                  <td className="text-right font-semibold tabular-nums text-emerald-700">{d.notify}</td>
                  <td className="text-right tabular-nums">{d.last7}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-slate-400">“Pidieron aviso” es la señal más fuerte de intención de pago. Edita las funciones en <code>src/lib/upcoming.ts</code>.</p>
        </Card>
      )}
      <Card className="mt-6 overflow-x-auto">
        <h2 className="mb-3 font-medium">Lista de espera ({waitlist.length}{waitlist.length === 100 ? "+" : ""})</h2>
        {waitlist.length === 0 ? <p className="text-sm text-slate-500">Nadie ha pedido aviso todavía.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400"><tr><th className="py-2">Email</th><th>Función</th><th className="text-right">Fecha</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {waitlist.map((w) => (
                <tr key={w.id}>
                  <td className="py-2">{w.email}</td>
                  <td>{isUpcomingFeature(w.feature) ? UPCOMING[w.feature].title : w.feature}</td>
                  <td className="text-right text-slate-500">{w.createdAt.toLocaleDateString("es")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
