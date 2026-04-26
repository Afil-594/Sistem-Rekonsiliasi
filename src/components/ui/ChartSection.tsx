import { BarChart3 } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  empty?: boolean;
  emptyMessage?: string;
  emptyHint?: string;
  legend?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/**
 * Chart or analytics area with title, empty state, and optional legend slot.
 */
export function ChartSection({
  title,
  subtitle,
  empty = false,
  emptyMessage = "Belum ada data",
  emptyHint,
  legend,
  className = "",
  children,
}: Props) {
  return (
    <section className={`ds-chart ds-chart--lift ${className}`.trim()}>
      <div className="ds-chart__head">
        <p className="ds-chart__title">{title}</p>
        {subtitle ? <p className="ds-chart__subtitle">{subtitle}</p> : null}
      </div>
      {empty ? (
        <div className="ds-chart__empty" role="status">
          <span className="ds-chart__empty-icon" aria-hidden>
            <BarChart3 className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <p className="ds-chart__empty-title">{emptyMessage}</p>
          {emptyHint ? <p className="ds-chart__empty-hint">{emptyHint}</p> : null}
        </div>
      ) : (
        <>
          <div className="ds-chart__body">{children}</div>
          {legend ? <div className="ds-chart__legend">{legend}</div> : null}
        </>
      )}
    </section>
  );
}
