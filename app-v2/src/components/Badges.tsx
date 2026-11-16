import type { Platform, PostStatus } from "@prisma/client";
import clsx from "clsx";
import { PLATFORMS } from "@/lib/platforms";

export function PlatformBadge({ platform, handle }: { platform: Platform; handle?: string }) {
  const p = PLATFORMS[platform];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
      <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
      {p.label}{handle ? <span className="text-slate-500">@{handle}</span> : null}
    </span>
  );
}

const STATUS: Record<PostStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Borrador", cls: "bg-slate-100 text-slate-700" },
  SCHEDULED: { label: "Programada", cls: "bg-brand-50 text-brand-700" },
  PUBLISHING: { label: "Publicando", cls: "bg-amber-50 text-amber-800" },
  PUBLISHED: { label: "Publicada", cls: "bg-emerald-50 text-emerald-800" },
  PARTIAL: { label: "Publicada con errores", cls: "bg-amber-50 text-amber-800" },
  FAILED: { label: "Falló", cls: "bg-red-50 text-red-700" },
};

export const STATUS_LABEL = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.label])) as Record<PostStatus, string>;

export function StatusBadge({ status }: { status: PostStatus }) {
  const s = STATUS[status];
  return <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", s.cls)}>{s.label}</span>;
}
