import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Inbox,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import type { Shipment } from "@/types/shipment";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FilterPillLink } from "@/components/ui/FilterPillLink";
import { PipelineTrack } from "@/components/ui/PipelineTrack";
import {
  getVendorShipmentStatusLabel,
  vendorShipmentStatusProgressIndex,
  VENDOR_SHIPMENT_STATUS_FILTERS,
} from "@/lib/utils/vendor-shipment-visibility";

const PIPELINE_STEPS = [
  { id: "pending", label: "Draft" },
  { id: "in_transit", label: "in transit" },
  { id: "arrived", label: "Tiba" },
  { id: "issue", label: "Review" },
  { id: "done", label: "Selesai" },
] as const;

function formatWhenShort(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusIcon(
  status: Shipment["status"],
): { Icon: LucideIcon; boxClass: string } {
  if (status === "pending") {
    return {
      Icon: Package,
      boxClass: "bg-[var(--warning-muted)] text-[var(--warning)]",
    };
  }
  if (status === "in_transit") {
    return {
      Icon: Truck,
      boxClass: "bg-[var(--info-muted)] text-[var(--info)]",
    };
  }
  if (status === "arrived") {
    return {
      Icon: MapPin,
      boxClass: "bg-[var(--navy-muted)] text-[var(--navy)]",
    };
  }
  if (status === "issue") {
    return {
      Icon: AlertTriangle,
      boxClass: "bg-[var(--danger-muted)] text-[var(--danger)]",
    };
  }
  if (status === "done") {
    return {
      Icon: CheckCircle2,
      boxClass: "bg-[var(--success-muted)] text-[#0a5c47]",
    };
  }
  return {
    Icon: Package,
    boxClass: "bg-[var(--section-bg)] text-[var(--text-muted)]",
  };
}

function statusToneModifier(status: Shipment["status"]): string {
  if (status === "pending") return "ds-entity-tile--status-pending";
  if (status === "in_transit") return "ds-entity-tile--status-in_transit";
  if (status === "arrived") return "ds-entity-tile--status-arrived";
  if (status === "issue") return "ds-entity-tile--status-issue";
  if (status === "done") return "ds-entity-tile--status-done";
  return "";
}

type Props = {
  rows: Shipment[];
  currentFilter: string;
};

export function VendorShipmentsList({ rows, currentFilter }: Props) {
  const buildHref = (value: (typeof VENDOR_SHIPMENT_STATUS_FILTERS)[number]["value"]) => {
    if (value === "all") {
      return "/vendor/shipments";
    }
    return `/vendor/shipments?status=${encodeURIComponent(value)}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="ds-filter-pill-group"
        role="group"
        aria-label="Filter status shipment"
      >
        {VENDOR_SHIPMENT_STATUS_FILTERS.map(({ value, label }) => {
          const isActive = currentFilter === value;
          return (
            <FilterPillLink key={value} href={buildHref(value)} active={isActive}>
              {label}
            </FilterPillLink>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="ds-empty px-4 py-10">
          <div className="mb-3 flex justify-center" aria-hidden>
            <Inbox className="h-10 w-10 text-[var(--navy)]/35" strokeWidth={1.25} />
          </div>
          <p className="ds-empty-title">Tidak ada shipment untuk filter ini</p>
          <p className="ds-empty-hint max-w-sm mx-auto">
            Shipment yang Anda buat dari daftar PO akan tampil di sini. Ubah filter atau
            buka PO untuk membuat draft shipment.
          </p>
        </div>
      ) : (
        <ul
          className="ds-card-grid m-0 list-none p-0"
          aria-label="Daftar shipment Anda"
        >
          {rows.map((row) => {
            const s = getVendorShipmentStatusLabel(row.status);
            const activeIdx = vendorShipmentStatusProgressIndex(row.status);
            const tone = statusToneModifier(row.status);
            const { Icon, boxClass } = statusIcon(row.status);
            const stageLabel = PIPELINE_STEPS[activeIdx]?.label ?? "—";
            return (
              <li key={row.id} className="min-w-0">
                <Link
                  className={`ds-entity-tile group ds-entity-tile--status pl-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] ${tone}`.trim()}
                  href={`/vendor/shipments/${encodeURIComponent(row.id)}`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${boxClass}`.trim()}
                      aria-hidden
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 gap-y-1">
                            <span className="font-mono text-[0.8125rem] font-semibold leading-tight text-[var(--text-primary)] sm:text-sm">
                              {row.shipment_code}
                            </span>
                            {row.status ? (
                              <StatusBadge
                                status={row.status}
                                label={s.shortLabel}
                                className="shrink-0"
                              />
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-[var(--text-primary)]/90 sm:text-sm">
                            {s.headline}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[0.7rem] leading-relaxed text-[var(--text-secondary)] sm:line-clamp-2 sm:text-xs">
                            {s.description}
                          </p>
                        </div>
                        <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-2 py-1 text-[0.65rem] font-semibold text-[var(--navy)] shadow-sm transition-colors group-hover:border-[color-mix(in_srgb,var(--navy)_18%,var(--border-default))] group-hover:bg-[var(--navy-muted)]/40 sm:text-xs">
                          Buka
                          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                        </span>
                      </div>
                      <div className="ds-summary-strip mt-2.5 flex-wrap items-center gap-x-2 gap-y-1.5 py-2 pl-0.5 pr-2 text-[0.7rem] sm:text-xs">
                        {row.po_reference ? (
                          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[var(--text-secondary)]">
                            <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                              PO
                            </span>
                            <span className="ds-inline-code max-w-[10rem] truncate text-[0.7rem] sm:max-w-none sm:text-xs">
                              {row.po_reference}
                            </span>
                          </span>
                        ) : null}
                        {row.po_reference ? (
                          <span
                            className="hidden h-3 w-px bg-[var(--border-default)] sm:inline"
                            aria-hidden
                          />
                        ) : null}
                        <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
                          <span>
                            <span className="text-[var(--text-muted)]">Dibuat </span>
                            {formatWhenShort(row.created_at)}
                          </span>
                        </span>
                        <span
                          className="inline-flex w-full min-w-0 items-center gap-1.5 sm:w-auto sm:ml-auto"
                          title="Posisi saat ini pada alur shipment"
                        >
                          <span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                            Tahap
                          </span>
                          <span className="ds-count-chip min-w-0 max-w-full truncate text-[0.65rem] sm:text-xs">
                            {stageLabel}
                          </span>
                        </span>
                      </div>
                      <div className="mt-2.5 border-t border-[var(--border-default)] pt-2.5">
                        <p className="mb-1.5 text-[0.65rem] font-medium text-[var(--text-muted)] sm:text-xs">
                          Alur singkat
                        </p>
                        <PipelineTrack
                          className="text-[0.65rem] sm:text-[0.7rem]"
                          aria-label="Tahap shipment"
                          steps={[...PIPELINE_STEPS]}
                          activeIndex={activeIdx}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
