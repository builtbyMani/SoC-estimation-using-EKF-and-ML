"use client";

import { EstimateMetrics } from "@/app/types";
import { Module } from "./ui";
import { Activity } from "lucide-react";

export default function ContextStrip({ metrics }: { metrics: EstimateMetrics }) {
  const rows: [string, string, string?][] = [
    ["Terminal voltage", metrics.final_voltage.toFixed(3), "V"],
    ["Current", metrics.final_current.toFixed(2), "A"],
    ["Temperature", metrics.final_temperature.toFixed(1), "°C"],
    ["Samples", String(metrics.data_points)],
    ["Window", metrics.total_time.toFixed(0), "s"],
  ];
  return (
    <Module
      title="Run context"
      icon={<Activity className="h-3.5 w-3.5" strokeWidth={2} />}
      bodyClassName="!p-0"
      className="h-full"
    >
      <dl>
        {rows.map(([label, value, unit], i) => (
          <div
            key={label}
            className={`flex items-baseline justify-between px-5 py-3 ${
              i > 0 ? "border-t border-white/[0.05]" : ""
            }`}
          >
            <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
              {label}
            </dt>
            <dd className="font-mono text-[15px] tabular-nums text-ink">
              {value}
              {unit && <span className="ml-1 text-[11px] text-faint">{unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Module>
  );
}
