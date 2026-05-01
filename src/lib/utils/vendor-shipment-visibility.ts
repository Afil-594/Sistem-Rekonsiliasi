import type { Discrepancy, DiscrepancyLayer } from "@/types/discrepancy";
import type { Box } from "@/types/box";
import type { Shipment, ShipmentDetail } from "@/types/shipment";
import { DISCREPANCY_LAYER_LABELS } from "@/types/discrepancy";
import type { BoxStatusCounts, VendorDiscrepancySummary } from "@/types/shipment";

const STATUS_ORDER: readonly NonNullable<Shipment["status"]>[] = [
  "pending",
  "in_transit",
  "arrived",
  "issue",
  "done",
] as const;

/** Tab filter values for `/vendor/shipments` (bukan langsung sama dengan enum DB). */
export type VendorShipmentListFilterKey = "all" | "processing" | "issue" | "done";

export const VENDOR_SHIPMENT_PROCESSING_DB_STATUSES: readonly NonNullable<
  Shipment["status"]
>[] = ["pending", "in_transit", "arrived"] as const;

export const VENDOR_SHIPMENT_STATUS_FILTERS: {
  value: VendorShipmentListFilterKey;
  label: string;
}[] = [
  { value: "all", label: "Semua" },
  { value: "processing", label: "Sedang diproses" },
  { value: "issue", label: "Perlu tindakan" },
  { value: "done", label: "Selesai" },
];

export function countBoxesByStatus(boxes: Box[]): BoxStatusCounts {
  const counts: BoxStatusCounts = {
    total: boxes.length,
    pending: 0,
    arrived: 0,
    accepted: 0,
    rejected: 0,
  };

  for (const b of boxes) {
    const s = b.status ?? "pending";
    if (s === "pending") counts.pending += 1;
    else if (s === "arrived") counts.arrived += 1;
    else if (s === "accepted") counts.accepted += 1;
    else if (s === "rejected") counts.rejected += 1;
  }
  return counts;
}

export function summarizeDiscrepanciesForVendor(
  discrepancies: Discrepancy[],
): VendorDiscrepancySummary {
  const byLayer: Partial<Record<DiscrepancyLayer, number>> = {};
  const summary: VendorDiscrepancySummary = {
    total: discrepancies.length,
    open: 0,
    reviewed: 0,
    resolved: 0,
    byLayer,
  };

  for (const d of discrepancies) {
    if (d.status === "open") summary.open += 1;
    else if (d.status === "reviewed") summary.reviewed += 1;
    else if (d.status === "resolved") summary.resolved += 1;
    if (d.discrepancy_layer) {
      const k = d.discrepancy_layer;
      byLayer[k] = (byLayer[k] ?? 0) + 1;
    }
  }
  return summary;
}

/**
 * One-line read-out of which stages produced discrepancies (e.g. "Arrival: 1 · QC: 2").
 */
export function formatDiscrepancyLayerSummary(
  byLayer: Partial<Record<DiscrepancyLayer, number>>,
) {
  const parts = (Object.entries(byLayer) as [DiscrepancyLayer, number][])
    .filter(([, n]) => n > 0)
    .map(
      ([layer, n]) => `${DISCREPANCY_LAYER_LABELS[layer] ?? layer}: ${n}`,
    );
  return parts.join(" · ");
}

export function getVendorShipmentStatusLabel(status: Shipment["status"]): {
  shortLabel: string;
  headline: string;
  description: string;
} {
  switch (status) {
    case "pending":
      return {
        shortLabel: "Draft",
        headline: "Draft — packing berjalan",
        description:
          "Tambahkan box, lalu konfirmasi shipment. Belum ada barang dalam perjalanan ke lokasi.",
      };
    case "in_transit":
      return {
        shortLabel: "Dalam perjalanan",
        headline: "Menuju lokasi penerimaan",
        description:
          "Shipment sudah dikonfirmasi. Tim lokasi belum menyelesaikan scan inbound dan QC.",
      };
    case "arrived":
      return {
        shortLabel: "Tiba (penerimaan)",
        headline: "Di lokasi — penerimaan atau QC berjalan",
        description:
          "Shipment sudah di lokasi. Box sedang di-scan, dicek, dan direkonsiliasi.",
      };
    case "issue":
      return {
        shortLabel: "in review",
        headline: "Bermasalah — ditinjau Supervisor",
        description:
          "Ada selisih yang dilaporkan. Supervisor meninjau shipment ini sebelum dapat ditutup sepenuhnya.",
      };
    case "done":
      return {
        shortLabel: "Selesai",
        headline: "Selesai di lokasi",
        description:
          "Penerimaan, rekonsiliasi, dan tinjau Supervisor (jika ada) sudah selesai untuk shipment ini.",
      };
    default:
      return {
        shortLabel: "Tidak diketahui",
        headline: "Status tidak jelas",
        description: "Status shipment tidak dapat ditentukan.",
      };
  }
}

/**
 * 0..4 index into STATUS_ORDER, or 0 for null/invalid.
 */
export function vendorShipmentStatusProgressIndex(
  status: Shipment["status"],
): number {
  if (status == null) return 0;
  const hit = STATUS_ORDER.indexOf(status);
  return hit < 0 ? 0 : hit;
}

export { STATUS_ORDER as VENDOR_SHIPMENT_STATUS_ORDER };

export function buildVendorProgressFields(
  shipment: Shipment,
  boxes: Box[],
  discrepancies: Discrepancy[],
): Pick<
  ShipmentDetail,
  | "boxStatusCounts"
  | "discrepancySummary"
  | "needsSupervisorReview"
  | "isSiteComplete"
> {
  return {
    boxStatusCounts: countBoxesByStatus(boxes),
    discrepancySummary: summarizeDiscrepanciesForVendor(discrepancies),
    needsSupervisorReview: shipment.status === "issue",
    isSiteComplete: shipment.status === "done",
  };
}
