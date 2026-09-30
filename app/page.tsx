"use client";

import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import {
  FileUp,
  Cpu,
  Sigma,
  BatteryCharging,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Wordmark, StatusPill } from "@/components/ui";
import Dashboard from "@/components/Dashboard";
import { EstimateResponse } from "@/app/types";

const REQUIRED_COLUMNS = ["temperature", "c_rate", "voltage", "current_soc_true", "time"];
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type UIState = "idle" | "dragging" | "loading" | "error" | "success";

const PIPELINE = [
  { icon: FileUp, title: "CSV in", desc: "cycling telemetry" },
  { icon: Cpu, title: "EKF", desc: "physics fusion" },
  { icon: Sigma, title: "ML residual", desc: "LightGBM correction" },
  { icon: BatteryCharging, title: "SoC out", desc: "clipped 0–100%" },
];

const LOAD_STAGES = ["Parsing CSV", "Running EKF", "Applying ML correction"];

function CornerTicks() {
  const c = "absolute h-3.5 w-3.5 border-accent/70";
  return (
    <>
      <span className={`${c} left-3 top-3 border-l-2 border-t-2`} />
      <span className={`${c} right-3 top-3 border-r-2 border-t-2`} />
      <span className={`${c} bottom-3 left-3 border-b-2 border-l-2`} />
      <span className={`${c} bottom-3 right-3 border-b-2 border-r-2`} />
    </>
  );
}

