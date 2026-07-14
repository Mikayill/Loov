"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

interface Point { label: string; value: number; orders: number; ts: number }
interface Data {
  range: string;
  series: Point[];
  rangeTotal: number;
  rangeOrders: number;
  deltaPct: number | null;
  avgOrder: number;
  peak: { label: string; value: number } | null;
}

const RANGES: { key: string; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All time" },
];

const TEAL = "#5E9E8C";
// viewBox geometry
const W = 1000, H = 340, L = 56, R = 16, T = 20, Bt = 40;
const plotW = W - L - R, plotH = H - T - Bt;

export default function RevenueChart() {
  const [range, setRange] = useState("week");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/revenue?range=${range}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .finally(() => setLoading(false));
  }, [range]);

  const series = data?.series ?? [];
  const n = series.length;
  const maxV = Math.max(1, ...series.map((p) => p.value));
  const niceMax = niceCeil(maxV);

  const x = (i: number) => (n <= 1 ? L + plotW / 2 : L + (i / (n - 1)) * plotW);
  const y = (v: number) => T + plotH - (v / niceMax) * plotH;

  const linePath = series.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const areaPath = n > 0
    ? `${linePath} L ${x(n - 1).toFixed(1)} ${(T + plotH).toFixed(1)} L ${x(0).toFixed(1)} ${(T + plotH).toFixed(1)} Z`
    : "";

  // horizontal grid values
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax);
  // thin x labels to ~8
  const labelStep = Math.ceil(n / 8);

  function pointAt(clientX: number) {
    if (!svgRef.current || n === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - L) / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }
  function onMove(e: React.MouseEvent) {
    pointAt(e.clientX);
  }
  function onTouch(e: React.TouchEvent) {
    if (e.touches[0]) pointAt(e.touches[0].clientX);
  }

  const hp = hover !== null ? series[hover] : null;
  const delta = data?.deltaPct ?? null;
  const up = (delta ?? 0) >= 0;

  return (
    <div className="bg-white rounded-card border border-line p-5 sm:p-6">
      {/* Header: headline number + delta + range filters */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-1">
            Revenue · {RANGES.find((r) => r.key === range)?.label}
          </p>
          <div className="flex items-end gap-3 flex-wrap">
            <span className="text-4xl font-extrabold text-ink leading-none">
              {data ? formatPrice(data.rangeTotal) : "—"}
            </span>
            {delta !== null && (
              <span className={`inline-flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${up ? "bg-accent-soft text-accent-deep" : "bg-danger-soft text-danger"}`}>
                {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
                <span className="font-semibold opacity-70">vs prev</span>
              </span>
            )}
          </div>
          {data && (
            <p className="text-xs text-ink-muted mt-1.5">
              {data.rangeOrders} orders · avg {formatPrice(Math.round(data.avgOrder))}
              {data.peak && <> · peak {formatPrice(data.peak.value)} ({data.peak.label})</>}
            </p>
          )}
        </div>

        <div className="flex gap-1 bg-canvas rounded-control p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                range === r.key ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink-soft"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <div className="w-7 h-7 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[300px] sm:h-[360px] select-none"
          style={{ touchAction: "none" }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onTouchStart={onTouch}
          onTouchMove={onTouch}
          role="img"
          aria-label="Revenue over time"
        >
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TEAL} stopOpacity="0.28" />
              <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* grid + y labels (recessive) */}
          {grid.map((g, i) => (
            <g key={i}>
              <line x1={L} y1={y(g)} x2={W - R} y2={y(g)} stroke="#EDE7DF" strokeWidth={1} />
              <text x={L - 10} y={y(g) + 4} textAnchor="end" fontSize="13" fill="#9A8E88" fontWeight="600">
                {shortMoney(g)}
              </text>
            </g>
          ))}

          {/* x labels (thinned) */}
          {series.map((p, i) => (i % labelStep === 0 || i === n - 1) && (
            <text key={i} x={x(i)} y={H - 12} textAnchor="middle" fontSize="12.5" fill="#9A8E88" fontWeight="600">
              {p.label}
            </text>
          ))}

          {/* area + line */}
          {n > 0 && <path d={areaPath} fill="url(#revFill)" />}
          {n > 0 && <path d={linePath} fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}

          {/* hover crosshair + marker */}
          {hp && (
            <g>
              <line x1={x(hover!)} y1={T} x2={x(hover!)} y2={T + plotH} stroke={TEAL} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
              <circle cx={x(hover!)} cy={y(hp.value)} r={6} fill="white" stroke={TEAL} strokeWidth={3} />
            </g>
          )}
        </svg>

        {/* tooltip */}
        {hp && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none bg-ink text-white rounded-control px-3 py-2 shadow-lg whitespace-nowrap"
            style={{ left: `${(x(hover!) / W) * 100}%`, top: `${(y(hp.value) / H) * 100}%`, marginTop: -10 }}
          >
            <p className="text-[11px] font-bold opacity-70">{hp.label}</p>
            <p className="text-sm font-extrabold">{formatPrice(hp.value)}</p>
            <p className="text-[10px] opacity-70">{hp.orders} {hp.orders === 1 ? "order" : "orders"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Round a max up to a clean number so grid labels read nicely. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function shortMoney(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k ₾`;
  return `${Math.round(v)} ₾`;
}
