"use client";

import { EstimateResponse } from "@/app/types";
import SOCGauge from "./SOCGauge";
import QualityMetrics from "./QualityMetrics";
import ContextStrip from "./ContextStrip";
import InputFeatures from "./InputFeatures";
import SOCTrendChart from "./SOCTrendChart";
import { Module, Wordmark, StatusPill } from "./ui";
import { RotateCcw, Gauge } from "lucide-react";

interface DashboardProps {
  data: EstimateResponse;
  fileName?: string;
  onReset: () => void;
}

export default function Dashboard({ data, fileName, onReset }: DashboardProps) {
  const { metrics, results, input_features, ml_correction } = data;
  const socPct = metrics.final_soc_estimated * 100;
  const confPct = metrics.final_confidence * 100;

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
      {/* header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-5">
          <Wordmark />
          <div className="hidden h-8 w-px bg-white/10 sm:block" />
          <div className="hidden sm:block">
            <div className="font-mono text-[11px] text-dim">
              {metrics.data_points} samples · {metrics.total_time.toFixed(0)}s window
            </div>
            {fileName && (
              <div className="mt-0.5 max-w-[280px] truncate font-mono text-[10px] text-faint">
                {fileName}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill tone={ml_correction.active ? "ok" : "warn"}>
            {ml_correction.active
              ? `ML correction active · CV MAE ${((ml_correction.cv_mae ?? 0) * 100).toFixed(2)}pp`
              : "EKF-only mode"}
          </StatusPill>
          <button
            onClick={onReset}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] font-medium text-dim transition hover:border-accent/50 hover:text-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            New upload
          </button>
        </div>
      </header>

      {/* hero */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Module
          title="State of charge · final"
          icon={<Gauge className="h-3.5 w-3.5" strokeWidth={2} />}
          className="lg:col-span-5 animate-fade-up [animation-delay:80ms]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[64px] font-medium leading-none tabular-nums text-ink">
                {socPct.toFixed(1)}
                <span className="ml-1 align-top font-mono text-lg text-faint">%</span>
              </div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.24em] text-faint">
                estimated SoC
              </div>
            </div>
            <SOCGauge soc={metrics.final_soc_estimated} />
          </div>
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                Confidence
              </span>
              <span className="font-mono text-sm tabular-nums text-accent">
                {confPct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-accent shadow-[0_0_12px_rgba(163,230,53,0.6)] transition-[width] duration-1000"
                style={{ width: `${confPct.toFixed(1)}%` }}
              />
            </div>
          </div>
        </Module>

        <div className="lg:col-span-7 animate-fade-up [animation-delay:140ms]">
          <QualityMetrics metrics={metrics} />
        </div>
      </div>

      {/* chart */}
      <div className="mt-4 animate-fade-up [animation-delay:200ms]">
        <SOCTrendChart results={results} />
      </div>

      {/* bottom */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 animate-fade-up [animation-delay:260ms]">
        <div className="lg:col-span-4">
          <ContextStrip metrics={metrics} />
        </div>
        <div className="lg:col-span-8">
          <InputFeatures features={input_features} />
        </div>
      </div>

      <footer className="mt-8 flex items-center justify-between border-t border-white/[0.06] py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        <span>demo runs on synthetic cycling data</span>
        <span className="hidden sm:block">ekf + lightgbm</span>
      </footer>
    </div>
  );
}
