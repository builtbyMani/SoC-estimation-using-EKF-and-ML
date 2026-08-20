"use client";

import { EstimateMetrics } from "@/app/types";

interface MetricsGridProps {
  metrics: EstimateMetrics;
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div
        className={`mt-1 font-mono text-xl tabular-nums ${
          accent ? "text-accent" : "text-white"
        }`}
      >
        {value}
        {unit && <span className="ml-1 text-xs text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export default function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label="Voltage" value={metrics.final_voltage.toFixed(3)} unit="V" />
      <Stat label="Current" value={metrics.final_current.toFixed(2)} unit="A" />
      <Stat label="Temperature" value={metrics.final_temperature.toFixed(1)} unit="°C" />
      <Stat label="MAE" value={metrics.mean_absolute_error.toFixed(3)} unit="pp" />
      <Stat label="RMSE" value={metrics.rmse.toFixed(3)} unit="pp" />
      <Stat label="Max Error" value={metrics.max_error.toFixed(3)} unit="pp" accent />
      <Stat label="Data Points" value={String(metrics.data_points)} />
      <Stat label="Total Time" value={metrics.total_time.toFixed(0)} unit="s" />
      <Stat
        label="Confidence"
        value={(metrics.final_confidence * 100).toFixed(1)}
        unit="%"
        accent
      />
    </div>
  );
}
