/**
 * Shared status → Tailwind class map for scan-friendly, consistent labelling.
 * Semantic colors: success (green), danger (red), warn (amber), info (blue), accent (slate/operational in-progress), neutral.
 */
const STATUS_CLASS: Record<string, string> = {
  // Shipments
  pending: "ds-badge-warn",
  in_transit: "ds-badge-info",
  arrived: "ds-badge-accent",
  issue: "ds-badge-danger",
  done: "ds-badge-success",
  // Discrepancies
  open: "ds-badge-warn",
  reviewed: "ds-badge-info",
  resolved: "ds-badge-success",
  // Boxes
  accepted: "ds-badge-success",
  rejected: "ds-badge-danger",
};

const BASE = "ds-badge";

export function statusBadgeClassName(status: string | null | undefined): string {
  const key = (status ?? "").trim();
  const variant = STATUS_CLASS[key] ?? "ds-badge-neutral";
  return `${BASE} ${variant}`;
}
