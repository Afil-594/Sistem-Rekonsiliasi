import type { ReactNode } from "react";
import { ClipboardList, Inbox, Layers } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Shipment } from "@/types/shipment";

function formatWhen(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? iso : value.toLocaleString();
}

type Props = {
  shipment: Shipment;
  openCount: number;
  reviewedCount: number;
  totalCount: number;
  /** Isi: daftar selisih (kartu ringkasan kondisi bermasalah) */
  children: ReactNode;
};

/**
 * Satu kontainer: ringkasan shipment + metrik, lalu area daftar selisih.
 */
export function SupervisorReviewDetailSummary({
  shipment,
  openCount,
  reviewedCount,
  totalCount,
  children,
}: Props) {
  return (
    <section
      className="ds-card mt-2 flex min-w-0 flex-col overflow-hidden border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
      aria-label="Rincian shipment yang ditinjau"
    >
      <div className="ds-card-header border-b border-[var(--border-default)] bg-[var(--surface)]/95">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="m-0 inline-flex items-center gap-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[var(--navy)]">
              <Inbox
                className="size-3.5 shrink-0 opacity-90"
                aria-hidden
              />
              Shipment
            </p>
            <h2
              className="mt-1.5 break-all font-mono text-xl font-bold leading-tight text-[var(--text-primary)] sm:text-2xl"
              id="shipment-review-heading"
            >
              {shipment.shipment_code}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">PO</span>{" "}
              <span className="font-mono font-medium text-[var(--text-primary)]">
                {shipment.po_reference ?? "—"}
              </span>
            </p>
          </div>
        </div>

        <div
          className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-stretch"
          role="group"
          aria-label="Ringkasan jumlah selisih"
        >
          <div className="ds-stat min-w-0 flex-1 basis-[5.5rem] bg-[var(--section-bg)] p-3 sm:min-h-[4.5rem]">
            <p className="m-0 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <span
                className="inline-block size-1.5 rounded-full bg-amber-500"
                aria-hidden
              />
              Terbuka
            </p>
            <p className="ds-stat-value mt-1 text-2xl text-amber-800 tabular-nums dark:text-amber-300">
              {openCount}
            </p>
            <p className="ds-stat-hint m-0">Perlu tindakan</p>
          </div>
          <div className="ds-stat min-w-0 flex-1 basis-[5.5rem] p-3 sm:min-h-[4.5rem]">
            <p className="m-0 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <span
                className="inline-block size-1.5 rounded-full bg-[var(--navy)]"
                aria-hidden
              />
              Ditinjau
            </p>
            <p className="ds-stat-value mt-1 text-2xl text-[var(--navy)] tabular-nums">
              {reviewedCount}
            </p>
            <p className="ds-stat-hint m-0">Selesai</p>
          </div>
          <div className="ds-stat min-w-0 flex-1 basis-[5.5rem] p-3 sm:min-h-[4.5rem]">
            <p className="m-0 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Layers className="size-3" aria-hidden />
              Total
            </p>
            <p className="ds-stat-value mt-1 text-2xl tabular-nums">
              {totalCount}
            </p>
            <p className="ds-stat-hint m-0">Selisih tercatat</p>
          </div>
        </div>
      </div>

      <div className="min-w-0 border-b border-[var(--border-default)] bg-[var(--surface)] px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2">
          <p className="m-0 text-sm text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Dibuat</span>{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {formatWhen(shipment.created_at)}
            </span>
          </p>
          <span
            className="hidden h-4 w-px bg-[var(--border-default)] sm:block"
            aria-hidden
          />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Status
            </span>
            {shipment.status ? (
              <StatusBadge status={shipment.status} />
            ) : (
              <span className="text-sm text-[var(--text-muted)]">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1 bg-[var(--section-bg)] px-3 py-4 sm:px-5 sm:py-6">
        <div className="flex flex-col gap-1 border-b border-[var(--border-default)]/80 pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <h3
            className="m-0 flex min-w-0 items-center gap-2 text-base font-semibold text-[var(--text-primary)]"
            id="disc-list-heading"
          >
            <ClipboardList
              className="size-5shrink-0 text-[var(--navy)] opacity-90"
              aria-hidden
            />
            <span>Daftar selisih</span>
            {totalCount > 0 && openCount > 0 ? (
              <span className="ds-badge ds-badge-warn text-[0.7rem] font-semibold sm:text-xs">
                {openCount} terbuka
              </span>
            ) : totalCount > 0 ? (
              <span className="ds-badge ds-badge-info text-[0.7rem] font-semibold sm:text-xs">
                Semua ditinjau
              </span>
            ) : null}
          </h3>
        </div>
        <div className="mt-4 min-w-0" aria-describedby="disc-list-heading">
          {children}
        </div>
      </div>
    </section>
  );
}
