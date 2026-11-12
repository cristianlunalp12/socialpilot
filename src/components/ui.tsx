import clsx from "clsx";
import type { Platform } from "@prisma/client";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("card", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLOR[platform] }} />
      {PLATFORM_LABEL[platform]}
    </span>
  );
}

const STATUS: Record<string, [string, string]> = {
  DRAFT: ["Borrador", "bg-slate-100 text-slate-600"],
  SCHEDULED: ["Programado", "bg-amber-100 text-amber-800"],
  PUBLISHING: ["Publicando", "bg-blue-100 text-blue-700"],
  PENDING: ["Pendiente", "bg-slate-100 text-slate-600"],
  PUBLISHED: ["Publicado", "bg-emerald-100 text-emerald-700"],
  PARTIAL: ["Parcial", "bg-orange-100 text-orange-700"],
  FAILED: ["Error", "bg-red-100 text-red-700"],
  POSITIVE: ["Positivo", "bg-emerald-100 text-emerald-700"],
  NEUTRAL: ["Neutral", "bg-slate-100 text-slate-600"],
  NEGATIVE: ["Negativo", "bg-red-100 text-red-700"],
};

export function StatusBadge({ status }: { status: string }) {
  const [label, cls] = STATUS[status] ?? [status, "bg-slate-100 text-slate-600"];
  return <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", cls)}>{label}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{children}</div>;
}
