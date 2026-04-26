/** Matches `public.discrepancies` in docs/database/schema.sql */
export type DiscrepancyType = "missing" | "over" | "defect" | "other";

/**
 * Identifies which reconciliation stage produced a discrepancy.
 *
 * - `po_vendor`  – PO quantity vs. what the vendor actually packed/declared
 * - `arrival`    – outbound vendor packing vs. what the checker scanned on arrival
 * - `qc`         – actual quality / contents inspection of arrived boxes
 */
export type DiscrepancyLayer = "po_vendor" | "arrival" | "qc";

export const DISCREPANCY_LAYER_LABELS: Record<DiscrepancyLayer, string> = {
  po_vendor: "PO vs vendor",
  arrival: "Kedatangan",
  qc: "QC",
};

export const DISCREPANCY_TYPE_LABELS: Record<DiscrepancyType, string> = {
  missing: "Kurang",
  over: "Lebih",
  defect: "Cacat",
  other: "Lainnya",
};

export const DISCREPANCY_STATUS_LABELS: Record<
  "open" | "reviewed" | "resolved",
  string
> = {
  open: "Menunggu tinjauan",
  reviewed: "Sudah ditinjau",
  resolved: "Selesai",
};

export type Discrepancy = {
  id: string;
  shipment_id: string;
  box_id: string | null;
  discrepancy_type: DiscrepancyType;
  discrepancy_layer: DiscrepancyLayer | null;
  description: string;
  status: "open" | "reviewed" | "resolved";
  reported_by: string | null;
  reviewed_by: string | null;
  supervisor_action: "return" | "none" | null;
  reviewed_at: string | null;
  resolved_at: string | null;
  created_at: string | null;
  evidence_path: string | null;
  actual_qty: number | null;
};

export type DiscrepancyInsertInput = {
  shipment_id: string;
  box_id: string | null;
  discrepancy_type: DiscrepancyType;
  discrepancy_layer: DiscrepancyLayer;
  description: string;
  reported_by: string | null;
  evidence_path?: string | null;
  actual_qty?: number | null;
};
