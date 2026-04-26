import type { ReactNode } from "react";
import { PipelineTrack } from "@/components/ui/PipelineTrack";

export const CHECKER_PIPELINE_STEPS = [
  { id: "inbound", label: "inbound" },
  { id: "qc", label: "QC lokasi" },
  { id: "closed", label: "Selesai" },
] as const;

/**
 * Maps shipment status to the horizontal pipeline (0 = scan/finalize, 1 = QC, 2 = closed).
 * Presentation only — business rules stay in services.
 */
export function checkerPipelineActiveIndex(
  status: string | null | undefined,
): number {
  switch (status) {
    case "in_transit":
      return 0;
    case "arrived":
      return 1;
    case "done":
    case "issue":
      return 2;
    default:
      return 1;
  }
}

export type CheckerArrivalCounts = {
  pending: number;
  arrived: number;
  accepted: number;
  rejected: number;
  total: number;
};

type Props = {
  pageTitle: string;
  pageLead: ReactNode;
  status: string | null;
  counts: CheckerArrivalCounts;
};

type HeadingOnlyProps = {
  pageTitle: string;
  pageLead: ReactNode;
  /** Default: true — garis bawah + padding (dipakai jika header tidak dibungkus container lain). */
  showBottomBorder?: boolean;
  className?: string;
};

/** Title + lead only — for use in the main column on wide layouts. */
export function CheckerArrivalPageHeading({
  pageTitle,
  pageLead,
  showBottomBorder = true,
  className,
}: HeadingOnlyProps) {
  return (
    <div
      className={[
        "min-w-0",
        showBottomBorder && "border-b border-[var(--border-default)] pb-5",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="ds-section-label">Checker · inbound</p>
      <h1 className="ds-h1 mt-1">{pageTitle}</h1>
      <div className="ds-lead mt-2 space-y-2">{pageLead}</div>
    </div>
  );
}

/** Pipeline, status, and box counts (no outer card) — for stacking inside a panel or as aside body. */
export function CheckerArrivalProgressBlock({
  status,
  counts,
  /** Kode status mentah — sembunyikan jika sudah ditampilkan di blok identitas shipment. */
  showSystemStatusCode = true,
}: {
  status: string | null;
  counts: CheckerArrivalCounts;
  showSystemStatusCode?: boolean;
}) {
  const active = checkerPipelineActiveIndex(status);

  return (
    <div className="flex flex-col gap-3">
      <div
        className={
          showSystemStatusCode
            ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            : undefined
        }
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Tahap operasional saat ini
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {active === 0
              ? "Scan & rekonsiliasi kedatangan."
              : active === 1
                ? "QC pada box yang sudah tiba."
                : "Alur checker untuk shipment ini selesai."}
          </p>
        </div>
        {showSystemStatusCode ? (
          <div
            className="shrink-0 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--section-bg)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)]"
            title="Status shipment (sistem)"
          >
            <span className="font-mono text-[var(--text-primary)]">
              {status ?? "—"}
            </span>
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">
          Alur singkat
        </p>
        <PipelineTrack
          aria-label="Tahap checker kedatangan"
          activeIndex={active}
          steps={CHECKER_PIPELINE_STEPS.map((s) => ({
            id: s.id,
            label: s.label,
          }))}
        />
      </div>

      <div
        className="flex flex-wrap gap-2 border-t border-[var(--border-default)] pt-3"
        aria-label="Ringkasan box"
      >
        <span className="ds-summary-strip gap-2 border-0 bg-transparent p-0">
          <span className="text-xs text-[var(--text-muted)]">Belum scan</span>
          <span className="ds-count-chip">{counts.pending}</span>
        </span>
        <span className="ds-summary-strip gap-2 border-0 bg-transparent p-0">
          <span className="text-xs text-[var(--text-muted)]">Menunggu QC</span>
          <span className="ds-count-chip tabular-nums text-amber-800 dark:text-amber-200">
            {counts.arrived}
          </span>
        </span>
        <span className="ds-summary-strip gap-2 border-0 bg-transparent p-0">
          <span className="text-xs text-[var(--text-muted)]">Diterima</span>
          <span className="ds-count-chip tabular-nums text-emerald-800 dark:text-emerald-200">
            {counts.accepted}
          </span>
        </span>
        <span className="ds-summary-strip gap-2 border-0 bg-transparent p-0">
          <span className="text-xs text-[var(--text-muted)]">Bermasalah</span>
          <span className="ds-count-chip tabular-nums text-red-800 dark:text-red-200">
            {counts.rejected}
          </span>
        </span>
        <span className="ds-summary-strip gap-2 border-0 bg-transparent p-0">
          <span className="text-xs text-[var(--text-muted)]">Total</span>
          <span className="ds-count-chip font-semibold">{counts.total}</span>
        </span>
      </div>
    </div>
  );
}

/** Card-wrapped progress block for the sticky column on detail pages. */
export function CheckerArrivalProgressSidebar({
  status,
  counts,
  className,
}: {
  status: string | null;
  counts: CheckerArrivalCounts;
  className?: string;
}) {
  return (
    <div className={["ds-card ds-card-pad", className ?? ""].filter(Boolean).join(" ")}>
      <CheckerArrivalProgressBlock status={status} counts={counts} />
    </div>
  );
}

/**
 * Stage header, progress strip, and count chips for checker arrival / QC flow
 * (single-column layout — e.g. narrow viewports or list page).
 */
export function CheckerArrivalStagePanel({
  pageTitle,
  pageLead,
  status,
  counts,
}: Props) {
  return (
    <header className="ds-card ds-card-pad">
      <CheckerArrivalPageHeading pageTitle={pageTitle} pageLead={pageLead} />
      <div className="pt-4">
        <CheckerArrivalProgressBlock status={status} counts={counts} />
      </div>
    </header>
  );
}
