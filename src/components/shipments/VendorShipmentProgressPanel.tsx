import Link from "next/link";
import type { ShipmentDetail } from "@/types/shipment";
import { PipelineTrack } from "@/components/ui/PipelineTrack";
import {
  formatDiscrepancyLayerSummary,
  getVendorShipmentStatusLabel,
  VENDOR_SHIPMENT_STATUS_ORDER,
  vendorShipmentStatusProgressIndex,
} from "@/lib/utils/vendor-shipment-visibility";

const PIPELINE_SHORT: Record<NonNullable<(typeof VENDOR_SHIPMENT_STATUS_ORDER)[number]>, string> = {
  pending: "Draft",
  in_transit: "Dalam perjalanan",
  arrived: "Tiba",
  issue: "Review",
  done: "Selesai",
};

type PanelProps = Pick<
  ShipmentDetail,
  | "shipment"
  | "boxStatusCounts"
  | "discrepancySummary"
  | "needsSupervisorReview"
  | "isSiteComplete"
>;

export function VendorShipmentProgressPanel(detail: PanelProps) {
  const {
    shipment,
    boxStatusCounts,
    discrepancySummary,
    needsSupervisorReview,
    isSiteComplete,
  } = detail;
  const label = getVendorShipmentStatusLabel(shipment.status);
  const active = vendorShipmentStatusProgressIndex(shipment.status);
  const isPending = shipment.status === "pending";
  const isInTransit = shipment.status === "in_transit";
  const isPostConfirm = !isPending;

  return (
    <div className="flex flex-col gap-5" aria-labelledby="shipment-progress-heading">
      <div className="flex flex-col gap-2 border-b border-[var(--border-default)] pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 id="shipment-progress-heading" className="ds-h2">
            Progres
          </h2>
          <p className="ds-lead mt-1">{label.description}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {label.headline}
          </p>
        </div>
        <div
          className="shrink-0 self-start rounded-md border border-[var(--border-default)] bg-[var(--section-bg)] px-2.5 py-1 text-xs text-[var(--text-muted)]"
          title="Status sistem"
        >
          Tahap: <span className="font-mono text-[var(--text-primary)]">{shipment.status ?? "—"}</span>
        </div>
      </div>

      <PipelineTrack
        aria-label="Tahap alur shipment"
        activeIndex={active}
        steps={VENDOR_SHIPMENT_STATUS_ORDER.map((key) => ({
          id: key,
          label: PIPELINE_SHORT[key],
        }))}
      />

      {isSiteComplete ? (
        <div className="ds-alert ds-alert-success" role="status">
          Shipment ini <span className="font-semibold">sudah selesai</span> di sisi
          penerimaan. Tidak ada tindakan lanjut yang diperlukan dari Anda.
        </div>
      ) : null}

      {needsSupervisorReview ? (
        <div className="ds-alert ds-alert-warn" role="status">
          <p className="font-medium">Sedang ditinjau di lokasi</p>
          <p className="mt-1">
            Ada selisih yang ditangani Supervisor. Anda dapat memantau status di
            sini; tindak lanjut tetap di tim lokasi.
          </p>
          {discrepancySummary.open > 0 ? (
            <p className="mt-1 tabular-nums">
              Terbuka di lokasi: <span className="font-semibold">{discrepancySummary.open}</span>{" "}
              dari {discrepancySummary.total} entri
            </p>
          ) : null}
        </div>
      ) : null}

      {isInTransit ? (
        <div
          className="ds-alert ds-alert-success flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="m-0 flex-1 text-sm">
            <span className="font-semibold">Terkonfirmasi</span> — in transit. Packing
            di sisi Anda terkunci. Cetak label sebelum ekspedisi.
          </p>
          <Link
            className="ds-btn ds-btn-primary w-full shrink-0 sm:w-auto"
            href={`/vendor/shipments/${shipment.id}/labels`}
          >
            Buka label &amp; QR
          </Link>
        </div>
      ) : null}

      {isPostConfirm && boxStatusCounts.total > 0 ? (
        <div className="ds-subpanel">
          <h3>Box (scan &amp; QC di lokasi)</h3>
          <p>Angka mencerminkan pemrosesan box hasil packing Anda di lokasi.</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Belum di-scan</dt>
              <dd className="font-mono text-sm font-medium tabular-nums text-[var(--text-primary)]">
                {boxStatusCounts.pending}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Sudah scan, menunggu QC</dt>
              <dd className="font-mono text-sm font-medium tabular-nums text-[var(--text-primary)]">
                {boxStatusCounts.arrived}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Diterima (accepted)</dt>
              <dd className="font-mono text-sm font-medium tabular-nums text-[var(--text-primary)]">
                {boxStatusCounts.accepted}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Ditolak / bermasalah</dt>
              <dd className="font-mono text-sm font-medium tabular-nums text-[var(--text-primary)]">
                {boxStatusCounts.rejected}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Total box</dt>
              <dd className="font-mono text-sm font-medium tabular-nums text-[var(--text-primary)]">
                {boxStatusCounts.total}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {isPostConfirm && shipment.po_reference ? (
        <p className="text-xs text-slate-500">
          Pembaruan live mengikuti progres tim lokasi.
        </p>
      ) : null}

      {discrepancySummary.total > 0 ? (
        <div
          className="ds-card ds-card-pad text-sm shadow-[var(--shadow-sm)]"
          role="region"
          aria-label="Ringkasan selisih"
        >
          <h3 className="ds-h2">Selisih (ringkasan)</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
            Tercatat untuk shipment ini di lokasi. Anda tidak dapat mengubah entri
            ini; tampilan ini untuk transparansi hasil.
          </p>
          <ul className="mt-2 list-inside list-disc text-[var(--text-primary)]">
            <li>
              Total: <span className="font-mono font-medium">{discrepancySummary.total}</span>
            </li>
            <li>
              Terbuka: {discrepancySummary.open} · Ditinjau: {discrepancySummary.reviewed} ·
              Selesai: {discrepancySummary.resolved}
            </li>
            {Object.keys(discrepancySummary.byLayer).length > 0 ? (
              <li>
                Per tahap: {formatDiscrepancyLayerSummary(discrepancySummary.byLayer)}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
