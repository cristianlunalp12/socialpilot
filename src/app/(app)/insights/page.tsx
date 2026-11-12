import { format } from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { RecommendationPayload } from "@/lib/ai";
import { PLATFORM_LABEL } from "@/lib/utils";
import { Card, Empty, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";
import { refreshInsights } from "@/app/actions";

const IMPACT = { alto: "bg-emerald-100 text-emerald-700", medio: "bg-amber-100 text-amber-800", bajo: "bg-slate-100 text-slate-600" };

export default async function Insights() {
  const { workspace } = await requireWorkspace();
  const [latest, history] = await Promise.all([
    db.recommendation.findFirst({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" } }),
    db.recommendation.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, skip: 1, take: 10, select: { id: true, summary: true, createdAt: true } }),
  ]);
  const p = latest?.payload as RecommendationPayload | undefined;

  return (
    <>
      <PageHeader title="Recomendaciones IA" subtitle="Claude analiza tus métricas y la retroalimentación de los últimos 30 días. Se regeneran cada lunes automáticamente."
        actions={env.aiEnabled ? <ActionButton variant="primary" action={refreshInsights} label="✨ Generar ahora" pendingLabel="Analizando (puede tardar ~1 min)..." /> : <span className="text-sm text-slate-500">Configura ANTHROPIC_API_KEY</span>} />
      {!p ? <Empty>Aún no hay recomendaciones. Publica contenido, sincroniza métricas y pulsa “Generar ahora”.</Empty> : (
        <div className="space-y-6">
          <Card className="border-brand-100 bg-brand-50">
            <div className="mb-1 text-xs text-brand-700">Resumen · {format(latest!.createdAt, "d MMM yyyy, HH:mm", { locale: es })}</div>
            <p className="text-sm leading-relaxed">{p.summary}</p>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {p.items.map((it, i) => (
              <Card key={i}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", IMPACT[it.impact])}>Impacto {it.impact}</span>
                  <span className="text-xs text-slate-500">{it.platform === "ALL" ? "Todas las redes" : PLATFORM_LABEL[it.platform]}</span>
                </div>
                <h3 className="font-medium">{it.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{it.rationale}</p>
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><b>Acción:</b> {it.action}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card><h3 className="mb-3 font-medium">Mejores horarios</h3>
              <ul className="space-y-1 text-sm">{p.bestTimes.map((b, i) => <li key={i}><b>{PLATFORM_LABEL[b.platform]}:</b> {b.day}, {b.hour}</li>)}</ul></Card>
            <Card><h3 className="mb-3 font-medium">Ideas de contenido</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">{p.contentIdeas.map((c, i) => <li key={i}>{c}</li>)}</ul></Card>
          </div>
          {history.length > 0 && (
            <Card><h3 className="mb-3 font-medium">Historial</h3>
              <ul className="space-y-3 text-sm">{history.map((h) => <li key={h.id}><span className="text-xs text-slate-500">{format(h.createdAt, "d MMM yyyy", { locale: es })}</span><p>{h.summary}</p></li>)}</ul></Card>
          )}
        </div>
      )}
    </>
  );
}
