"use client";

interface SOCGaugeProps {
  soc: number; // 0-1
  confidence: number; // 0-1
}

function socColor(soc: number): string {
  if (soc < 0.2) return "#f0546a"; // danger
  if (soc < 0.45) return "#f5b942"; // warning
  return "#3ddc97"; // accent
}

export default function SOCGauge({ soc, confidence }: SOCGaugeProps) {
  const pct = Math.max(0, Math.min(1, soc));
  const radius = 90;
  const stroke = 14;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // 270-degree arc (like an instrument gauge), starting at -225deg
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const dashOffset = arcLength - pct * arcLength;
  const color = socColor(pct);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
        <svg
          height={radius * 2}
          width={radius * 2}
          className="-rotate-[225deg]"
        >
          <circle
            stroke="#232b36"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-4xl font-semibold tabular-nums"
            style={{ color }}
          >
            {(pct * 100).toFixed(1)}
          </span>
          <span className="text-xs tracking-widest text-muted">% SOC</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 font-mono text-xs text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        confidence {(confidence * 100).toFixed(1)}%
      </div>
    </div>
  );
}
