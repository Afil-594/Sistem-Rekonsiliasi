/**
 * Human-readable audit trail lines and payload field ordering for the superadmin UI.
 * Payloads remain jsonb; this layer only formats what is already stored.
 */

const PRIORITY_KEYS: readonly string[] = [
  "actor_name",
  "shipment_code",
  "box_code",
  "po_reference",
  "discrepancy_id",
  "discrepancy_type",
  "discrepancy_layer",
  "box_status_from",
  "box_status_to",
  "shipment_status_from",
  "shipment_status_to",
  "discrepancy_status_from",
  "discrepancy_status_to",
  "supervisor_action",
  "shipment_done",
  "po_number",
  "item_count",
  "created_user_id",
  "email",
  "full_name",
  "role",
  "vendor_code",
  "box_count",
  "po_vendor_discrepancy_count",
  "arrival_discrepancy_count",
  "missing_box_count",
  "shipment_id",
  "box_id",
];

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  return "";
}

export function buildAuditLogSummary(
  action: string,
  payload: Record<string, unknown> | null,
): string {
  if (!payload || Object.keys(payload).length === 0) {
    return "—";
  }

  const p = payload;

  switch (action) {
    case "create_shipment": {
      const code = str(p.shipment_code);
      const po = str(p.po_reference);
      if (code && po) return `Created draft ${code} for PO ${po}`;
      if (code) return `Created draft ${code}`;
      return "Created shipment draft";
    }
    case "confirm_shipment": {
      const code = str(p.shipment_code);
      const n = p.box_count;
      const boxes =
        typeof n === "number" ? `${n} box${n === 1 ? "" : "es"}` : "";
      const from = str(p.shipment_status_from);
      const to = str(p.shipment_status_to);
      const tr = from && to ? ` (${from} → ${to})` : "";
      if (code && boxes) return `Confirmed ${code} for transit, ${boxes}${tr}`;
      if (code) return `Confirmed ${code} for transit${tr}`;
      return `Shipment confirmed${tr}`;
    }
    case "scan_box_arrival": {
      const box = str(p.box_code);
      const ship = str(p.shipment_code);
      const from = str(p.box_status_from);
      const to = str(p.box_status_to);
      const tr = from && to ? ` — box ${from} → ${to}` : "";
      if (box && ship) return `Arrival scan: ${box} on ${ship}${tr}`;
      if (box) return `Arrival scan: ${box}${tr}`;
      return "Box arrival scan";
    }
    case "qc_box_accepted": {
      const box = str(p.box_code);
      const from = str(p.box_status_from);
      const to = str(p.box_status_to);
      const tr = from && to ? ` (${from} → ${to})` : "";
      if (box) return `QC accepted ${box}${tr}`;
      return "QC accepted";
    }
    case "qc_box_rejected": {
      const box = str(p.box_code);
      const typ = str(p.discrepancy_type);
      const layer = str(p.discrepancy_layer);
      const from = str(p.box_status_from);
      const to = str(p.box_status_to);
      const tr = from && to ? `; box ${from} → ${to}` : "";
      const bits = [typ, layer].filter(Boolean).join(" / ");
      if (box) return `QC rejected ${box}${bits ? ` (${bits})` : ""}${tr}`;
      return "QC rejected";
    }
    case "finalize_scan": {
      const code = str(p.shipment_code);
      const from = str(p.shipment_status_from);
      const to = str(p.shipment_status_to);
      const tr = from && to ? `${from} → ${to}` : "";
      if (code && tr) return `Finalize inbound: ${code} (${tr})`;
      if (code) return `Finalize inbound: ${code}`;
      return "Finalize inbound scan";
    }
    case "supervisor_review_discrepancy": {
      const ship = str(p.shipment_code);
      const typ = str(p.discrepancy_type);
      const layer = str(p.discrepancy_layer);
      const act = str(p.supervisor_action);
      const done = p.shipment_done === true;
      const head = ship || "shipment (code unknown)";
      const kind = [typ, layer].filter(Boolean).join(" / ");
      const tail: string[] = [];
      if (act) tail.push(`action ${act}`);
      if (done) tail.push("shipment completed");
      const mid = kind ? `${head} — ${kind}` : head;
      return tail.length > 0 ? `Supervisor review: ${mid}; ${tail.join("; ")}` : `Supervisor review: ${mid}`;
    }
    case "create_user": {
      const name = str(p.full_name);
      const role = str(p.role);
      const em = str(p.email);
      if (name && role) return `Created user ${name} as ${role}${em ? ` (${em})` : ""}`;
      return "User created";
    }
    case "superadmin_create_po": {
      const po = str(p.po_number);
      const vc = str(p.vendor_code);
      const n = p.item_count;
      const lines =
        typeof n === "number" ? `${n} line${n === 1 ? "" : "s"}` : "";
      if (po && vc && lines) return `Created PO ${po} for vendor ${vc} (${lines})`;
      if (po && vc) return `Created PO ${po} for vendor ${vc}`;
      if (po) return `Created PO ${po}`;
      return "PO created (superadmin)";
    }
    default: {
      if (p.shipment_code) return str(p.shipment_code);
      if (p.box_code) return str(p.box_code);
      if (p.po_reference) return `PO ${str(p.po_reference)}`;
      return "—";
    }
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export type FormattedPayloadParts = {
  priorityEntries: [string, string][];
  otherEntries: [string, string][];
};

/**
 * Splits payload into priority fields (meaningful for ops) and the rest, for two-tier display.
 */
export function formatAuditPayloadForDisplay(
  payload: Record<string, unknown> | null,
): FormattedPayloadParts {
  if (!payload || Object.keys(payload).length === 0) {
    return { priorityEntries: [], otherEntries: [] };
  }

  const keys = Object.keys(payload);
  const seen = new Set<string>();
  const priorityEntries: [string, string][] = [];

  for (const k of PRIORITY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, k) && !seen.has(k)) {
      seen.add(k);
      priorityEntries.push([k, formatValue(payload[k])]);
    }
  }

  const otherKeys = keys.filter((k) => !seen.has(k)).sort((a, b) => a.localeCompare(b));
  const otherEntries: [string, string][] = otherKeys.map((k) => [k, formatValue(payload[k])]);

  return { priorityEntries, otherEntries };
}

export function prettyJsonString(payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}
