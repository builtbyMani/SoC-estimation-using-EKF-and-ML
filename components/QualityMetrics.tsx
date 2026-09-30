"use client";

import { EstimateMetrics } from "@/app/types";
import { Module } from "./ui";
import { Crosshair } from "lucide-react";

function Cell({
  label,
  value,
  unit,
  caption,
  tone = "ink",
}: {
  label: string;
  value: string;
  unit?: string;
  caption: string;
  tone?: "ink" | "accent";
}) {
  return (
    <div className="bg-surface px-6 py-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
        {label}
      </div>
      <div
        className={`mt-2 font-mono text-[34px] font-medium leading-none tabular-nums ${
          tone === "accent" ? "text-accent" : "text-ink"
        }`}
      >
        {value}
        {unit && (
          <span className="ml-1.5 align-baseline font-mono text-[13px] text-faint">
            {unit}
          </span>
        )}
      </div>
      <div className="mt-2 text-[11px] text-faint">{caption}</div>
    </div>
  );
}

export default function QualityMetrics({ metrics }: { metrics: EstimateMetrics }) {
  return (
    <Module
      title="Estimate quality"
      icon={<Crosshair className="h-3.5 w-3.5" strokeWidth={2} />}
      bodyClassName="!p-0"
      className="h-full"
    >
      <div className="grid grid-cols-2 gap-px bg-white/[0.06]">
        <Cell
          label="MAE"
          value={metrics.mean_absolute_error.toFixed(3)}
          unit="pp"
          caption="mean absolute error"
          tone="accent"
        />
        <Cell
          label="RMSE"
          value={metrics.rmse.toFixed(3)}
          unit="pp"
          caption="root mean square error"
        />
        <Cell
          label="Max error"
          value={metrics.max_error.toFixed(3)}
          unit="pp"
          caption="worst single timestep"
        />
        <Cell
          label="Confidence"
          value={(metrics.final_confidence * 100).toFixed(1)}
          unit="%"
          caption="final estimate certainty"
          tone="accent"
        />
      </div>
    </Module>
  );
}
