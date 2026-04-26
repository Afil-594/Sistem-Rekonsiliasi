import type { Profile } from "@/types/profile";

const ROLE_CLASS: Record<string, string> = {
  superadmin:
    "border-[color-mix(in_srgb,var(--navy)_28%,var(--border-default))] bg-[var(--navy-muted)] text-[var(--navy)]",
  supervisor:
    "border-[color-mix(in_srgb,#0284c7_35%,var(--border-default))] bg-[var(--info-muted)] text-[#075985]",
  checker:
    "border-[color-mix(in_srgb,var(--success)_35%,var(--border-default))] bg-[color-mix(in_srgb,var(--success-muted)_90%,#ffffff_10%)] text-[#065f46]",
  vendor:
    "border-[color-mix(in_srgb,var(--epson-yellow)_55%,var(--border-default))] bg-[color-mix(in_srgb,var(--epson-yellow-muted)_75%,#ffffff_25%)] text-[#713f12]",
};

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  supervisor: "Supervisor",
  checker: "Checker",
  vendor: "Vendor",
};

type Props = {
  role: Profile["role"];
  className?: string;
};

/** Admin user list: role chip aligned with dashboard design tokens. */
export function UserRoleBadge({ role, className = "" }: Props) {
  const r = role ?? "";
  const base =
    ROLE_CLASS[r] ??
    "border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]";
  const label = ROLE_LABEL[r] ?? (r || "—");
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-xs font-semibold capitalize leading-tight shadow-sm ${base} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
