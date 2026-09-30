"use client";

interface SOCGaugeProps {
  soc: number; // 0-1
}

function socColor(soc: number): string {
  if (soc < 0.2) return "#fb7185"; // danger
  if (soc < 0.45) return "#fbbf24"; // warning
  return "#a3e635"; // volt
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export default function SOCGauge({ soc }: SOCGaugeProps) {
  const pct = clamp(soc);
  const color = socColor(pct);

  const R = 76; // outer radius of track
  const STROKE = 12;
  const nr = R - STROKE / 2;
  const C = 2 * Math.PI * nr;
  const ARC = 0.75;
  const arcLen = C * ARC;
  const dashOffset = arcLen - pct * arcLen;

  const PAD = 18;
  const S = (R + PAD) * 2;
  const c = S / 2;

  const N_TICKS = 28;
  const polar = (r: number, deg: number): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    return [c + r * Math.cos(rad), c + r * Math.sin(rad)];
  };
  const activeAngle = 135 + pct * 270;

  return (
    <div className="relative" style={{ width: S, height: S }}>
      <svg width={S} height={S}>
        {/* tick ring */}
        {Array.from({ length: N_TICKS }).map((_, i) => {
          const deg = 135 + i * (270 / (N_TICKS - 1));
          const major = i % 9 === 0;
          const [x1, y1] = polar(nr + 7, deg);
          const [x2, y2] = polar(nr + (major ? 15 : 12), deg);
          const active = deg <= activeAngle + 0.5;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={active ? color : "#2b3644"}
              strokeWidth={major ? 2 : 1.2}
              strokeLinecap="round"
              opacity={active ? 0.9 : 0.7}
            />
          );
        })}
        {/* track + value arc, rotated so the 270° arc starts at 135° */}
        <g transform={`rotate(135 ${c} ${c})`}>
          <circle
            cx={c}
            cy={c}
            r={nr}
            fill="transparent"
            stroke="#161e29"
            strokeWidth={STROKE}
            strokeDasharray={`${arcLen} ${C}`}
            strokeLinecap="round"
          />
          <circle
            cx={c}
            cy={c}
            r={nr}
            fill="transparent"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={`${arcLen} ${C}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1), stroke 0.5s ease",
              filter: `drop-shadow(0 0 7px ${color}66)`,
            }}
          />
        </g>
      </svg>
    </div>
  );
}
