"use client";

import { EstimateResponse } from "@/app/types";
import SOCGauge from "./SOCGauge";
import MetricsGrid from "./MetricsGrid";
import InputFeatures from "./InputFeatures";
import SOCTrendChart from "./SOCTrendChart";

interface DashboardProps {
  data: EstimateResponse;
  onReset: () => void;
}

export default function Dashboard({ data, onReset }: DashboardProps) {
  const { metrics, results, input_features, ml_correction } = data;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">SOC Estimation Results</h1>
          <p className="mt-1 font-mono text-xs text-muted">
            {metrics.data_points} samples · {metrics.total_time.toFixed(0)}s window
          </p>
        </div>
        <button
          onClick={onReset}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
        >
          ← New Upload
        </button>
      </div>

      <div
        className={`mb-6 flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-xs ${
          ml_correction.active
            ? "border-accent/30 bg-accent/5 text-accent"
            : "border-warning/30 bg-warning/5 text-warning"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${ml_correction.active ? "bg-accent" : "bg-warning"}`} />
        {ml_correction.active
          ? `EKF + ML residual correction active${
              ml_correction.cv_mae != null ? ` — CV MAE ${(ml_correction.cv_mae * 100).toFixed(2)}pp` : ""
            }`
          : "EKF-only mode — no trained ML correction model found on server"}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface py-8">
          <SOCGauge soc={metrics.final_soc_estimated} confidence={metrics.final_confidence} />
        </div>

        <div className="flex flex-col gap-6">
          <MetricsGrid metrics={metrics} />
        </div>
      </div>

      <div className="mt-6">
        <SOCTrendChart results={results} />
      </div>

      <div className="mt-6">
        <div className="mb-3 text-[10px] uppercase tracking-widest text-muted">
          Input Feature Summary
        </div>
        <InputFeatures features={input_features} />
      </div>
    </div>
  );
}
