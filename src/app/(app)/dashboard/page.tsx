import Link from "next/link";
import { format, subDays } from "date-fns";
import { requireWorkspace } from "@/lib/auth";
import { workspaceReport, targetPerformance } from "@/lib/analytics";
import { db } from "@/lib/db";
import { fmt, pct } from "@/lib/utils";
import { Card, PageHeader, PlatformBadge, Stat, Empty } from "@/components/ui";
import { DailyViewsChart, EngagementByPlatform, FollowersChart, SentimentDonut } from "@/components/Charts";
import { ActionButton } from "@/components/ActionButton";
import { syncNow } from "@/app/actions";
import { ComingSoon } from "@/components/ComingSoon";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { workspace } = await requireWorkspace();
  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const [report, perf, scheduled, accounts] = await Promise.all([
    workspaceReport(workspace.id, days),
    targetPerformance(workspace.id, days),
    db.post.count({ where: { workspaceId: workspace.id, status: "SCHEDULED" } }),
    db.socialAccount.count({ where: { workspaceId: workspace.id } }),
  ]);

  // Views attributed to publish day, stacked by platform.
  const platforms = [...new Set(perf.map((p) => p.platform))];
  const daily = Array.from({ length: days }, (_, i) => {
    const d = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
    const row: Record<string, number | string> = { date: d.slice(5) };
    for (const pl of platforms) row[pl] = perf.filter((p) => p.platform === pl && format(p.publishedAt, "yyyy-MM-dd") === d).reduce((a, p) => a + p.views, 0);
    return row;
  });

  const followerTotal = report.followers.reduce((a, f) => a + (f.end ?? 0), 0);
  const followerDelta = report.followers.reduce((a, f) => a + ((f.end ?? 0) - (f.start ?? f.end ?? 0)), 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${workspace.name} · últimos ${days} días`}
        actions={<>
          {[7, 30, 90].map((d) => <Link key={d} href={`?days=${d}`} className={d === days ? "btn-primary" : "btn-secondary"}>{d}d</Link>)}
          <ComingSoon feature="pdfReport">📄 Exportar PDF</ComingSoon>
          <ActionButton action={syncNow} label="Sincronizar" pendingLabel="Sincronizando..." />
        </>}
      />

      {accounts === 0 && (
        <Card className="mb-6 border-brand-100 bg-brand-50">
          <p className="text-sm">Conecta tus cuentas de Facebook, Instagram, TikTok o YouTube para empezar. <Link href="/settings" className="font-medium text-brand-700">Conectar cuentas →</Link></p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Publicaciones" value={String(report.totals.posts)} hint={`${scheduled} programadas`} />
        <Stat label="Vistas" value={fmt.format(report.totals.views)} />
        <Stat label="Alcance" value={fmt.format(report.totals.reach)} />
        <Stat label="Engagement" value={pct(report.totals.engagementRate)} hint={`${fmt.format(report.totals.engagement)} interacciones`} />
        <Stat label="Seguidores" value={fmt.format(followerTotal)} hint={`${followerDelta >= 0 ? "+" : ""}${fmt.format(followerDelta)} en el periodo`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><h2 className="mb-3 font-medium">Vistas por día de publicación</h2>
          {perf.length ? <DailyViewsChart data={daily} platforms={platforms} /> : <Empty>Sin publicaciones en el periodo</Empty>}
        </Card>
        <Card><h2 className="mb-3 font-medium">Sentimiento de la audiencia</h2><SentimentDonut data={report.audience.sentiment} />
          <p className="mt-2 text-center text-xs text-slate-500">{report.audience.comments} comentarios · <Link className="text-brand-600" href="/inbox?filter=reply">{report.audience.pendingReplies} requieren respuesta</Link></p>
        </Card>
        <Card><h2 className="mb-3 font-medium">Engagement por red</h2>
          {report.byPlatform.length ? <EngagementByPlatform data={report.byPlatform} /> : <Empty>Sin datos</Empty>}
        </Card>
        <Card><h2 className="mb-3 font-medium">Crecimiento de seguidores</h2><FollowersChart series={report.followers} /></Card>
        <Card><h2 className="mb-3 font-medium">Temas más mencionados</h2>
          {report.audience.topTopics.length ? (
            <ul className="space-y-2 text-sm">
              {report.audience.topTopics.slice(0, 8).map((t) => (
                <li key={t.topic} className="flex items-center justify-between">
                  <span>{t.topic}</span>
                  <span className="text-xs text-slate-500">{t.count}{t.negative ? <span className="ml-2 text-red-600">{t.negative} neg.</span> : null}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>Los temas aparecen al analizar comentarios</Empty>}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 font-medium">Mejores publicaciones</h2>
        {perf.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400"><tr><th className="py-2">Publicación</th><th>Red</th><th className="text-right">Vistas</th><th className="text-right">Interacciones</th><th className="text-right">Engagement</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {[...perf].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 8).map((p) => (
                  <tr key={p.targetId}>
                    <td className="max-w-md truncate py-2 pr-4"><Link href={`/posts/${p.postId}`} className="hover:text-brand-600">{p.caption}</Link></td>
                    <td><PlatformBadge platform={p.platform} /></td>
                    <td className="text-right tabular-nums">{fmt.format(p.views)}</td>
                    <td className="text-right tabular-nums">{fmt.format(p.engagement)}</td>
                    <td className="text-right tabular-nums font-medium">{pct(p.engagementRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>Aún no hay publicaciones con métricas.</Empty>}
      </Card>
    </>
  );
}
