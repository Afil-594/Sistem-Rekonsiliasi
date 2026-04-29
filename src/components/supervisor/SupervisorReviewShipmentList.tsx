import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { SupervisorIssueQueueItem } from "@/lib/services/supervisor";

function formatWhen(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? iso : value.toLocaleString();
}

type Props = {
  queue: SupervisorIssueQueueItem[];
};

/**
 * Card grid for supervisor issue-review queue — matches checker/vendor list density.
 */
export function SupervisorReviewShipmentList({ queue }: Props) {
  return (
    <ul
      className="ds-card-grid m-0 list-none p-0"
      aria-label="Shipment perlu review"
    >
      {queue.map(({ shipment, vendorLabel }) => (
        <li key={shipment.id} className="min-w-0">
          <Link
            className="ds-entity-tile group flex h-full flex-col pl-4 ds-entity-tile--status ds-entity-tile--status-issue"
            href={`/supervisor/review/${shipment.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold leading-tight text-[var(--text-primary)] sm:text-base">
                  {shipment.shipment_code}
                </p>
                <div className="mt-1.5">
                  {shipment.status ? (
                    <StatusBadge status={shipment.status} label="Perlu tinjauan" />
                  ) : (
                    <span className="ds-badge ds-badge-warn">Perlu tinjauan</span>
                  )}
                </div>
              </div>
              <span
                className="shrink-0 text-xs font-medium text-[var(--navy)] opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              >
                Buka →
              </span>
            </div>
            <div className="mt-2.5 flex min-w-0 flex-col gap-0.5 text-[0.7rem] leading-snug text-[var(--text-muted)] sm:text-xs">
              <span>
                PO:{" "}
                <span className="font-medium text-[var(--text-secondary)]">
                  {shipment.po_reference ?? "—"}
                </span>
              </span>
              <span className="min-w-0 truncate" title={vendorLabel}>
                Vendor:{" "}
                <span className="font-medium text-[var(--text-secondary)]">
                  {vendorLabel}
                </span>
              </span>
              <span>Dibuat {formatWhen(shipment.created_at)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
