import type { AuditLog } from "@/types/audit-log";
import {
  DISCREPANCY_TYPE_LABELS,
  type DiscrepancyType,
} from "@/types/discrepancy";

function str(p: Record<string, unknown> | null | undefined, key: string) {
  const v = p?.[key];
  if (typeof v === "string" && v.length > 0) {
    return v;
  }
  return "";
}

function discrepancyLabel(
  raw: string | null | undefined,
): string | null {
  if (!raw) {
    return null;
  }
  if (raw in DISCREPANCY_TYPE_LABELS) {
    return DISCREPANCY_TYPE_LABELS[raw as DiscrepancyType];
  }
  return raw;
}

export type CheckerActivityItem = {
  id: string;
  action: string;
  createdAt: string | null;
  shipmentId: string | null;
  shipmentCode: string;
  boxCode: string;
  partNumber: string | null;
  /** Tiba / Sesuai / Bermasalah */
  outcomeBadge: string;
  activityTitle: string;
  discrepancyTypeLabel: string | null;
  actorLabel: string | null;
};

export function buildCheckerActivityItems(
  logs: AuditLog[],
  partByBoxId: Record<string, string>,
): CheckerActivityItem[] {
  return logs.map((log) => {
    const p = (log.payload ?? null) as Record<string, unknown> | null;
    const boxId = str(p, "box_id");
    const sid = str(p, "shipment_id");

    if (log.action === "scan_box_arrival") {
      return {
        id: log.id,
        action: log.action,
        createdAt: log.created_at,
        shipmentId: sid || null,
        boxCode: str(p, "box_code") || "—",
        shipmentCode: str(p, "shipment_code") || "—",
        partNumber: boxId ? (partByBoxId[boxId] ?? null) : null,
        outcomeBadge: "Tiba",
        activityTitle: "Scan kedatangan",
        discrepancyTypeLabel: null,
        actorLabel: str(p, "actor_name") || null,
      };
    }

    if (log.action === "qc_box_accepted") {
      return {
        id: log.id,
        action: log.action,
        createdAt: log.created_at,
        shipmentId: sid || null,
        boxCode: str(p, "box_code") || "—",
        shipmentCode: str(p, "shipment_code") || "—",
        partNumber: boxId ? (partByBoxId[boxId] ?? null) : null,
        outcomeBadge: "Sesuai",
        activityTitle: "Inspeksi QC",
        discrepancyTypeLabel: null,
        actorLabel: str(p, "actor_name") || null,
      };
    }

    if (log.action === "qc_box_rejected") {
      return {
        id: log.id,
        action: log.action,
        createdAt: log.created_at,
        shipmentId: sid || null,
        boxCode: str(p, "box_code") || "—",
        shipmentCode: str(p, "shipment_code") || "—",
        partNumber: boxId ? (partByBoxId[boxId] ?? null) : null,
        outcomeBadge: "Bermasalah",
        activityTitle: "Inspeksi QC",
        discrepancyTypeLabel: discrepancyLabel(str(p, "discrepancy_type")),
        actorLabel: str(p, "actor_name") || null,
      };
    }

    return {
      id: log.id,
      action: log.action,
      createdAt: log.created_at,
      shipmentId: sid || null,
      boxCode: str(p, "box_code") || "—",
      shipmentCode: str(p, "shipment_code") || "—",
      partNumber: boxId ? (partByBoxId[boxId] ?? null) : null,
      outcomeBadge: "—",
      activityTitle: log.action,
      discrepancyTypeLabel: null,
      actorLabel: str(p, "actor_name") || null,
    };
  });
}

export function collectBoxIdsFromActivityLogs(logs: AuditLog[]): string[] {
  const ids = new Set<string>();
  for (const log of logs) {
    const p = (log.payload ?? null) as Record<string, unknown> | null;
    const id = p && typeof p.box_id === "string" ? p.box_id : "";
    if (id) {
      ids.add(id);
    }
  }
  return [...ids];
}
