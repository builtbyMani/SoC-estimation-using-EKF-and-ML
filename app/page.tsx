"use client";

import { useCallback, useState } from "react";
import Dashboard from "@/components/Dashboard";
import { EstimateResponse } from "@/app/types";

const REQUIRED_COLUMNS = ["temperature", "c_rate", "voltage", "current_soc_true", "time"];
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type UIState = "idle" | "dragging" | "loading" | "error" | "success";

export default function Home() {
  const [state, setState] = useState<UIState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [capacity, setCapacity] = useState<string>("50.0");
  const [fileName, setFileName] = useState<string>("");

  const handleFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setState("loading");
      setErrorMsg("");

      // Quick client-side header check for fast feedback before hitting the backend
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
        const data: EstimateResponse = await res.json();

        if (!res.ok || data.status === "error") {
          setState("error");
          setErrorMsg(data.message || "Estimation failed on the server.");
          return;
        }

        setResult(data);
        setState("success");
      } catch (err) {
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
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
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

  const reset = () => {
    setResult(null);
    setState("idle");
    setErrorMsg("");
    setFileName("");
  };

  if (state === "success" && result) {
    return <Dashboard data={result} onReset={reset} />;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">
          EKF + ML State Estimation
        </div>
        <h1 className="text-2xl font-semibold text-white">Battery SOC Dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          Upload cycling data to estimate State of Charge in real time
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setState("dragging");
        }}
        onDragLeave={() => setState("idle")}
        onDrop={onDrop}
        className={`w-full rounded-xl border-2 border-dashed px-8 py-14 text-center transition ${
          state === "dragging"
            ? "border-accent bg-accent/5"
            : state === "error"
            ? "border-danger/50 bg-danger/5"
            : "border-border bg-surface"
        }`}
      >
        {state === "loading" ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
            <div className="font-mono text-xs text-muted">
              Running EKF estimation on {fileName || "file"}…
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 font-mono text-sm text-muted">
              Drag & drop a CSV file here, or
            </div>
            <label className="inline-block cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
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
        <div className="mt-4 w-full rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 font-mono text-xs text-danger">
          {errorMsg}
        </div>
      )}

      <div className="mt-6 flex w-full items-center justify-between gap-4">
        <label className="flex items-center gap-2 font-mono text-xs text-muted">
          Battery capacity
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-20 rounded border border-border bg-surface px-2 py-1 text-white outline-none focus:border-accent"
          />
          <span>Ah</span>
        </label>
        <span className="font-mono text-[10px] text-muted">
          required columns: temperature, c_rate, voltage, current_soc_true, time
        </span>
      </div>
    </div>
  );
}
