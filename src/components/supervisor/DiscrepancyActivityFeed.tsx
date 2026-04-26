import Link from "next/link";
import { LayerBadge } from "@/components/ui/LayerBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { SupervisorMonitoringFeedItem } from "@/lib/services/supervisor";

export function formatDiscrepancyWhen(iso: string | null) {
  if (!iso) return "—";
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? iso : value.toLocaleString();
}

type TableProps = {
  rows: SupervisorMonitoringFeedItem[];
};

export function DiscrepancyActivityTable({ rows }: TableProps) {
  if (rows.length === 0) {
    return <p className="ds-muted py-1">Belum ada selisih yang tercatat.</p>;
  }
  return (
    <div className="ds-table-wrap">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="ds-thead">
            <th className="ds-tcell py-2.5 pl-3">Waktu</th>
            <th className="ds-tcell">Shipment</th>
            <th className="ds-tcell">Vendor</th>
            <th className="ds-tcell">Part</th>
            <th className="ds-tcell">Lapisan</th>
            <th className="ds-tcell">Jenis</th>
            <th className="ds-tcell">Status</th>
            <th className="ds-tcell pr-3">Ringkasan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="ds-trow">
              <td className="ds-tcell--meta whitespace-nowrap px-3 py-2.5">
                <span className="inline-block rounded-md bg-[var(--surface-elevated)] px-2 py-0.5 font-mono text-[0.7rem] text-[var(--text-secondary)]">
                  {formatDiscrepancyWhen(row.createdAt)}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="ds-tcell--mono text-[var(--text-primary)]">
                  {row.shipmentStatus === "issue" ? (
                    <Link
                      className="font-medium text-[var(--navy)] underline decoration-[var(--border-hover)] underline-offset-2 transition-colors hover:text-[var(--navy-hover)]"
                      href={`/supervisor/review/${row.shipmentId}`}
                    >
                      {row.shipmentCode}
                    </Link>
                  ) : (
                    row.shipmentCode
                  )}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {row.poReference ? `PO ${row.poReference}` : "—"}
                </div>
                <div className="mt-1">
                  <StatusBadge status={row.shipmentStatus} />
                </div>
              </td>
              <td className="max-w-[140px] truncate px-3 py-2.5 text-xs text-[var(--text-secondary)]">
                {row.vendorLabel}
              </td>
              <td className="px-3 py-2.5">
                <span className="ds-tcell--mono text-[var(--text-primary)]">{row.partNumber}</span>
              </td>
              <td className="px-3 py-2.5">
                <LayerBadge label={row.layerLabel} />
              </td>
              <td className="px-3 py-2.5 text-xs">{row.typeLabel}</td>
              <td className="px-3 py-2.5">
                <StatusBadge status={row.status} />
              </td>
              <td className="max-w-[200px] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
                {row.descriptionPreview}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DEFAULT_PREVIEW_MAX = 6;

type PreviewProps = {
  rows: SupervisorMonitoringFeedItem[];
  /** Cuplikan di dashboard: 5–8 disarankan. */
  maxItems?: number;
};

export function DiscrepancyActivityPreview({
  rows,
  maxItems = DEFAULT_PREVIEW_MAX,
}: PreviewProps) {
  if (rows.length === 0) {
    return <p className="ds-muted py-1">Belum ada selisih yang tercatat.</p>;
  }

  const items = rows.slice(0, maxItems);
  return (
    <ul className="flex flex-col gap-2.5" aria-label="Cuplikan History shipmnet terbaru">
      {items.map((row) => (
        <li
          key={row.id}
          className="ds-list-row ds-list-row--h flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)]/90 bg-[var(--surface)] p-3.5 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono text-[0.7rem] font-medium tabular-nums text-[var(--text-muted)]">
                {formatDiscrepancyWhen(row.createdAt)}
              </span>
              <span className="text-[0.7rem] text-[var(--text-muted)]">·</span>
              <span className="min-w-0 font-mono text-sm font-semibold text-[var(--text-primary)]">
                {row.shipmentStatus === "issue" ? (
                  <Link
                    className="text-[var(--navy)] underline decoration-[var(--border-hover)] underline-offset-2 transition-colors hover:text-[var(--navy-hover)]"
                    href={`/supervisor/review/${row.shipmentId}`}
                  >
                    {row.shipmentCode}
                  </Link>
                ) : (
                  row.shipmentCode
                )}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LayerBadge label={row.layerLabel} />
              <span className="text-xs text-[var(--text-secondary)]">{row.typeLabel}</span>
              <StatusBadge status={row.status} />
            </div>
            <p className="line-clamp-2 text-xs leading-snug text-[var(--text-secondary)]">
              {row.descriptionPreview}
            </p>
          </div>
          <div className="shrink-0 space-y-1 border-t border-[var(--border-default)]/80 pt-2 text-xs text-[var(--text-secondary)] sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0 sm:text-right">
            <p className="max-w-[14rem] truncate sm:ml-auto" title={row.vendorLabel}>
              {row.vendorLabel}
            </p>
            <p className="font-mono text-[0.7rem] text-[var(--text-primary)]">
              Part {row.partNumber}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
