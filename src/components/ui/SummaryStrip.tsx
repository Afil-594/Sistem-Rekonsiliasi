import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

/**
 * Compact horizontal bar for key facts or count chips before a table.
 */
export function SummaryStrip({ children, className = "", "aria-label": ariaLabel }: Props) {
  return (
    <div
      className={`ds-summary-strip ${className}`.trim()}
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
