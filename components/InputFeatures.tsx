"use client";

import { FeatureSummary } from "@/app/types";

interface InputFeaturesProps {
  features: Record<string, FeatureSummary>;
}

function labelize(key: string): string {
  return key
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function InputFeatures({ features }: InputFeaturesProps) {
  const entries = Object.entries(features);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {entries.map(([key, f]) => (
        <div
          key={key}
          className="rounded-lg border border-border bg-surface px-4 py-3"
        >
          <div className="text-[10px] uppercase tracking-widest text-muted">
            {labelize(key)}
          </div>
          <div className="mt-1 font-mono text-sm text-white">
            {f.mean.toFixed(3)}
            {f.unit && <span className="ml-1 text-xs text-muted">{f.unit}</span>}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-muted">
            {f.min.toFixed(2)} – {f.max.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