export default function Home() {
  const [state, setState] = useState<UIState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [capacity, setCapacity] = useState<string>("50.0");
  const [fileName, setFileName] = useState<string>("");
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [loadStage, setLoadStage] = useState(0);
  const dragDepth = useRef(0);

  useEffect(() => {
    let alive = true;
    fetch(`${BACKEND_URL}/health`, { cache: "no-store" })
      .then((r) => alive && setBackendOk(r.ok))
      .catch(() => alive && setBackendOk(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (state !== "loading") {
      setLoadStage(0);
      return;
    }
    const id = setInterval(() => setLoadStage((s) => Math.min(s + 1, LOAD_STAGES.length - 1)), 1400);
    return () => clearInterval(id);
  }, [state]);

  const handleFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setState("loading");
      setErrorMsg("");

      try {
        const head = (await file.slice(0, 4096).text()).split("\n")[0];
        const headerCols = head.split(",").map((c) => c.trim());
        const missing = REQUIRED_COLUMNS.filter((c) => !headerCols.includes(c));
        if (missing.length > 0) {
          setState("error");
          setErrorMsg(`CSV is missing required columns: ${missing.join(", ")}`);
          return;
        }
      } catch {
        // fall through, let backend validate
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("capacity", capacity || "50.0");

        const res = await fetch(`${BACKEND_URL}/estimate`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok || data.status === "error") {
          setState("error");
          setErrorMsg(data.message || "Estimation failed on the server.");
          return;
        }

        // Hand the result to the dashboard.
        setResult(data);
        setState("success");
      } catch {
        setState("error");
        setErrorMsg(
          `Could not reach backend at ${BACKEND_URL}. Is the Flask server running?`
        );
      }
    },
    [capacity]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragDepth.current = 0;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
      else setState("idle");
    },
    [handleFile]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (state === "success" && result) {
    return (
      <Dashboard
        data={result}
        fileName={fileName}
        onReset={() => {
          setResult(null);
          setFileName("");
          setState("idle");
          setErrorMsg("");
        }}
      />
    );
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 sm:px-8">
      {/* top bar */}
      <header className="flex items-center justify-between py-5">
        <Wordmark />
        <StatusPill tone={backendOk == null ? "off" : backendOk ? "ok" : "warn"}>
          {backendOk == null
            ? "probing backend"
            : backendOk
            ? "backend online"
            : "backend offline"}
        </StatusPill>
      </header>

      {/* main */}
      <main className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        {/* pitch */}
        <div className="animate-fade-up">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
            <span className="h-px w-8 bg-accent/60" />
            EKF + ML state estimation
          </div>
          <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl">
            Stop guessing
            <br />
            state of charge<span className="text-accent">.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-dim">
            Upload cycling data. An Extended Kalman Filter fuses the physics,
            then a LightGBM model corrects the residual error it misses.
          </p>

          {/* pipeline */}
          <div className="mt-8">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-stretch sm:gap-1.5">
              {PIPELINE.map((s, i) => (
                <Fragment key={s.title}>
                  <div className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3">
                    <s.icon className="h-4 w-4 text-accent" strokeWidth={2} />
                    <div className="mt-2 text-[13px] font-semibold text-ink">{s.title}</div>
                    <div className="mt-0.5 font-mono text-[10px] leading-snug text-faint">
                      {s.desc}
                    </div>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight className="hidden h-3.5 w-3.5 self-center text-faint sm:block" strokeWidth={2} />
                  )}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="mt-8 inline-flex items-center gap-3 rounded-lg border border-white/[0.07] bg-black/30 px-4 py-2.5 font-mono text-[12px] text-dim">
            <span className="text-faint">final_soc</span>
            <span className="text-faint">=</span>
            <span className="text-ink">clip(ekf_soc + correction, 0, 1)</span>
          </div>
        </div>

        {/* intake */}
        <div
          className="animate-fade-up [animation-delay:120ms]"
        >
          <div className="relative rounded-2xl border border-border/90 bg-surface/90 p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-10">
            <CornerTicks />
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-faint">
                Sample intake
              </span>
              {state === "error" && (
                <button
                  onClick={() => {
                    setState("idle");
                    setErrorMsg("");
                  }}
                  className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim transition hover:text-accent"
                >
                  <RotateCcw className="h-3 w-3" /> reset
                </button>
              )}
            </div>

            <div
              onDragEnter={(e) => {
                e.preventDefault();
                dragDepth.current += 1;
                setState("dragging");
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                e.preventDefault();
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (dragDepth.current === 0 && state === "dragging") setState("idle");
              }}
              onDrop={onDrop}
              className={`relative mt-3 flex min-h-[220px] flex-col items-center justify-center rounded-xl border px-6 py-10 text-center transition-all duration-200 ${
                state === "dragging"
                  ? "border-accent bg-accent/[0.06] shadow-[inset_0_0_40px_rgba(163,230,53,0.08)]"
                  : state === "error"
                  ? "border-danger/50 bg-danger/[0.04]"
                  : "border-dashed border-white/15 bg-black/20 hover:border-white/25"
              }`}
            >
              {state === "loading" ? (
                <div className="flex flex-col items-center">
                  <div className="flex h-8 items-end gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 origin-bottom animate-eq rounded-full bg-accent"
                        style={{ height: 28, animationDelay: `${i * 0.12}s` }}
                      />
                    ))}
                  </div>
                  <div className="mt-4 font-mono text-xs text-dim">
                    {LOAD_STAGES[loadStage]}
                    <span className="animate-pulse">…</span>
                  </div>
                  <div className="mt-1 max-w-[240px] truncate font-mono text-[10px] text-faint">
                    {fileName}
                  </div>
                </div>
              ) : (
                <>
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl border transition ${
                      state === "dragging"
                        ? "border-accent/50 bg-accent/10 text-accent"
                        : "border-white/10 bg-white/[0.03] text-dim"
                    }`}
                  >
                    <FileUp className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <p className="mt-4 text-[15px] font-medium text-ink">
                    {state === "dragging" ? "Drop it, we'll take it from here" : "Drag & drop your CSV"}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-faint">
                    or
                  </p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_28px_-6px_rgba(163,230,53,0.8)] transition hover:brightness-110 active:scale-[0.98]">
                    Browse files
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={onFileInput}
                    />
                  </label>
                </>
              )}
            </div>

            {state === "error" && (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger/[0.06] px-4 py-3 font-mono text-[11px] leading-relaxed text-danger">
                {errorMsg}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                  Capacity
                </span>
                <span className="flex items-center rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 focus-within:border-accent/60">
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-16 bg-transparent font-mono text-sm text-ink outline-none"
                  />
                  <span className="font-mono text-[11px] text-faint">Ah</span>
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_COLUMNS.map((c) => (
                  <code
                    key={c}
                    className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-dim"
                  >
                    {c}
                  </code>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-faint">
            demo runs on synthetic cycling data
          </p>
        </div>
      </main>

      <footer className="flex items-center justify-between border-t border-white/[0.06] py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        <span>physics gets you close · ml gets you home</span>
        <span className="hidden sm:block">ekf + lightgbm</span>
      </footer>
    </div>
  );
}
