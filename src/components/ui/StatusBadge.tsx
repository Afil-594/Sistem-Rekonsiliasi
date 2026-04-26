import { statusBadgeClassName } from "@/lib/ui/status-styles";

type Props = {
  status: string | null;
  /** Shown instead of the raw status string when set (e.g. localized short label). */
  label?: string;
  className?: string;
};

/**
 * Renders a canonical status token (shipment, box, or discrepancy) with
 * consistent operational-dashboard styling.
 */
export function StatusBadge({ status, label, className = "" }: Props) {
  return (
    <span className={`${statusBadgeClassName(status)} ${className}`.trim()}>
      {label ?? status ?? "—"}
    </span>
  );
}
