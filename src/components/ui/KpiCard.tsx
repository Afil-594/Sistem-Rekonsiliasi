import type { LucideIcon } from "lucide-react";

export type KpiTone = "neutral" | "success" | "danger" | "warn" | "info";

const TONE_WRAP: Record<KpiTone, string> = {
  neutral: "ds-kpi ds-kpi--tone-neutral",
  success: "ds-kpi ds-kpi--tone-success",
  danger: "ds-kpi ds-kpi--tone-danger",
  warn: "ds-kpi ds-kpi--tone-warn",
  info: "ds-kpi ds-kpi--tone-info",
};

const TONE_VALUE: Record<KpiTone, string> = {
  neutral: "ds-kpi-value",
  success: "ds-kpi-value ds-kpi-value--success",
  danger: "ds-kpi-value ds-kpi-value--danger",
  warn: "ds-kpi-value ds-kpi-value--warn",
  info: "ds-kpi-value",
};

type Props = {
  label: string;
  value: string;
  hint: string;
  tone?: KpiTone;
  icon?: LucideIcon;
  className?: string;
};

/**
 * Large ratio / KPI readout: label, primary value, helper line, optional icon.
 * Uses `ds-kpi` design system classes.
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
  className = "",
}: Props) {
  return (
    <div className={`${TONE_WRAP[tone]} ${className}`.trim()}>
      <div className="ds-kpi__head">
        <p className="ds-kpi-label">{label}</p>
        {Icon ? (
          <span className="ds-kpi-icon" aria-hidden>
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <p className={TONE_VALUE[tone]} aria-label={label}>
        {value}
      </p>
      <p className="ds-kpi-hint">{hint}</p>
    </div>
  );
}
