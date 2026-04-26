"use client";

import {
  AlertOctagon,
  BarChart2,
  Boxes,
  CheckCircle2,
  Package,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Tone = "neutral" | "danger" | "success";

const WRAP: Record<Tone, string> = {
  neutral: "ds-stat",
  danger: "ds-stat ds-stat--danger",
  success: "ds-stat ds-stat--success",
};

const VALUE: Record<Tone, string> = {
  neutral: "ds-stat-value",
  danger: "ds-stat-value ds-stat-value--danger",
  success: "ds-stat-value ds-stat-value--success",
};

function easeOutCubic(t: number): number {
  const x = 1 - t;
  return 1 - x * x * x;
}

const ANIM_MS = 900;

/** Ikon hanya di-resolve di client — Server Components tidak boleh pass komponen Lucide sebagai prop. */
const STAT_METRIC_ICONS = {
  package: Package,
  boxes: Boxes,
  barChart2: BarChart2,
  alertOctagon: AlertOctagon,
  checkCircle2: CheckCircle2,
} as const;

export type StatMetricIconName = keyof typeof STAT_METRIC_ICONS;

function useAnimatedStatValue(target: number) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const safe = Number.isFinite(target) ? target : 0;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(Math.round(safe));
      return;
    }

    setDisplay(0);
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / ANIM_MS);
      const eased = easeOutCubic(t);
      setDisplay(Math.round(safe * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target]);

  return display;
}

type Props = {
  label: string;
  value: number;
  tone?: Tone;
  /** Kunci ikon (resolved di sisi client, aman dipanggil dari Server Component). */
  icon?: StatMetricIconName;
  className?: string;
};

/**
 * Compact numeric stat for grids (shipment / box / discrepancy counts).
 * Value animates from 0 on mount, selaras dengan metrik semicircle dashboard.
 */
export function StatMetricCard({
  label,
  value,
  tone = "neutral",
  icon: iconName,
  className = "",
}: Props) {
  const displayValue = useAnimatedStatValue(value);
  const Icon = iconName ? STAT_METRIC_ICONS[iconName] : null;

  return (
    <div className={`${WRAP[tone]} ${className}`.trim()}>
      <div className="flex items-start justify-between gap-2">
        <dl className="min-w-0 flex-1">
          <dt className="ds-stat-label">{label}</dt>
          <dd className={`${VALUE[tone]} tabular-nums`}>{displayValue}</dd>
        </dl>
        {Icon ? (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--navy-muted)] text-[var(--navy)]"
            aria-hidden
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
