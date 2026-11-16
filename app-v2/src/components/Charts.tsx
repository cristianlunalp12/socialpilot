"use client";
import type { Platform } from "@prisma/client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PLATFORMS } from "@/lib/platforms";
import { compact, number, percent } from "@/lib/format";

const AXIS = { stroke: "#94a3b8", fontSize: 12, tickLine: false, axisLine: false } as const;
const shortDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" });

export function FollowersChart({ data, platforms }: { data: ({ date: string } & Partial<Record<Platform, number>>)[]; platforms: Platform[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={32} {...AXIS} />
          <YAxis tickFormatter={(v) => compact(v)} width={48} {...AXIS} />
          <Tooltip
            labelFormatter={(d) => shortDate(String(d))}
            formatter={(v, name) => [number(Number(v)), PLATFORMS[name as Platform]?.label ?? name]}
            contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 13 }}
          />
          <Legend formatter={(name) => <span className="text-sm text-slate-700">{PLATFORMS[name as Platform]?.label}</span>} iconType="plainline" />
          {platforms.map((p) => (
            <Line key={p} type="monotone" dataKey={p} stroke={PLATFORMS[p].color} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EngagementByPlatform({ data }: { data: { platform: Platform; impressions: number; engagements: number }[] }) {
  const rows = data.map((d) => ({
    name: PLATFORMS[d.platform].label,
    platform: d.platform,
    rate: d.impressions ? d.engagements / d.impressions : 0,
    engagements: d.engagements,
  }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} barCategoryGap={10}>
          <CartesianGrid stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => percent(v, 0)} {...AXIS} />
          <YAxis type="category" dataKey="name" width={80} {...AXIS} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            formatter={(v, _n, item) => [`${percent(Number(v))} (${number(item.payload.engagements)} interacciones)`, "Tasa de interacción"]}
            contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 13 }}
          />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={28}
            shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: { platform: Platform } }) => (
              <rect x={props.x} y={props.y} width={Math.max(0, props.width ?? 0)} height={props.height} rx={4} fill={props.payload ? PLATFORMS[props.payload.platform].color : "#999"} />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
