"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EstimateResults } from "@/app/types";

interface SOCTrendChartProps {
  results: EstimateResults;
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
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 text-[10px] uppercase tracking-widest text-muted">
        SOC Trend — Estimated vs. True
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#232b36" />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            stroke="#8895a7"
            tick={{ fontSize: 11, fontFamily: "monospace" }}
            tickFormatter={(v: number) => v.toFixed(0)}
            label={{ value: "time (s)", position: "insideBottom", offset: -2, fill: "#8895a7", fontSize: 10 }}
          />
          <YAxis
            stroke="#8895a7"
            tick={{ fontSize: 11, fontFamily: "monospace" }}
            domain={[0, 100]}
            label={{ value: "SOC (%)", angle: -90, position: "insideLeft", fill: "#8895a7", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#121821",
              border: "1px solid #232b36",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "monospace",
            }}
            labelStyle={{ color: "#8895a7" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
          <Line
            type="monotone"
            dataKey="estimated"
            name="Estimated (EKF+ML)"
            stroke="#3ddc97"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="true"
            name="Ground Truth"
            stroke="#8895a7"
            strokeDasharray="4 3"
            dot={false}
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
