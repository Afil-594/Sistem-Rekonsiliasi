/** Matches `public.shipments` in docs/database/schema.sql */
export type Shipment = {
  id: string;
  shipment_code: string;
  po_reference: string | null;
  status: "pending" | "in_transit" | "arrived" | "issue" | "done" | null;
  vendor_id: string | null;
  created_at: string | null;
};

/** Enriched row for checker inbound list (`/checker/arrival`). */
export type CheckerArrivalShipmentRow = Shipment & { box_count: number };

import type { Box } from "@/types/box";
import type { DiscrepancyLayer } from "@/types/discrepancy";
import type { ErpPoItem } from "@/types/erp-po";

/** Box counts for vendor visibility (warehouse scan / QC). */
export type BoxStatusCounts = {
  total: number;
  pending: number;
  arrived: number;
  accepted: number;
  rejected: number;
};

/** Read-only roll-up of discrepancy rows for a shipment. */
export type VendorDiscrepancySummary = {
  total: number;
  open: number;
  reviewed: number;
  resolved: number;
  byLayer: Partial<Record<DiscrepancyLayer, number>>;
};

export type ShipmentDetail = {
  shipment: Shipment;
  /** Teks tampilan: `profiles.full_name` jika ada, selain itu `vendor_code` profil. */
  vendorDisplayName: string;
  poVendorCode: string | null;
  poItems: ErpPoItem[];
  boxes: Box[];
  boxStatusCounts: BoxStatusCounts;
  discrepancySummary: VendorDiscrepancySummary;
  /** True when receiving site has flagged the shipment in the issue / supervisor workflow. */
  needsSupervisorReview: boolean;
  /** Receiving site closed the workflow successfully. */
  isSiteComplete: boolean;
};
