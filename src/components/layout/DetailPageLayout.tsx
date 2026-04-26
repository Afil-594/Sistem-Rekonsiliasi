import type { ReactNode } from "react";

type Props = {
  main: ReactNode;
  aside: ReactNode;
  /** Optional full-width block above the two-column grid (e.g. back link + title) */
  intro?: ReactNode;
  className?: string;
  /**
   * When true, the aside is shown above the main column in single-column / narrow
   * layouts (e.g. purchase order: header context first on mobile) while on `lg+`
   * the main column stays on the left.
   */
  sideBeforeMainOnNarrow?: boolean;
};

/**
 * Responsive two-column layout for operational detail pages: primary workflow in `main`,
 * summary / progress / quick reference in `aside` (sticky on large screens).
 */
export function DetailPageLayout({
  main,
  aside,
  intro,
  className,
  sideBeforeMainOnNarrow = false,
}: Props) {
  return (
    <div
      className={["reveal-children", className].filter(Boolean).join(" ")}
    >
      {intro ? <div className="mb-2 min-w-0 lg:mb-4">{intro}</div> : null}
      <div className="ds-two-col-detail">
        <div
          className={
            sideBeforeMainOnNarrow
              ? "ds-two-col-detail__main order-2 lg:order-1"
              : "ds-two-col-detail__main"
          }
        >
          {main}
        </div>
        <aside
          className={
            sideBeforeMainOnNarrow
              ? "ds-two-col-detail__aside order-1 lg:order-2"
              : "ds-two-col-detail__aside"
          }
          aria-label="Ringkasan & progres"
        >
          {aside}
        </aside>
      </div>
    </div>
  );
}
