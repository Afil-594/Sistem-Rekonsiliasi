"use client";

import { useId, useMemo, useState } from "react";
import { ChartSection } from "@/components/ui/ChartSection";

const CHART_NAYY = "var(--navy)";
const CHART_EPSON = "var(--epson-yellow)";

type DatePoint = { date: string; count: number };

const TREND_W = 640;
const TREND_H = 140;
const TREND_PAD = 8;

/**
 * 14-day discrepancy trend (area + line), client-enhanced hover + tooltips.
 */
export function SupervisorDateTrendChart({ points }: { points: DatePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();
  const gradId = `sup-trend-fill-${gid.replace(/:/g, "")}`;

  const chart = useMemo(() => {
    const w = TREND_W;
    const h = TREND_H;
    const padX = TREND_PAD;
    const padY = TREND_PAD;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;
    const n = points.length;
    if (n === 0) return { kind: "empty" as const };

    const max = Math.max(1, ...points.map((p) => p.count));
    const stepX = n > 1 ? innerW / (n - 1) : innerW;
    const colW = n > 1 ? stepX : innerW;
    const coords = points.map((p, i) => {
      const x = padX + (n === 1 ? innerW / 2 : i * stepX);
      const y = padY + innerH - (p.count / max) * innerH;
      return { x, y, p, i };
    });
    const lineD = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
      .join(" ");
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (!first || !last) return { kind: "empty" as const };

    const areaD = `${lineD} L ${last.x} ${padY + innerH} L ${first.x} ${padY + innerH} Z`;
    const yTicks =
      max <= 1
        ? [0, 1]
        : [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
    const hitRects = coords.map((c) => {
      const x0 = c.i === 0 ? padX : c.x - colW / 2;
      const x1 = c.i === n - 1 ? w - padX : c.x + colW / 2;
      return { left: x0, width: x1 - x0, c };
    });
    return {
      kind: "ok" as const,
      w,
      h,
      padX,
      padY,
      innerH,
      max,
      coords,
      lineD,
      areaD,
      yTicks,
      hitRects,
      first,
      last,
    };
  }, [points]);

  if (chart.kind === "empty") {
    return (
      <ChartSection
        title="Tren selisih (14 hari, UTC)"
        empty
        emptyMessage="Belum ada data"
      />
    );
  }

  const {
    w,
    h,
    padX,
    padY,
    innerH,
    max,
    coords,
    lineD,
    areaD,
    yTicks,
    hitRects,
    first,
    last,
  } = chart;

  return (
    <ChartSection
      title="Tren selisih (14 hari, UTC)"
      subtitle="Aktivitas tercatat per hari; skala Y mengikuti nilai maksimum periode. Arahkan kursor ke grafik untuk detail."
      legend={
        <div className="ds-chart__legend-item">
          <span
            className="ds-chart__legend-swatch rounded-sm"
            style={{ background: CHART_NAYY }}
          />
          Jumlah entri
        </div>
      }
    >
      <div className="relative flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex w-5 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[9px] leading-none text-[var(--text-muted)]">
            {yTicks.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="relative min-h-[7rem] w-full min-w-0 max-h-[9rem]">
            <svg
              viewBox={`0 0 ${w} ${h}`}
              className="h-auto w-full"
              role="img"
              aria-label="Grafik tren jumlah selisih per hari"
            >
              <defs>
                <linearGradient
                  id={gradId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={CHART_NAYY}
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="100%"
                    stopColor={CHART_NAYY}
                    stopOpacity="0.02"
                  />
                </linearGradient>
              </defs>
              {yTicks.map((t) => {
                const yy = padY + innerH - (t / max) * innerH;
                return (
                  <line
                    key={t}
                    x1={padX}
                    y1={yy}
                    x2={w - padX}
                    y2={yy}
                    stroke="var(--border-default)"
                    strokeWidth="0.5"
                  />
                );
              })}
              <path
                d={areaD}
                fill={`url(#${gradId})`}
                className={`ds-chart-area-fade transition-opacity duration-200 ${hover !== null ? "opacity-90" : ""}`}
              />
              <path
                d={lineD}
                fill="none"
                stroke={CHART_NAYY}
                strokeWidth={hover === null ? 2.25 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="ds-chart-line-draw transition-[stroke-width] duration-200"
                style={{ stroke: CHART_NAYY }}
              />
              {hitRects.map(({ left, width, c }, idx) => (
                <rect
                  key={c.p.date}
                  x={left}
                  y={0}
                  width={width}
                  height={h}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHover(idx)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
              {coords.map((c) => {
                const isHi = hover === c.i;
                return (
                  <circle
                    key={c.p.date}
                    cx={c.x}
                    cy={c.y}
                    r={isHi ? 5.5 : 3.5}
                    fill="var(--surface)"
                    stroke={isHi ? CHART_EPSON : CHART_NAYY}
                    strokeWidth={isHi ? 2.2 : 1.5}
                    className="ds-chart-dot-entrance pointer-events-none transition-all duration-200 ease-out"
                    style={{ filter: isHi ? "drop-shadow(0 0 4px color-mix(in srgb, var(--epson-yellow) 50%, transparent))" : undefined }}
                  />
                );
              })}
            </svg>
            {hover !== null && coords[hover] ? (
              <div
                className="ds-chart-tooltip ds-chart-tooltip-animated"
                style={{
                  left: `${Math.min(
                    98,
                    Math.max(2, (coords[hover]!.x / w) * 100)
                  )}%`,
                  top: 4,
                  transform: "translateX(-50%)",
                }}
              >
                <p className="font-mono text-[0.7rem] text-[var(--text-muted)]">
                  {coords[hover]!.p.date}
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                  {coords[hover]!.p.count} entri
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex justify-between border-t border-[var(--border-default)] pt-2 pl-6 font-mono text-[10px] text-[var(--text-muted)]">
          <span title={first.p.date}>{first.p.date.slice(5)}</span>
          <span title={last.p.date}>{last.p.date.slice(5)}</span>
        </div>
      </div>
    </ChartSection>
  );
}

const LAYER_SWATCH: Record<string, string> = {
  po_vendor: "var(--navy)",
  arrival: "var(--info)",
  qc: "var(--success)",
  unspecified: "var(--text-muted)",
};

const TYPE_SWATCH: Record<string, string> = {
  missing: "var(--navy)",
  over: "var(--info)",
  defect: "var(--warning)",
  other: "var(--text-muted)",
};

type LabeledCount = { key: string; label: string; count: number };

function DonutBlock({
  title,
  subtitle,
  items,
  colorForKey,
}: {
  title: string;
  subtitle?: string;
  items: LabeledCount[];
  colorForKey: (key: string) => string;
}) {
  const total = items.reduce((s, i) => s + i.count, 0);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  if (total === 0) {
    return (
      <ChartSection
        title={title}
        subtitle={subtitle}
        empty
        emptyMessage="Tidak ada agregat"
      />
    );
  }
  const cx = 50;
  const cy = 50;
  const rOut = 38;
  const rIn = 24;
  const nonZero = items.filter((i) => i.count > 0);
  if (nonZero.length === 1) {
    const it = nonZero[0];
    if (!it) {
      return (
        <ChartSection
          title={title}
          subtitle={subtitle}
          empty
          emptyMessage="Tidak ada agregat"
        />
      );
    }
    const col = colorForKey(it.key);
    const rMid = (rIn + rOut) / 2;
    const strokeW = rOut - rIn;
    return (
      <ChartSection
        title={title}
        subtitle={subtitle}
        legend={
          <ul className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            <li className="ds-chart__legend-item text-[var(--text-secondary)]">
              <span
                className="ds-chart__legend-swatch h-2.5 w-2.5 rounded-[2px]"
                style={{ background: col }}
              />
              <span>
                {it.label}{" "}
                <span className="font-mono tabular-nums text-[var(--text-primary)]">
                  {it.count}
                </span>
              </span>
            </li>
          </ul>
        }
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0" aria-hidden>
            <g
              className="ds-donut-entrance"
              onMouseEnter={() => setHoverKey("single")}
              onMouseLeave={() => setHoverKey(null)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={rMid}
                fill="none"
                stroke={col}
                strokeWidth={hoverKey === "single" ? strokeW + 0.4 : strokeW}
                className="cursor-default transition-all duration-200"
                style={{
                  filter: hoverKey === "single" ? "drop-shadow(0 3px 8px color-mix(in srgb, #0f172a 18%, transparent))" : undefined,
                }}
              />
            </g>
          </svg>
          <p className="text-center text-xs text-[var(--text-muted)] sm:text-left">
            Semua tercatat pada kategori{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {it.label}
            </span>
            .
          </p>
        </div>
      </ChartSection>
    );
  }
  let angle = -90;
  const segments: {
    path: string;
    key: string;
    color: string;
    label: string;
    count: number;
  }[] = [];
  for (const it of items) {
    if (it.count === 0) continue;
    const sweep = (it.count / total) * 360;
    const start = (angle * Math.PI) / 180;
    const end = ((angle + sweep) * Math.PI) / 180;
    const x1 = cx + rOut * Math.cos(start);
    const y1 = cy + rOut * Math.sin(start);
    const x2 = cx + rOut * Math.cos(end);
    const y2 = cy + rOut * Math.sin(end);
    const x3 = cx + rIn * Math.cos(end);
    const y3 = cy + rIn * Math.sin(end);
    const x4 = cx + rIn * Math.cos(start);
    const y4 = cy + rIn * Math.sin(start);
    const large = sweep > 180 ? 1 : 0;
    const d = [
      `M ${x1} ${y1}`,
      `A ${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${rIn} ${rIn} 0 ${large} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");
    segments.push({
      path: d,
      key: it.key,
      color: colorForKey(it.key),
      label: it.label,
      count: it.count,
    });
    angle += sweep;
  }
  return (
    <ChartSection
      title={title}
      subtitle={subtitle}
      legend={
        <ul className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
          {items
            .filter((i) => i.count > 0)
            .map((i) => (
              <li
                key={i.key}
                className="ds-chart__legend-item text-[var(--text-secondary)]"
              >
                <span
                  className="ds-chart__legend-swatch h-2.5 w-2.5 rounded-[2px]"
                  style={{ background: colorForKey(i.key) }}
                />
                <span>
                  {i.label}{" "}
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    {i.count}
                  </span>
                </span>
              </li>
            ))}
        </ul>
      }
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <svg
          viewBox="0 0 100 100"
          className="h-32 w-32 shrink-0"
          style={{ filter: "drop-shadow(0 1px 1px color-mix(in srgb, #0f172a 5%, transparent))" }}
          aria-hidden
        >
          <g>
            {segments.map((s) => {
              const isHi = hoverKey === s.key;
              return (
                <path
                  key={s.key}
                  d={s.path}
                  fill={s.color}
                  className="ds-donut-seg-entrance cursor-pointer transition-all duration-200 ease-out"
                  style={{
                    filter: isHi
                      ? "brightness(1.12) drop-shadow(0 4px 10px color-mix(in srgb, #0f172a 20%, transparent)) saturate(1.08)"
                      : undefined,
                    opacity: hoverKey && !isHi ? 0.72 : 1,
                    stroke: isHi ? "color-mix(in srgb, #ffffff 35%, transparent)" : "none",
                    strokeWidth: isHi ? 0.4 : 0,
                  }}
                  onMouseEnter={() => setHoverKey(s.key)}
                  onMouseLeave={() => setHoverKey(null)}
                />
              );
            })}
          </g>
        </svg>
        <p className="text-center text-xs text-[var(--text-muted)] sm:text-left">
          Total{" "}
          <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
            {total}
          </span>{" "}
          selisih dalam set data pemantauan
          {hoverKey ? (
            <span className="mt-1.5 block font-medium text-[var(--text-primary)]">
              {segments.find((s) => s.key === hoverKey)?.label}
              :{" "}
              <span className="font-mono tabular-nums">
                {segments.find((s) => s.key === hoverKey)?.count}
              </span>
            </span>
          ) : null}
        </p>
      </div>
    </ChartSection>
  );
}

export function SupervisorLayerDonut({ items }: { items: LabeledCount[] }) {
  return (
    <DonutBlock
      title="Distribusi per lapisan"
      subtitle="Sumber pencatatan selisih"
      items={items}
      colorForKey={(k) => LAYER_SWATCH[k] ?? CHART_NAYY}
    />
  );
}

export function SupervisorTypeDonut({ items }: { items: LabeledCount[] }) {
  return (
    <DonutBlock
      title="Distribusi per jenis"
      subtitle="Jenis kondisi bermasalah tercatat"
      items={items}
      colorForKey={(k) => TYPE_SWATCH[k] ?? CHART_EPSON}
    />
  );
}

type RankedRow = { id: string; left: string; right: string; count: number };

/**
 * Horizontal bar list for top vendors or parts (max determines bar width).
 */
export function RankedBarList({
  rows,
  emptyHint,
}: {
  rows: RankedRow[];
  emptyHint: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{emptyHint}</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((r, idx) => {
        const pct = (r.count / max) * 100;
        return (
          <li
            key={r.id}
            className="ds-rank-bar-row"
          >
            <div className="ds-progress-field">
              <div className="ds-progress-label">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[0.65rem] font-bold text-[var(--navy)] tabular-nums">
                    {idx + 1}
                  </span>
                  <span
                    className="min-w-0 truncate font-medium text-[var(--text-primary)]"
                    title={r.left}
                  >
                    {r.left}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-primary)]">
                  {r.count}
                </span>
              </div>
              <div className="ds-progress ds-progress--interactive">
                <div
                  className="ds-progress-bar ds-progress-bar--entrance h-full rounded-full"
                  style={{ ["--bar-pct" as string]: String(pct) }}
                />
              </div>
              {r.right && r.right !== r.left ? (
                <p className="pl-7 text-[0.7rem] text-[var(--text-muted)]">
                  {r.right}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
