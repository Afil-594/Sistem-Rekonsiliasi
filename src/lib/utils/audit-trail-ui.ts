import type { AuditLogWithUser } from "@/types/audit-log";
import { buildAuditLogSummary, prettyJsonString } from "@/lib/utils/audit-log-display";

export type AuditSeverity = "critical" | "warning" | "info";

/** UI / badge: priority critical > warning > info keyword match. */
export function mapAuditLogSeverity(action: string): AuditSeverity {
  const a = action.toLowerCase();
  if (/(error|reject|defect|discrepancy|failed)/.test(a)) return "critical";
  if (/(update|status|review|change)/.test(a)) return "warning";
  if (/(create|accepted|scanned|success)/.test(a)) return "info";
  return "info";
}

export function auditSeverityLabel(s: AuditSeverity): string {
  switch (s) {
    case "critical":
      return "Kritis";
    case "warning":
      return "Peringatan";
    case "info":
      return "Informasi";
    default:
      return "Informasi";
  }
}

export function formatAuditTrailTimestamp(
  iso: string | null,
  locale = "id-ID",
): { primary: string; secondary: string } {
  if (!iso) {
    return { primary: "—", secondary: "" };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { primary: iso, secondary: "" };
  }
  return {
    primary: d.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    secondary: d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
}

export function formatAuditTrailTimestampCompact(iso: string | null, locale = "en-GB"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Kolom “Detail” menggantikan “Entitas” di mockup: ringkasan sasaran data. */
export function getAuditEntityDetailLabel(log: AuditLogWithUser): string {
  const payload = log.payload;
  const parts: string[] = [];

  const pickStr = (key: string): string | null => {
    if (!payload || !Object.prototype.hasOwnProperty.call(payload, key)) return null;
    const v = payload[key];
    if (v === null || v === undefined) return null;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      return String(v);
    }
    return null;
  };

  const ship = pickStr("shipment_code");
  const box = pickStr("box_code");
  const disc = pickStr("discrepancy_id");
  const po = pickStr("po_reference");

  if (ship) parts.push(ship);
  if (box) parts.push(box);
  if (disc) parts.push(`Disc. ${disc}`);
  if (po && !ship) parts.push(`PO ${po}`);

  if (parts.length > 0) {
    return parts.join(" · ");
  }
  if (log.target_table) {
    return log.target_table;
  }
  const summary = buildAuditLogSummary(log.action, payload);
  return summary;
}

export function prettyPrintAuditPayload(payload: Record<string, unknown> | null): string {
  return prettyJsonString(payload);
}

export function formatActionToken(action: string): string {
  return action.replaceAll("_", " ");
}

export function formatActionLabel(action: string): string {
  if (action === "finalize_scan") return "Selesaikan scan inbound";
  return formatActionToken(action);
}

export function actorDisplayName(log: AuditLogWithUser): string {
  const name = log.profiles?.full_name;
  if (typeof name === "string" && name.trim() !== "") {
    return name.trim();
  }
  if (log.user_id) {
    return log.user_id.length > 8 ? `${log.user_id.slice(0, 8)}…` : log.user_id;
  }
  return "—";
}

export function actorRoleLabel(log: AuditLogWithUser): string {
  const r = log.profiles?.role;
  if (!r) return "—";
  const map: Record<string, string> = {
    vendor: "Vendor",
    checker: "Checker",
    supervisor: "Supervisor",
    superadmin: "Superadmin",
  };
  return map[r] ?? r;
}

export function actorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
