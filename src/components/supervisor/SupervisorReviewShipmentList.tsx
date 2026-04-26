import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";

function formatWhen(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? iso : value.toLocaleString();
}

export type SupervisorReviewShipmentListRow = {
  id: string;
  shipment_code: string;
  status: string | null;
  po_reference: string | null;
  created_at: string | null;
};

type Props = {
  shipments: SupervisorReviewShipmentListRow[];
};

/**
 * Card grid for supervisor issue-review queue — matches checker/vendor list density.
 */
export function SupervisorReviewShipmentList({ shipments }: Props) {
  return (
    <ul
      className="ds-card-grid m-0 list-none p-0"
      aria-label="Shipment perlu review"
    >
      {shipments.map((shipment) => (
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
            <div className="mt-2.5 flex flex-col gap-0.5 text-[0.7rem] leading-snug text-[var(--text-muted)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-0 sm:text-xs">
              <span>
                PO:{" "}
                <span className="font-medium text-[var(--text-secondary)]">
                  {shipment.po_reference ?? "—"}
                </span>
              </span>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
              <span>Dibuat {formatWhen(shipment.created_at)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
