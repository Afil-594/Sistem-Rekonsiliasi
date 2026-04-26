"use client";

import { useEffect, useRef, useState } from "react";

type Variant = "danger" | "success";

const FILL: Record<Variant, string> = {
  danger: "var(--danger)",
  success: "var(--success)",
};

/** Ease-out cubic, t in [0,1] */
function easeOutCubic(t: number): number {
  const x = 1 - t;
  return 1 - x * x * x;
}

const STROKE_TRACK = 4;
const STROKE_FILL = 5;
const ANIM_MS = 900;

type GaugeSvgProps = {
  percent: number;
  variant: Variant;
  "aria-label"?: string;
};

/**
 * Semicircle arc; stroke dipertebal, fill memakai pathLength + dash.
 */
function SemicircleGaugeSvg({ percent, variant, "aria-label": ariaLabel }: GaugeSvgProps) {
  const p = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  const offset = 100 - p;

  return (
    <svg
      viewBox="0 0 120 64"
      className="h-auto w-full max-h-[5.5rem] min-w-0 [overflow:visible]"
      aria-hidden={!ariaLabel}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      <path
        d="M 12 60 A 48 48 0 0 1 108 60"
        fill="none"
        pathLength={100}
        stroke="color-mix(in srgb, var(--text-muted) 30%, var(--border-default))"
        strokeWidth={STROKE_TRACK}
        strokeLinecap="round"
      />
      <path
        d="M 12 60 A 48 48 0 0 1 108 60"
        fill="none"
        pathLength={100}
        stroke={FILL[variant]}
        strokeWidth={STROKE_FILL}
        strokeLinecap="round"
        strokeDasharray={100}
        strokeDashoffset={offset}
        className="will-change-[stroke-dashoffset]"
      />
    </svg>
  );
}

type AnimatedMetricProps = {
  /** nilai asli KPI (0–100), atau null jika tanpa data */
  value: number | null;
  variant: Variant;
  label: string;
  /** contoh: "Porsi shipment issue" untuk aria */
  shortLabel: string;
};

/**
 * Blok: gauge + angka % beranimasi saat mount/refresh, sinkron ke target.
 * Null → tanpa animasi, tampil "—" dan busur kosong.
 */
export function SemicircleAnimatedMetric({
  value,
  variant,
  label,
  shortLabel,
}: AnimatedMetricProps) {
  const isEmpty = value === null;
  const target = isEmpty
    ? 0
    : Math.min(100, Math.max(0, value));

  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isEmpty) {
      setDisplay(0);
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(target);
      return;
    }

    setDisplay(0);
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / ANIM_MS);
      const eased = easeOutCubic(t);
      setDisplay(target * eased);
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
  }, [isEmpty, target]);

  const percentForArc = isEmpty ? 0 : display;
  const lineText = isEmpty
    ? "—"
    : `${(Math.round(display * 10) / 10).toFixed(1)}%`;

  const textColor =
    variant === "danger" ? "text-[var(--danger)]" : "text-[var(--success)]";

  return (
    <>
      <div className="w-full max-w-[11.5rem] shrink-0 px-0.5">
        <SemicircleGaugeSvg
          percent={percentForArc}
          variant={variant}
          aria-label={
            isEmpty
              ? `${shortLabel}: tidak tersedia`
              : `${shortLabel}: ${lineText}`.replace("%", " persen")
          }
        />
      </div>
      <p
        className={`mt-1 text-center text-xl font-medium tabular-nums ${textColor}`}
        aria-live="polite"
      >
        {lineText}
      </p>
      <p className="mt-1 text-center text-xs text-[var(--text-muted)]">{label}</p>
    </>
  );
}
