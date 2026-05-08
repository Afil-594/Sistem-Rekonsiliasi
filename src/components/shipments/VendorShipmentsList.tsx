import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  Inbox,
  MapPin,
  Package,
  Truck,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import type { VendorShipmentListRow } from "@/types/shipment";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FilterPillLink } from "@/components/ui/FilterPillLink";
import { PipelineTrack } from "@/components/ui/PipelineTrack";
import {
  getVendorShipmentNextStepText,
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

function formatBoxLabel(count: number) {
  return `${count.toLocaleString("id-ID")} Box`;
}

function statusIcon(
  status: VendorShipmentListRow["status"],
): { Icon: LucideIcon; circleClass: string } {
  if (status === "pending") {
    return {
      Icon: Package,
      circleClass: "bg-[var(--warning-muted)] text-[var(--warning)]",
    };
  }
  if (status === "in_transit") {
    return {
      Icon: Truck,
      circleClass: "bg-[color-mix(in_srgb,var(--info)_15%,#ffffff)] text-[var(--info)]",
    };
  }
  if (status === "arrived") {
    return {
      Icon: MapPin,
      circleClass: "bg-[var(--navy-muted)] text-[var(--navy)]",
    };
  }
  if (status === "issue") {
    return {
      Icon: AlertTriangle,
      circleClass: "bg-[var(--danger-muted)] text-[var(--danger)]",
    };
  }
  if (status === "done") {
    return {
      Icon: CheckCircle2,
      circleClass: "bg-[color-mix(in_srgb,var(--success)_18%,#ffffff)] text-[#0a5c47]",
    };
  }
  return {
    Icon: Package,
    circleClass: "bg-[var(--section-bg)] text-[var(--text-muted)]",
  };
}

function leftAccentClass(status: VendorShipmentListRow["status"]): string {
  if (status === "in_transit") return "border-l-[var(--info)]";
  if (status === "arrived") return "border-l-amber-500";
  if (status === "pending") return "border-l-amber-600";
  if (status === "issue") return "border-l-[var(--danger)]";
  if (status === "done") return "border-l-[var(--success)]";
  return "border-l-slate-300";
}

const solidDetailBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--navy)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color-mix(in_srgb,var(--navy)_88%,#000000)]";

const outlinePoBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[var(--info)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--info)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--info)_8%,#ffffff)]";

const metricIconWrap =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--info)_12%,#ffffff)] text-[var(--info)]";

type Props = {
  rows: VendorShipmentListRow[];
  currentFilter: string;
};

export function VendorShipmentsList({ rows, currentFilter }: Props) {
  const buildHref = (value: (typeof VENDOR_SHIPMENT_STATUS_FILTERS)[number]["value"]) => {
    if (value === "all") {
      return "/vendor/shipments";
    }
    return `/vendor/shipments?status=${encodeURIComponent(value)}`;
  };

  const detailHref = (id: string) =>
    `/vendor/shipments/${encodeURIComponent(id)}`;

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
          className="m-0 flex list-none flex-col gap-4 p-0"
          aria-label="Daftar shipment Anda"
        >
          {rows.map((row) => {
            const s = getVendorShipmentStatusLabel(row.status);
            const activeIdx = vendorShipmentStatusProgressIndex(row.status);
            const accent = leftAccentClass(row.status);
            const { Icon, circleClass } = statusIcon(row.status);
            const nextStep = getVendorShipmentNextStepText(row.status);
            const poHref = row.po_reference
              ? `/vendor/purchase-orders/${encodeURIComponent(row.po_reference)}`
              : null;

            return (
              <li key={row.id} className="min-w-0">
                <article
                  className={`overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--shadow-sm)] border-l-4 ${accent}`}
                >
                  <div className="flex flex-col lg:flex-row">
                    <div className="min-w-0 flex-1 p-4 sm:p-5">
                      <div className="flex gap-3 sm:gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${circleClass}`.trim()}
                          aria-hidden
                        >
                          <Icon className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {row.status ? (
                              <StatusBadge
                                status={row.status}
                                label={s.shortLabel}
                                className="shrink-0"
                              />
                            ) : null}
                          </div>
                          <Link
                            href={detailHref(row.id)}
                            className="mt-2 block font-mono text-lg font-bold leading-tight tracking-tight text-[var(--navy)] underline-offset-2 hover:bg-[color-mix(in_srgb,var(--navy)_4%,#ffffff)] hover:underline sm:text-xl"
                          >
                            {row.shipment_code}
                          </Link>
                          <p className="mt-1.5 text-xs leading-snug text-[var(--text-muted)] sm:text-sm">
                            PO:{" "}
                            <span className="font-medium text-[var(--text-secondary)]">
                              {row.po_reference ?? "—"}
                            </span>
                            <span className="mx-1.5" aria-hidden>
                              ·
                            </span>
                            Dibuat {formatWhenShort(row.created_at)}
                          </p>
                        </div>
                      </div>

                      <div
                        className="my-4 h-px w-full bg-[var(--border-default)]"
                        aria-hidden
                      />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                        <div className="flex gap-3">
                          <div className={metricIconWrap} aria-hidden>
                            <FileText className="h-4 w-4" strokeWidth={2} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[var(--text-muted)]">
                              Nomor PO
                            </p>
                            <p className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">
                              {row.po_reference ?? "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className={metricIconWrap} aria-hidden>
                            <Calendar className="h-4 w-4" strokeWidth={2} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[var(--text-muted)]">
                              Dibuat
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                              {formatWhenShort(row.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className={metricIconWrap} aria-hidden>
                            <Package className="h-4 w-4" strokeWidth={2} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[var(--text-muted)]">
                              Total Box
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                              {formatBoxLabel(row.box_count)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-[var(--border-default)] pt-3 sm:mt-5 sm:pt-4">
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

                    <aside className="flex flex-col justify-center border-t border-[var(--border-default)] bg-[color-mix(in_srgb,var(--navy)_2.5%,#ffffff)] p-4 sm:p-5 lg:w-[min(100%,19rem)] lg:border-l lg:border-t-0">
                      <p className="m-0 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Langkah selanjutnya
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {nextStep}
                      </p>
                      <div className="mt-4 flex flex-col gap-2.5">
                        <Link href={detailHref(row.id)} className={solidDetailBtn}>
                          <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                          Buka detail shipment
                        </Link>
                        {poHref ? (
                          <Link href={poHref} className={outlinePoBtn}>
                            <ClipboardList className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                            Lihat PO
                          </Link>
                        ) : null}
                      </div>
                    </aside>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
