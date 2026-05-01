import type { SupervisorIssueQueueItem } from "@/lib/services/supervisor";
import {
  DISCREPANCY_LAYER_LABELS,
  DISCREPANCY_TYPE_LABELS,
  type Discrepancy,
  type DiscrepancyLayer,
  type DiscrepancyType,
} from "@/types/discrepancy";

/** Badge kepentingan per shipment dari tipe discrepancy (tanpa heuristic tambahan). */
export type SupervisorReviewShipmentPriority = "high" | "standard";

/** Filter status tingkat shipment (aggregate discrepancy). */
export type SupervisorReviewStatusFilterId =
  | "all"
  | "all_open"
  | "in_progress";

export type SupervisorReviewSortId = "newest" | "oldest";

export type SupervisorReviewSummary = {
  /** Shipment: semua baris selisih masih `open` (atau tanpa baris — data anomali). */
  pendingInitialShipmentCount: number;
  /** Shipment: ada campuran open dan (reviewed|resolved). */
  inProgressShipmentCount: number;
  /** Baris discrepancy reviewed|resolved pada shipment di antrian ini. */
  decisionsCompletedRowCount: number;
  /** Total baris discrepancy pada shipment di antrian. */
  totalDiscrepancyRowCount: number;
};

export function computeSupervisorReviewSummary(
  queue: SupervisorIssueQueueItem[],
): SupervisorReviewSummary {
  let pendingInitialShipmentCount = 0;
  let inProgressShipmentCount = 0;
  let decisionsCompletedRowCount = 0;
  let totalDiscrepancyRowCount = 0;

  for (const row of queue) {
    const ds = row.discrepancies;
    totalDiscrepancyRowCount += ds.length;

    const openCount = ds.filter((d) => d.status === "open").length;
    const closedCount = ds.filter(
      (d) => d.status === "reviewed" || d.status === "resolved",
    ).length;
    decisionsCompletedRowCount += closedCount;

    if (ds.length === 0) {
      pendingInitialShipmentCount += 1;
      continue;
    }
    if (openCount === ds.length) {
      pendingInitialShipmentCount += 1;
    } else if (openCount > 0 && closedCount > 0) {
      inProgressShipmentCount += 1;
    }
  }

  return {
    pendingInitialShipmentCount,
    inProgressShipmentCount,
    decisionsCompletedRowCount,
    totalDiscrepancyRowCount,
  };
}

export function shipmentPriorityFromDiscrepancies(
  discrepancies: Discrepancy[],
): SupervisorReviewShipmentPriority {
  const hasMissingOrOver = discrepancies.some(
    (d) => d.discrepancy_type === "missing" || d.discrepancy_type === "over",
  );
  return hasMissingOrOver ? "high" : "standard";
}

export function priorityBadgeLabel(
  priority: SupervisorReviewShipmentPriority,
): string {
  return priority === "high" ? "PRIORITAS TINGGI" : "PERLU TINJAUAN";
}

export function priorityAccentClass(
  priority: SupervisorReviewShipmentPriority,
): string {
  if (priority === "high") {
    return "before:bg-red-500";
  }
  return "before:bg-amber-500";
}

export function priorityIconWrapClass(
  priority: SupervisorReviewShipmentPriority,
): string {
  if (priority === "high") {
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }
  return "bg-amber-50 text-amber-800 dark:bg-amber-950/35 dark:text-amber-200";
}

function isDiscrepancyLayer(v: string | null): v is DiscrepancyLayer {
  return v === "po_vendor" || v === "arrival" || v === "qc";
}

function isDiscrepancyType(v: string): v is DiscrepancyType {
  return v === "missing" || v === "over" || v === "defect" || v === "other";
}

function layerLabel(d: Discrepancy): string | null {
  if (!d.discrepancy_layer || !isDiscrepancyLayer(d.discrepancy_layer)) {
    return null;
  }
  return DISCREPANCY_LAYER_LABELS[d.discrepancy_layer];
}

const TYPE_FOCUS_ORDER: DiscrepancyType[] = [
  "missing",
  "over",
  "defect",
  "other",
];

