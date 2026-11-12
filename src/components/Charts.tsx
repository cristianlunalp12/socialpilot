"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/utils";

type P = keyof typeof PLATFORM_COLOR;
const nf = new Intl.NumberFormat("es", { notation: "compact" });

export function DailyViewsChart({ data, platforms }: { data: Record<string, number | string>[]; platforms: P[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -10, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => nf.format(v)} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v) => nf.format(Number(v))} />
        <Legend formatter={(v) => PLATFORM_LABEL[v as P] ?? v} />
        {platforms.map((p) => <Area key={p} type="monotone" dataKey={p} stackId="1" stroke={PLATFORM_COLOR[p]} fill={PLATFORM_COLOR[p]} fillOpacity={0.25} />)}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function EngagementByPlatform({ data }: { data: { platform: P; engagementRate: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data.map((d) => ({ ...d, name: PLATFORM_LABEL[d.platform], er: +(d.engagementRate * 100).toFixed(2) }))} margin={{ left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis unit="%" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Bar dataKey="er" name="Engagement" radius={[4, 4, 0, 0]}>
          {data.map((d) => <Cell key={d.platform} fill={PLATFORM_COLOR[d.platform]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const SENT_COLORS = { POSITIVE: "#10b981", NEUTRAL: "#94a3b8", NEGATIVE: "#ef4444" };
const SENT_LABEL = { POSITIVE: "Positivo", NEUTRAL: "Neutral", NEGATIVE: "Negativo" };

export function SentimentDonut({ data }: { data: { POSITIVE: number; NEUTRAL: number; NEGATIVE: number } }) {
  const rows = (Object.keys(SENT_COLORS) as (keyof typeof SENT_COLORS)[]).map((k) => ({ key: k, name: SENT_LABEL[k], value: data[k] })).filter((r) => r.value > 0);
  if (!rows.length) return <p className="py-16 text-center text-sm text-slate-400">Sin comentarios analizados aún</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {rows.map((r) => <Cell key={r.key} fill={SENT_COLORS[r.key]} />)}
        </Pie>
        <Tooltip />
        <Legend />
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
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => nf.format(v)} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
        <Tooltip formatter={(v) => nf.format(Number(v))} />
        <Legend />
        {series.map((s) => <Line key={s.account} dataKey={s.account} stroke={PLATFORM_COLOR[s.platform]} dot={false} strokeWidth={2} connectNulls />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MetricHistory({ data }: { data: { t: string; views: number; likes: number; comments: number; shares: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ left: -10, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="t" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => nf.format(v)} tickLine={false} axisLine={false} />
        <Tooltip />
        <Legend />
        <Line dataKey="views" name="Vistas" stroke="#4f6bed" dot={false} strokeWidth={2} />
        <Line dataKey="likes" name="Likes" stroke="#ec4899" dot={false} strokeWidth={2} />
        <Line dataKey="comments" name="Comentarios" stroke="#f59e0b" dot={false} strokeWidth={2} />
        <Line dataKey="shares" name="Compartidos" stroke="#10b981" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
