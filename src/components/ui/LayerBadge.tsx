type Props = {
  label: string;
  className?: string;
};

/**
 * Layer / stage label (QC traceability) — distinct from status enum colours.
 */
export function LayerBadge({ label, className = "" }: Props) {
  return (
    <span className={`ds-badge ds-badge-layer ${className}`.trim()}>{label}</span>
  );
}
