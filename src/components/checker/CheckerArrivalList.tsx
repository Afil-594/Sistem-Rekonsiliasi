import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";

function formatWhen(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? iso : value.toLocaleString();
}

function statusEdgeClass(
  status: string | null,
): { edge: string; hasEdge: boolean } {
  if (status === "in_transit")
    return { hasEdge: true, edge: "ds-entity-tile--status-in_transit" };
  if (status === "arrived")
    return { hasEdge: true, edge: "ds-entity-tile--status-arrived" };
  if (status === "issue") return { hasEdge: true, edge: "ds-entity-tile--status-issue" };
  if (status === "done") return { hasEdge: true, edge: "ds-entity-tile--status-done" };
  if (status === "pending")
    return { hasEdge: true, edge: "ds-entity-tile--status-pending" };
  return { hasEdge: false, edge: "" };
}

export type CheckerArrivalListRow = {
  id: string;
  shipment_code: string;
  status: string | null;
  po_reference: string | null;
  created_at: string | null;
};

type Props = {
  shipments: CheckerArrivalListRow[];
};

/**
 * Card grid of checker shipments (used on `/checker/arrival`).
 */
export function CheckerArrivalList({ shipments }: Props) {
  return (
    <ul className="ds-card-grid m-0 list-none p-0" aria-label="Checker shipments">
      {shipments.map((shipment) => {
        const { hasEdge, edge } = statusEdgeClass(shipment.status);
        return (
          <li key={shipment.id} className="min-w-0">
            <Link
              className={`ds-entity-tile group flex h-full flex-col pl-4 ${
                hasEdge ? `ds-entity-tile--status ${edge}` : ""
              }`.trim()}
              href={`/checker/arrival/${shipment.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold leading-tight text-[var(--text-primary)] sm:text-base">
                    {shipment.shipment_code}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {shipment.status === "in_transit" ? (
                      <span className="ds-badge ds-badge-info">Tahap scan</span>
                    ) : shipment.status === "arrived" ? (
                      <span className="ds-badge ds-badge-warn">Menunggu QC</span>
                    ) : shipment.status ? (
                      <StatusBadge status={shipment.status} />
                    ) : null}
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
                <span>Dikonfirmasi {formatWhen(shipment.created_at)}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
