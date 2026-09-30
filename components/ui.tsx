"use client";

import { ReactNode } from "react";

/** Titled instrument module: hairline border, header strip, quiet body. */
export function Module({
  title,
  icon,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-border/90 bg-surface/90 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-sm ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-dim">
          {icon && <span className="text-accent">{icon}</span>}
          {title}
        </span>
        {right}
      </header>
      <div className={`p-5 sm:p-6 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** Wordmark used in both screens. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-mono text-sm font-semibold text-black shadow-[0_0_24px_-4px_rgba(163,230,53,0.7)]">
        S
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[15px] font-bold tracking-tight text-ink">
            SoC<span className="text-accent">·</span>EST
          </span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.28em] text-faint">
            Estimation console
          </span>
        </span>
      )}
    </span>
  );
}

/** Small status pill with pulsing dot. */
export function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "off";
  children: ReactNode;
}) {
  const dot =
    tone === "ok"
      ? "bg-accent animate-pulse-dot"
      : tone === "warn"
      ? "bg-warning"
      : "bg-faint";
  const text =
    tone === "ok"
      ? "text-accent"
      : tone === "warn"
      ? "text-warning"
      : "text-faint";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