/** Lapisan dominan dalam subset baris (penentu utama jika ada). */
function dominantLayerAmong(discrepancies: Discrepancy[]): string | null {
  const counts = new Map<string, number>();
  for (const d of discrepancies) {
    const label = layerLabel(d);
    if (!label) {
      continue;
    }
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let bestLabel: string | null = null;
  let bestN = 0;
  for (const [label, n] of counts) {
    if (n > bestN || (n === bestN && label.localeCompare(bestLabel ?? "") < 0)) {
      bestN = n;
      bestLabel = label;
    }
  }
  return bestLabel;
}

function joinBahasa(lowerwords: string[]): string {
  if (lowerwords.length === 1) {
    return lowerwords[0] ?? "";
  }
  if (lowerwords.length === 2) {
    return `${lowerwords[0]} dan ${lowerwords[1]}`;
  }
  return `${lowerwords.slice(0, -1).join(", ")}, dan ${
    lowerwords[lowerwords.length - 1]
  }`;
}

/** Ringkasan singkat satu–dua klause; konteks lengkap di halaman detail. */
export function buildProblemSummaryText(discrepancies: Discrepancy[]): string {
  if (discrepancies.length === 0) {
    return "Discrepancy membutuhkan tinjauan supervisor";
  }

  const openRows = discrepancies.filter((d) => d.status === "open");
  const openCount = openRows.length;
  const total = discrepancies.length;

  if (openCount === 0) {
    return "Tidak ada selisih terbuka. Lihat detail untuk riwayat keputusan.";
  }

  const typeLabelsDistinct: string[] = [];
  for (const t of TYPE_FOCUS_ORDER) {
    if (
      openRows.some(
        (d) =>
          isDiscrepancyType(d.discrepancy_type) && d.discrepancy_type === t,
      )
    ) {
      typeLabelsDistinct.push(DISCREPANCY_TYPE_LABELS[t].toLowerCase());
    }
  }
  if (openRows.some((d) => !isDiscrepancyType(d.discrepancy_type))) {
    typeLabelsDistinct.push("lainnya");
  }

  const layer = dominantLayerAmong(openRows);
  const layerBit = layer ? ` (${layer})` : "";

  const queueSuffix =
    total === openCount
      ? `${openCount} selisih menunggu tinjauan supervisor.`
      : `${openCount} dari ${total} selisih masih menunggu supervisor.`;

  if (typeLabelsDistinct.length === 0) {
    return `Ada selisih terbuka${layerBit}. ${queueSuffix}`;
  }

  const typePhrase = joinBahasa(typeLabelsDistinct);

  if (typeLabelsDistinct.length === 1) {
    return `${typePhrase}${layerBit}. ${queueSuffix}`;
  }

  return `Selisih campuran (${typePhrase})${layerBit}. ${queueSuffix}`;
}

export function filterQueueBySearch(
  queue: SupervisorIssueQueueItem[],
  q: string,
): SupervisorIssueQueueItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return queue;
  }
  return queue.filter((row) => {
    const sc = row.shipment.shipment_code?.toLowerCase() ?? "";
    const po = row.shipment.po_reference?.toLowerCase() ?? "";
    const vendor = row.vendorLabel.toLowerCase();
    return (
      sc.includes(needle) || po.includes(needle) || vendor.includes(needle)
    );
  });
}

export function filterQueueByShipmentStatus(
  queue: SupervisorIssueQueueItem[],
  filterId: SupervisorReviewStatusFilterId,
): SupervisorIssueQueueItem[] {
  if (filterId === "all") {
    return queue;
  }
  return queue.filter((row) => {
    const ds = row.discrepancies;
    if (ds.length === 0) {
      return filterId === "all_open";
    }
    const openCount = ds.filter((d) => d.status === "open").length;
    const closedCount = ds.filter(
      (d) => d.status === "reviewed" || d.status === "resolved",
    ).length;
    if (filterId === "all_open") {
      return openCount === ds.length;
    }
    return openCount > 0 && closedCount > 0;
  });
}

export function filterQueueByDateRange(
  queue: SupervisorIssueQueueItem[],
  from: string | null,
  to: string | null,
): SupervisorIssueQueueItem[] {
  if (!from && !to) {
    return queue;
  }
  const fromMs = from ? Date.parse(`${from}T00:00:00`) : null;
  const toMs = to ? Date.parse(`${to}T23:59:59.999`) : null;

  return queue.filter((row) => {
    const candidates: number[] = [];
    if (row.shipment.created_at) {
      const t = Date.parse(row.shipment.created_at);
      if (!Number.isNaN(t)) {
        candidates.push(t);
      }
    }
    for (const d of row.discrepancies) {
      if (d.created_at) {
        const t = Date.parse(d.created_at);
        if (!Number.isNaN(t)) {
          candidates.push(t);
        }
      }
    }
    const ref =
      candidates.length > 0
        ? Math.max(...candidates)
        : NaN;
    if (Number.isNaN(ref)) {
      return false;
    }
    if (fromMs != null && !Number.isNaN(fromMs) && ref < fromMs) {
      return false;
    }
    if (toMs != null && !Number.isNaN(toMs) && ref > toMs) {
      return false;
    }
    return true;
  });
}

export function sortSupervisorReviewQueue(
  queue: SupervisorIssueQueueItem[],
  sortId: SupervisorReviewSortId,
): SupervisorIssueQueueItem[] {
  const mult = sortId === "newest" ? -1 : 1;
  return [...queue].sort((a, b) => {
    const ts = (row: SupervisorIssueQueueItem) => {
      const ship = row.shipment.created_at
        ? Date.parse(row.shipment.created_at)
        : NaN;
      let latestDisc = NaN;
      for (const d of row.discrepancies) {
        if (!d.created_at) {
          continue;
        }
        const x = Date.parse(d.created_at);
        if (!Number.isNaN(x)) {
          latestDisc =
            Number.isNaN(latestDisc) ? x : Math.max(latestDisc, x);
        }
      }
      const base = Number.isNaN(latestDisc) ? ship : Math.max(latestDisc, ship);
      return Number.isNaN(base) ? 0 : base;
    };
    const da = ts(a);
    const db = ts(b);
    if (da === db) {
      return (a.shipment.shipment_code ?? "").localeCompare(
        b.shipment.shipment_code ?? "",
      );
    }
    return mult * (da - db);
  });
}

export function openDiscrepanciesForShipment(
  row: SupervisorIssueQueueItem,
): Discrepancy[] {
  return row.discrepancies.filter((d) => d.status === "open");
}
