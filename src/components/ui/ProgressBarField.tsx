type Tone = "default" | "success" | "warn" | "danger" | "neutral";

const BAR: Record<Tone, string> = {
  default: "ds-progress-bar",
  success: "ds-progress-bar ds-progress-bar--success",
  warn: "ds-progress-bar ds-progress-bar--warn",
  danger: "ds-progress-bar ds-progress-bar--danger",
  neutral: "ds-progress-bar ds-progress-bar--neutral",
};

type Props = {
  label: string;
  value: number;
  max?: number;
  showPercent?: boolean;
  tone?: Tone;
  className?: string;
};

/**
 * Labelled progress bar for ratios or step completion.
 */
export function ProgressBarField({
  label,
  value,
  max = 100,
  showPercent = true,
  tone = "default",
  className = "",
}: Props) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 1000) / 10);
  return (
    <div className={`ds-progress-field ${className}`.trim()}>
      <div className="ds-progress-label">
        <span>{label}</span>
        {showPercent ? (
          <span className="tabular-nums text-[var(--text-muted)]">{pct}%</span>
        ) : null}
      </div>
      <div
        className="ds-progress"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={BAR[tone]} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
