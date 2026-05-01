import Link from "next/link";
import type { ReactNode } from "react";
import {
  Calendar,
  Clock,
  FileText,
  Package,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { CheckerArrivalShipmentRow } from "@/types/shipment";

function formatWhen(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const value = new Date(iso);
  return Number.isNaN(value.getTime())
    ? iso
    : value.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function formatBoxLabel(count: number) {
  return `${count.toLocaleString("id-ID")} Box`;
}

function leftAccentClass(
  status: CheckerArrivalShipmentRow["status"],
): string {
  if (status === "in_transit") return "border-l-[var(--info)]";
  if (status === "arrived") return "border-l-amber-500";
  if (status === "pending") return "border-l-amber-600";
  if (status === "issue") return "border-l-[var(--danger)]";
  if (status === "done") return "border-l-[var(--success)]";
  return "border-l-slate-300";
}

function ArrivalCta({
  href,
  disabled,
  className,
  title,
  children,
}: {
  href: string;
  disabled: boolean;
  className: string;
  title?: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        className={`${className} pointer-events-auto cursor-not-allowed select-none opacity-45 hover:!bg-white hover:!shadow-sm`}
        aria-disabled="true"
        title={title}
      >
        {children}
      </span>
    );
  }
  return <Link href={href} className={className}>{children}</Link>;
}

type Props = {
  shipments: CheckerArrivalShipmentRow[];
};

/**
 * Shipment cards for checker inbound (used on `/checker/arrival`).
 */
export function CheckerArrivalList({ shipments }: Props) {
  const detailHref = (id: string) => `/checker/arrival/${id}`;

  const outlineScanBtn =
    "inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[var(--info)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--info)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--info)_8%,#ffffff)]";
  const outlineQcBtn =
    "inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-amber-500/80 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50";
  const solidQcBtn =
    "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600";

  return (
    <section aria-labelledby="checker-arrival-shipments-heading">
      <h2
        id="checker-arrival-shipments-heading"
        className="ds-h2 mb-3 text-base font-semibold text-[var(--navy)] sm:text-lg"
      >
        Shipment menunggu proses
      </h2>
      <ul className="m-0 flex list-none flex-col gap-4 p-0" aria-label="Checker shipments">
        {shipments.map((shipment) => {
          const accent = leftAccentClass(shipment.status);
          const isScan = shipment.status === "in_transit";
          const isQcWait = shipment.status === "arrived";

          let nextStepText = "Buka shipment untuk melanjutkan proses di gudang.";
          if (isQcWait) {
            nextStepText =
              "Lakukan QC untuk memastikan kesesuaian item pada box.";
          } else if (isScan) {
            nextStepText =
              "Scan box yang tiba untuk memulai rekonsiliasi inbound.";
          }

          const scanDisabled = !isScan;
          const qcDisabled = isScan;

          const scanCta = (
            <ArrivalCta
              href={detailHref(shipment.id)}
              disabled={scanDisabled}
              title={
                scanDisabled
                  ? "Scan sudah tidak tersedia — Lanjutkan QC."
                  : undefined
              }
              className={outlineScanBtn}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              Mulai Scan Box
            </ArrivalCta>
          );

          const qcCta = (
            <ArrivalCta
              href={detailHref(shipment.id)}
              disabled={qcDisabled}
              title={
                qcDisabled
                  ? "Selesaikan scan terlebih dahulu sebelum melanjutkan QC."
                  : undefined
              }
              className={qcDisabled ? outlineQcBtn : solidQcBtn}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              Lanjutkan QC
            </ArrivalCta>
          );

          let firstCta: ReactNode;
          let secondCta: ReactNode;
          if (isScan) {
            firstCta = scanCta;
            secondCta = qcCta;
          } else {
            firstCta = qcCta;
            secondCta = scanCta;
          }

          return (
            <li key={shipment.id} className="min-w-0">
              <article
                className={`overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--shadow-sm)] border-l-4 ${accent}`}
              >
                <div className="flex flex-col lg:flex-row">
                  <div className="min-w-0 flex-1 p-4 sm:p-5">
                    <div className="flex gap-3 sm:gap-4">
                      <div
                        className={
                          isQcWait
                            ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
                            : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--info)_15%,#ffffff)] text-[var(--info)]"
                        }
                        aria-hidden
                      >
                        {isScan ? (
                          <ScanLine className="h-5 w-5" strokeWidth={2} />
                        ) : (
                          <Clock className="h-5 w-5" strokeWidth={2} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {shipment.status === "in_transit" ? (
                            <span className="ds-badge ds-badge-info text-[0.65rem] font-bold uppercase tracking-wide">
                              Tahap scan
                            </span>
                          ) : shipment.status === "arrived" ? (
                            <span className="ds-badge ds-badge-warn text-[0.65rem] font-bold uppercase tracking-wide">
                              Menunggu QC
                            </span>
                          ) : shipment.status ? (
                            <StatusBadge status={shipment.status} />
                          ) : null}
                        </div>
                        <Link
                          href={detailHref(shipment.id)}
                          className="mt-2 block text-lg font-bold leading-tight tracking-tight text-[var(--navy)] underline-offset-2 hover:bg-[color-mix(in_srgb,var(--navy)_4%,#ffffff)] hover:underline sm:text-xl"
                        >
                          {shipment.shipment_code}
                        </Link>
                        <p className="mt-1.5 text-xs leading-snug text-[var(--text-muted)] sm:text-sm">
                          PO:{" "}
                          <span className="font-medium text-[var(--text-secondary)]">
                            {shipment.po_reference ?? "—"}
                          </span>
                          <span className="mx-1.5" aria-hidden>
                            ·
                          </span>
                          Dikonfirmasi {formatWhen(shipment.created_at)}
                        </p>
                      </div>
                    </div>

                    <div
                      className="my-4 h-px w-full bg-[var(--border-default)]"
                      aria-hidden
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                      <div className="flex gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--info)_12%,#ffffff)] text-[var(--info)]"
                          aria-hidden
                        >
                          <FileText className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--text-muted)]">
                            Tipe Shipment
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                            Inbound
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--info)_12%,#ffffff)] text-[var(--info)]"
                          aria-hidden
                        >
                          <Calendar className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--text-muted)]">
                            Tanggal Tiba
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                            {formatWhen(shipment.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--info)_12%,#ffffff)] text-[var(--info)]"
                          aria-hidden
                        >
                          <Package className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--text-muted)]">
                            Total Box
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                            {formatBoxLabel(shipment.box_count)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <aside className="flex flex-col justify-center border-t border-[var(--border-default)] bg-[color-mix(in_srgb,var(--navy)_2.5%,#ffffff)] p-4 sm:p-5 lg:w-[min(100%,19rem)] lg:border-l lg:border-t-0">
                    <p className="m-0 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Langkah selanjutnya
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {nextStepText}
                    </p>
                    <div className="mt-4 flex flex-col gap-2.5">
                      {firstCta}
                      {secondCta}
                    </div>
                  </aside>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
