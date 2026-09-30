"use client";

import { FeatureSummary } from "@/app/types";
import { Module } from "./ui";
import { ListTree } from "lucide-react";

interface InputFeaturesProps {
  features: Record<string, FeatureSummary>;
}

const ACRONYMS: Record<string, string> = {
  ml: "ML",
  ekf: "EKF",
  soc: "SoC",
  c: "C",
};

function labelize(key: string): string {
  return key
    .split("_")
    .map((w) => ACRONYMS[w.toLowerCase()] ?? w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function InputFeatures({ features }: InputFeaturesProps) {
  const entries = Object.entries(features);
  return (
    <Module
      title="Input telemetry"
      icon={<ListTree className="h-3.5 w-3.5" strokeWidth={2} />}
      bodyClassName="!p-0"
      className="h-full"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["Feature", "Mean", "Min", "Max", "Unit"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-faint"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, f], i) => (
              <tr
                key={key}
                className={`transition hover:bg-white/[0.02] ${
                  i > 0 ? "border-t border-white/[0.04]" : ""
                }`}
              >
                <td className="px-5 py-2.5 text-[13px] font-medium text-dim">
                  {labelize(key)}
                </td>
                <td className="px-5 py-2.5 font-mono text-[13px] tabular-nums text-ink">
                  {f.mean.toFixed(3)}
                </td>
                <td className="px-5 py-2.5 font-mono text-[13px] tabular-nums text-faint">
                  {f.min.toFixed(2)}
                </td>
                <td className="px-5 py-2.5 font-mono text-[13px] tabular-nums text-faint">
                  {f.max.toFixed(2)}
                </td>
                <td className="px-5 py-2.5 font-mono text-[11px] text-faint">
                  {f.unit || "·"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Module>
  );
}
