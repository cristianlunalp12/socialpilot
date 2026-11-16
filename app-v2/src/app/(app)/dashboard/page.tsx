import Link from "next/link";
import clsx from "clsx";
import { EngagementByPlatform, FollowersChart } from "@/components/Charts";
import { PlatformBadge } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { getDashboard } from "@/lib/analytics";
import { requireWorkspace } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { compact, number, percent } from "@/lib/format";
import { PLATFORMS } from "@/lib/platforms";

const RANGES = [7, 30, 90];

function Delta({ now, before, asRate }: { now: number; before: number; asRate?: boolean }) {
  if (!before) return <span className="text-xs text-slate-400">sin datos del periodo anterior</span>;
  const diff = asRate ? now - before : (now - before) / before;
  const up = diff >= 0;
  return (
    <span className={clsx("text-xs font-medium", up ? "text-emerald-700" : "text-red-700")}>
      {up ? "▲" : "▼"} {asRate ? `${(Math.abs(diff) * 100).toLocaleString("es", { maximumFractionDigits: 1 })} pts` : percent(Math.abs(diff))} <span className="font-normal text-slate-500">vs. periodo anterior</span>
    </span>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { workspace } = await requireWorkspace();
  const days = RANGES.includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const d = await getDashboard(workspace.id, days);

  const rangePicker = (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
      {RANGES.map((r) => (
        <Link key={r} href={`/dashboard?days=${r}`} className={clsx("rounded-md px-3 py-1.5", r === days ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
          {r} días
        </Link>
      ))}
    </div>
  );

  if (d.accounts.length === 0) {
    return (
      <>
        <PageHeader title="Estadísticas" />
        <div className="card text-center">
          <p className="font-medium">Aún no hay redes conectadas</p>
          <p className="mt-1 text-sm text-slate-500">Conecta tu primera red para empezar a ver seguidores, alcance e interacción.</p>
          <Link href="/accounts" className="btn-primary mt-4">Conectar una red</Link>
        </div>
      </>
    );
  }

  const k = d.kpis;
  return (
    <>
      <PageHeader title="Estadísticas" description={`Últimos ${days} días en ${workspace.name}`} actions={rangePicker} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Seguidores" value={compact(k.followers)}>
          <span className={clsx("text-xs font-medium", k.followersDelta >= 0 ? "text-emerald-700" : "text-red-700")}>
            {k.followersDelta >= 0 ? "▲ +" : "▼ "}{number(k.followersDelta)} <span className="font-normal text-slate-500">en el periodo</span>
          </span>
        </Kpi>
        <Kpi label="Impresiones" value={compact(k.impressions)}><Delta now={k.impressions} before={k.impressionsPrev} /></Kpi>
        <Kpi label="Tasa de interacción" value={percent(k.engagementRate)}><Delta now={k.engagementRate} before={k.engagementRatePrev} asRate /></Kpi>
        <Kpi label="Publicaciones" value={number(k.posts)}><Delta now={k.posts} before={k.postsPrev} /></Kpi>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <h2 className="font-semibold">Seguidores por red</h2>
          <FollowersChart data={d.series} platforms={d.platforms} />
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-slate-500">Ver como tabla</summary>
            <table className="mt-2 w-full text-left">
              <thead className="text-slate-500"><tr><th className="py-1">Red</th><th className="text-right">Seguidores</th><th className="text-right">Impresiones</th><th className="text-right">Interacciones</th></tr></thead>
              <tbody>
                {d.perPlatform.map((p) => (
                  <tr key={p.platform} className="border-t border-slate-100">
                    <td className="py-1">{PLATFORMS[p.platform].label}</td>
                    <td className="text-right tabular-nums">{number(p.followers)}</td>
                    <td className="text-right tabular-nums">{number(p.impressions)}</td>
                    <td className="text-right tabular-nums">{number(p.engagements)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
        <section className="card">
          <h2 className="font-semibold">Tasa de interacción por red</h2>
          <p className="mb-2 text-xs text-slate-500">Interacciones ÷ impresiones</p>
          <EngagementByPlatform data={d.perPlatform} />
        </section>
      </div>

      <section className="card mt-4">
        <h2 className="mb-3 font-semibold">Publicaciones con más interacción</h2>
        {d.topPosts.length === 0 ? (
          <p className="text-sm text-slate-500">No hay publicaciones en este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-slate-500">
                <tr><th className="pb-2 font-medium">Publicación</th><th className="pb-2 font-medium">Red</th><th className="pb-2 text-right font-medium">Vistas</th><th className="pb-2 text-right font-medium">Me gusta</th><th className="pb-2 text-right font-medium">Comentarios</th><th className="pb-2 text-right font-medium">Compartidos</th></tr>
              </thead>
              <tbody>
                {d.topPosts.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="max-w-xs py-2 pr-4">
                      <Link href={`/posts/${t.post.id}`} className="line-clamp-1 hover:underline">{t.post.content}</Link>
                      <span className="text-xs text-slate-500">{t.publishedAt && formatDateTime(t.publishedAt, workspace.timezone)}</span>
                    </td>
                    <td><PlatformBadge platform={t.account.platform} /></td>
                    <td className="text-right tabular-nums">{number(t.views)}</td>
                    <td className="text-right tabular-nums">{number(t.likes)}</td>
                    <td className="text-right tabular-nums">{number(t.comments)}</td>
                    <td className="text-right tabular-nums">{number(t.shares)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
