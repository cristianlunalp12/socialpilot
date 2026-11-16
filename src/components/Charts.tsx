"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/utils";

type P = keyof typeof PLATFORM_COLOR;
const nf = new Intl.NumberFormat("es", { notation: "compact" });

// Estilos para fondo oscuro, a juego con la landing.
const GRID = "rgba(255,255,255,0.07)";
const TICK = { fontSize: 11, fill: "#9896ad" };
const TOOLTIP = {
  contentStyle: { background: "#14131f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#e6e4f1", fontSize: 12 },
  labelStyle: { color: "#f6f5fb", fontWeight: 600 },
  itemStyle: { color: "#cfcde0" },
  cursor: { fill: "rgba(139,92,246,0.08)", stroke: "rgba(139,92,246,0.4)" },
};
const LEGEND = { wrapperStyle: { fontSize: 12, color: "#b3b1c6" } };

export function DailyViewsChart({ data, platforms }: { data: Record<string, number | string>[]; platforms: P[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -10, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={TICK} tickFormatter={(v) => nf.format(v)} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP} formatter={(v) => nf.format(Number(v))} />
        <Legend {...LEGEND} formatter={(v) => PLATFORM_LABEL[v as P] ?? v} />
        {platforms.map((p) => <Area key={p} type="monotone" dataKey={p} stackId="1" stroke={PLATFORM_COLOR[p]} fill={PLATFORM_COLOR[p]} fillOpacity={0.25} />)}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function EngagementByPlatform({ data }: { data: { platform: P; engagementRate: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data.map((d) => ({ ...d, name: PLATFORM_LABEL[d.platform], er: +(d.engagementRate * 100).toFixed(2) }))} margin={{ left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis unit="%" tick={TICK} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP} formatter={(v) => `${v}%`} />
        <Bar dataKey="er" name="Engagement" radius={[8, 8, 0, 0]} maxBarSize={48}>
          {data.map((d) => <Cell key={d.platform} fill={PLATFORM_COLOR[d.platform]} fillOpacity={0.75} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const SENT_COLORS = { POSITIVE: "#34d399", NEUTRAL: "#6b6985", NEGATIVE: "#f87171" };
const SENT_LABEL = { POSITIVE: "Positivo", NEUTRAL: "Neutral", NEGATIVE: "Negativo" };

export function SentimentDonut({ data }: { data: { POSITIVE: number; NEUTRAL: number; NEGATIVE: number } }) {
  const rows = (Object.keys(SENT_COLORS) as (keyof typeof SENT_COLORS)[]).map((k) => ({ key: k, name: SENT_LABEL[k], value: data[k] })).filter((r) => r.value > 0);
  if (!rows.length) return <p className="py-16 text-center text-sm text-slate-400">Sin comentarios analizados aún</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
          {rows.map((r) => <Cell key={r.key} fill={SENT_COLORS[r.key]} />)}
        </Pie>
        <Tooltip {...TOOLTIP} />
        <Legend {...LEGEND} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FollowersChart({ series }: { series: { account: string; platform: P; series: { date: string; followers: number }[] }[] }) {
  const dates = [...new Set(series.flatMap((s) => s.series.map((x) => x.date)))].sort();
  const data = dates.map((date) => Object.fromEntries([["date", date.slice(5)], ...series.map((s) => [s.account, s.series.find((x) => x.date === date)?.followers ?? null])]));
  if (!dates.length) return <p className="py-16 text-center text-sm text-slate-400">Los seguidores se registran diariamente</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -10, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={TICK} tickFormatter={(v) => nf.format(v)} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
        <Tooltip {...TOOLTIP} formatter={(v) => nf.format(Number(v))} />
        <Legend {...LEGEND} />
        {series.map((s) => <Line key={s.account} dataKey={s.account} stroke={PLATFORM_COLOR[s.platform]} dot={false} strokeWidth={2} connectNulls />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MetricHistory({ data }: { data: { t: string; views: number; likes: number; comments: number; shares: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ left: -10, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="t" tick={{ ...TICK, fontSize: 10 }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={TICK} tickFormatter={(v) => nf.format(v)} tickLine={false} axisLine={false} />
        <Tooltip {...TOOLTIP} />
        <Legend {...LEGEND} />
        <Line dataKey="views" name="Vistas" stroke="#8b5cf6" dot={false} strokeWidth={2} />
        <Line dataKey="likes" name="Likes" stroke="#ff7a85" dot={false} strokeWidth={2} />
        <Line dataKey="comments" name="Comentarios" stroke="#f59e0b" dot={false} strokeWidth={2} />
        <Line dataKey="shares" name="Compartidos" stroke="#10b981" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
