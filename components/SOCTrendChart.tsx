"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EstimateResults } from "@/app/types";
import { Module } from "./ui";
import { TrendingUp } from "lucide-react";

interface SOCTrendChartProps {
  results: EstimateResults;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b1118]/95 px-3.5 py-2.5 font-mono text-[11px] shadow-2xl backdrop-blur">
      <div className="mb-1.5 text-faint">t = {Number(label).toFixed(0)} s</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 tabular-nums">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: p.stroke }}
          />
          <span className="text-dim">{p.name}</span>
          <span className="ml-auto pl-4 text-ink">{Number(p.value).toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

function LegendDot({ color, dashed = false }: { color: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
      <span
        className="inline-block h-0 w-5 rounded-full"
        style={{
          borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}`,
        }}
      />
    </span>
  );
}

export default function SOCTrendChart({ results }: SOCTrendChartProps) {
  const data = results.time
    .map((t, i) => ({
      time: t,
      estimated: +(results.soc_estimated[i] * 100).toFixed(2),
      true: +(results.soc_true[i] * 100).toFixed(2),
    }))
    .sort((a, b) => a.time - b.time);

  return (
    <Module
      title="SoC trend · estimated vs. true"
      icon={<TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />}
      bodyClassName="!px-2 !pb-2 !pt-4 sm:!px-4"
      right={
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <LegendDot color="#a3e635" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
              Estimated
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <LegendDot color="#5d6b7e" dashed />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
              Ground truth
            </span>
          </span>
        </span>
      }
    >
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="estFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a3e635" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#141c26" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickCount={6}
            stroke="#2b3644"
            tick={{ fontSize: 10, fill: "#5d6b7e", fontFamily: "var(--font-plex)" }}
            tickFormatter={(v: number) => `${v.toFixed(0)}s`}
            axisLine={{ stroke: "#2b3644" }}
            tickLine={false}
          />
          <YAxis
            stroke="#2b3644"
            tick={{ fontSize: 10, fill: "#5d6b7e", fontFamily: "var(--font-plex)" }}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2b3644", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="estimated"
            name="Estimated (EKF+ML)"
            stroke="#a3e635"
            strokeWidth={2}
            fill="url(#estFill)"
            dot={false}
            activeDot={{ r: 3.5, fill: "#a3e635", stroke: "#06090d", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="true"
            name="Ground truth"
            stroke="#5d6b7e"
            strokeDasharray="5 4"
            dot={false}
            strokeWidth={1.5}
            activeDot={{ r: 3, fill: "#5d6b7e", stroke: "#06090d", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Module>
  );
}
