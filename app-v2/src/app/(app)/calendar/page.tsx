import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/PageHeader";
import { can, requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { dayKey, formatTime, zonedToUtc } from "@/lib/dates";
import { PLATFORMS } from "@/lib/platforms";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const pad = (n: number) => String(n).padStart(2, "0");

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { workspace, role } = await requireWorkspace();
  const tz = workspace.timezone;
  const today = dayKey(new Date(), tz);
  const param = (await searchParams).month;
  const [y, m] = (param && /^\d{4}-\d{2}$/.test(param) ? param : today.slice(0, 7)).split("-").map(Number);

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // lunes = 0
  const from = zonedToUtc(`${y}-${pad(m)}-01T00:00`, tz)!;
  const to = zonedToUtc(`${m === 12 ? y + 1 : y}-${pad(m === 12 ? 1 : m + 1)}-01T00:00`, tz)!;

  const posts = await db.post.findMany({
    where: {
      workspaceId: workspace.id,
      status: { not: "DRAFT" },
      OR: [{ publishedAt: { gte: from, lt: to } }, { publishedAt: null, scheduledAt: { gte: from, lt: to } }],
    },
    include: { targets: { select: { account: { select: { platform: true } } } } },
    orderBy: { scheduledAt: "asc" },
  });

  const byDay = new Map<string, typeof posts>();
  for (const p of posts) {
    const k = dayKey((p.publishedAt ?? p.scheduledAt)!, tz);
    byDay.set(k, [...(byDay.get(k) ?? []), p]);
  }

  const prev = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  const monthName = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es", { month: "long", timeZone: "UTC" });
  const title = `${monthName[0].toUpperCase()}${monthName.slice(1)} ${y}`;
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const editor = can(role, "EDITOR");

  return (
    <>
      <PageHeader
        title="Calendario"
        description={`Horario de ${tz}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/calendar?month=${prev}`} className="btn-secondary px-3" aria-label="Mes anterior">←</Link>
            <span className="w-40 text-center font-medium">{title}</span>
            <Link href={`/calendar?month=${next}`} className="btn-secondary px-3" aria-label="Mes siguiente">→</Link>
            <Link href="/calendar" className="btn-secondary">Hoy</Link>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7 overflow-hidden rounded-xl border border-slate-200 bg-slate-200 [gap:1px]">
          {WEEKDAYS.map((d) => <div key={d} className="bg-slate-50 px-2 py-2 text-xs font-medium text-slate-500">{d}</div>)}
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} className="bg-slate-50" />;
            const key = `${y}-${pad(m)}-${pad(day)}`;
            const items = byDay.get(key) ?? [];
            const future = key >= today;
            return (
              <div key={key} className="group min-h-28 bg-white p-1.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className={clsx("flex h-6 w-6 items-center justify-center rounded-full text-xs", key === today ? "bg-brand-600 font-semibold text-white" : "text-slate-600")}>{day}</span>
                  {editor && future && (
                    <Link href={`/posts/new?date=${key}`} className="rounded px-1 text-sm text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100" aria-label={`Programar el ${day}`}>+</Link>
                  )}
                </div>
                <ul className="space-y-1">
                  {items.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <Link href={`/posts/${p.id}`} className={clsx("block truncate rounded px-1.5 py-0.5 text-xs", p.status === "SCHEDULED" ? "bg-brand-50 text-brand-700" : p.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700")}>
                        <span className="mr-1 inline-flex gap-0.5 align-middle">
                          {[...new Set(p.targets.map((t) => t.account.platform))].map((pl) => <span key={pl} className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: PLATFORMS[pl].color }} />)}
                        </span>
                        {formatTime((p.publishedAt ?? p.scheduledAt)!, tz)} {p.content}
                      </Link>
                    </li>
                  ))}
                  {items.length > 4 && <li className="px-1.5 text-xs text-slate-500">+{items.length - 4} más</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
