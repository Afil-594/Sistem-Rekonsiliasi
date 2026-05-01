import type { AuditLogFilters } from "@/lib/queries/audit-logs";

export type AuditTrailUrlInput = {
  action?: string;
  target_table?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
  severity?: string;
};

function toStartOfDayIso(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  if (!y || !m || !d) return `${dateYmd}T00:00:00.000Z`;
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function toEndOfDayIso(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  if (!y || !m || !d) return `${dateYmd}T23:59:59.999Z`;
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

export type AuditSeverityTab = NonNullable<AuditLogFilters["severity"]>;

export function parseAuditTrailSeverity(raw: string | undefined): AuditSeverityTab {
  if (raw === "critical" || raw === "warning" || raw === "info") return raw;
  return "all";
}

/** Filter lain sama dengan halaman daftar; `severity` mengikuti tab URL. */
export function auditTrailBaseFilters(params: AuditTrailUrlInput): Omit<
  AuditLogFilters,
  "limit" | "offset"
> {
  const severity = parseAuditTrailSeverity(params.severity);
  return {
    action: params.action || undefined,
    target_table: params.target_table || undefined,
    user_id: params.user_id || undefined,
    created_from: params.date_from ? toStartOfDayIso(params.date_from) : undefined,
    created_to: params.date_to ? toEndOfDayIso(params.date_to) : undefined,
    search: params.q?.trim() || undefined,
    severity,
  };
}

export function auditTrailParamsFromSearchParams(
  sp: URLSearchParams,
): AuditTrailUrlInput {
  return {
    action: sp.get("action") ?? undefined,
    target_table: sp.get("target_table") ?? undefined,
    user_id: sp.get("user_id") ?? undefined,
    date_from: sp.get("date_from") ?? undefined,
    date_to: sp.get("date_to") ?? undefined,
    q: sp.get("q") ?? undefined,
    severity: sp.get("severity") ?? undefined,
  };
}
