import type { SupabaseClient } from "@supabase/supabase-js";
import { insertAuditLog } from "@/lib/queries/audit-logs";
import { getHeaderByPoNumber } from "@/lib/queries/erp-po";
import {
  countDiscrepancies,
  getDiscrepancyById,
  listDiscrepanciesByShipmentId,
  listDiscrepanciesForSupervisorMonitoring,
  updateDiscrepancyReview,
  type DiscrepancyMonitoringRow,
} from "@/lib/queries/discrepancies";
import { countBoxes, listBoxesByShipmentId } from "@/lib/queries/boxes";
import { getProfileById, listProfilesByIds } from "@/lib/queries/profiles";
import {
  type DoneShipmentQualityAggregate,
  getDoneShipmentQualityAggregate,
} from "@/lib/queries/supervisor-dashboard";
import {
  countShipments,
  countShipmentsByStatus,
  getShipmentById,
  listRecentShipments,
  listRecentShipmentsByStatus,
  listShipmentsByStatus,
  updateShipmentStatus,
} from "@/lib/queries/shipments";
import type { Box } from "@/types/box";
import {
  DISCREPANCY_LAYER_LABELS,
  DISCREPANCY_TYPE_LABELS,
  type Discrepancy,
  type DiscrepancyLayer,
} from "@/types/discrepancy";
import type { Profile } from "@/types/profile";
import type { Shipment } from "@/types/shipment";

type ServiceError =
  | { ok: false; status: 400; message: string }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
  | { ok: false; status: 404; message: string }
  | { ok: false; status: 409; message: string }
  | { ok: false; status: 500; message: string };

async function requireSupervisorProfile(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; profile: Profile }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }
  if (!user) {
    return { ok: false, status: 401, message: "Silakan masuk terlebih dahulu." };
  }

  const { data: profile, error: profileError } = await getProfileById(
    supabase,
    user.id,
  );
  if (profileError) {
    throw profileError;
  }
  if (!profile || (profile.role !== "supervisor" && profile.role !== "superadmin")) {
    return {
      ok: false,
      status: 403,
      message: "Hanya Supervisor atau Superadmin yang dapat mengakses.",
    };
  }

  return { ok: true, profile };
}

/** Satu baris antrian review supervisor; label vendor selaras dengan feed pemantauan. */
export type SupervisorIssueQueueItem = {
  shipment: Shipment;
  vendorLabel: string;
};

function supervisorVendorDisplayLabel(
  profile:
    | {
        vendor_code: string | null;
        full_name: string | null;
      }
    | null
    | undefined,
): string {
  const code = profile?.vendor_code?.trim() || "Tidak diketahui";
  const name = profile?.full_name?.trim();
  return name ? `${code} · ${name}` : code;
}

async function buildVendorLabelMapForShipments(
  supabase: SupabaseClient,
  shipments: Shipment[],
): Promise<Record<string, string>> {
  const vendorIds = [
    ...new Set(
      shipments.map((s) => s.vendor_id).filter((id): id is string => !!id),
    ),
  ];
  const { data: profiles } = await listProfilesByIds(supabase, vendorIds);
  const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const uniquePos = [
    ...new Set(
      shipments.map((s) => s.po_reference).filter((po): po is string => !!po),
    ),
  ];
  const headerRows = await Promise.all(
    uniquePos.map((po) => getHeaderByPoNumber(supabase, po)),
  );
  const vendorCodeByPo: Record<string, string> = {};
  uniquePos.forEach((po, i) => {
    const v = headerRows[i]?.data?.vendor_code?.trim();
    if (v) {
      vendorCodeByPo[po] = v;
    }
  });

  const out: Record<string, string> = {};
  for (const s of shipments) {
    const prof = s.vendor_id ? profileById[s.vendor_id] : undefined;
    if (prof) {
      out[s.id] = supervisorVendorDisplayLabel(prof);
      continue;
    }
    if (s.po_reference && vendorCodeByPo[s.po_reference]) {
      out[s.id] = vendorCodeByPo[s.po_reference];
      continue;
    }
    out[s.id] = "Tidak diketahui";
  }
  return out;
}

export async function listIssueShipments(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; data: SupervisorIssueQueueItem[] }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
> {
  const supervisor = await requireSupervisorProfile(supabase);
  if (!supervisor.ok) {
    return supervisor;
  }

  const { data: shipments, error } = await listShipmentsByStatus(
    supabase,
    "issue",
  );
  if (error) {
    throw error;
  }

  const labelMap = await buildVendorLabelMapForShipments(supabase, shipments);

  const data: SupervisorIssueQueueItem[] = shipments.map((shipment) => ({
    shipment,
    vendorLabel: labelMap[shipment.id] ?? "Tidak diketahui",
  }));

  return { ok: true, data };
}

export async function getShipmentForSupervisor(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<
  | {
      ok: true;
      data: {
        shipment: Shipment;
        boxes: Box[];
        discrepancies: Discrepancy[];
        vendorLabel: string;
      };
    }
  | ServiceError
> {
  const supervisor = await requireSupervisorProfile(supabase);
  if (!supervisor.ok) {
    return supervisor;
  }

  const { data: shipment, error: shipmentError } = await getShipmentById(
    supabase,
    shipmentId,
  );
  if (shipmentError) {
    throw shipmentError;
  }
  if (!shipment) {
    return { ok: false, status: 404, message: "Shipment tidak ditemukan." };
  }
  if (shipment.status !== "issue") {
    return {
      ok: false,
      status: 409,
      message: "Shipment ini tidak memiliki selisih yang menunggu review Supervisor.",
    };
  }

  const { data: boxes, error: boxesError } = await listBoxesByShipmentId(
    supabase,
    shipment.id,
  );
  if (boxesError) {
    throw boxesError;
  }

  const { data: discrepancies, error: discrepanciesError } =
    await listDiscrepanciesByShipmentId(supabase, shipment.id);
  if (discrepanciesError) {
    throw discrepanciesError;
  }

  const labelMap = await buildVendorLabelMapForShipments(supabase, [shipment]);

  return {
    ok: true,
    data: {
      shipment,
      boxes,
      discrepancies,
      vendorLabel: labelMap[shipment.id] ?? "Tidak diketahui",
    },
  };
}

export async function reviewDiscrepancy(
  supabase: SupabaseClient,
  discrepancyId: string,
): Promise<
  | { ok: true; data: { discrepancy: Discrepancy; shipmentDone: boolean } }
  | ServiceError
> {
  const supervisor = await requireSupervisorProfile(supabase);
  if (!supervisor.ok) {
    return supervisor;
  }

  const trimmedId =
    typeof discrepancyId === "string" ? discrepancyId.trim() : "";
  if (!trimmedId) {
    return { ok: false, status: 400, message: "Parameter discrepancy_id wajib diisi." };
  }

  const { data: discrepancy, error: discrepancyError } =
    await getDiscrepancyById(supabase, trimmedId);
  if (discrepancyError) {
    throw discrepancyError;
  }
  if (!discrepancy) {
    return { ok: false, status: 404, message: "Data selisih tidak ditemukan." };
  }

  if (discrepancy.status !== "open") {
    return {
      ok: false,
      status: 409,
      message: `Selisih ini sudah berstatus ${discrepancy.status}.`,
    };
  }

  const { data: reviewShipment, error: reviewShipmentError } = await getShipmentById(
    supabase,
    discrepancy.shipment_id,
  );
  if (reviewShipmentError) {
    throw reviewShipmentError;
  }

  const { data: updated, error: updateError } = await updateDiscrepancyReview(
    supabase,
    discrepancy.id,
    {
      status: "reviewed",
      reviewed_by: supervisor.profile.id,
      supervisor_action: "return",
      reviewed_at: new Date().toISOString(),
    },
    "open",
  );
  if (updateError) {
    throw updateError;
  }

  let finalDiscrepancy = updated;
  if (!finalDiscrepancy) {
    const { data: refetched, error: refetchError } = await getDiscrepancyById(
      supabase,
      discrepancy.id,
    );
    if (refetchError) {
      throw refetchError;
    }
    finalDiscrepancy = refetched;
  }

  if (!finalDiscrepancy) {
    return {
      ok: false,
      status: 409,
      message: "Status selisih tidak berhasil diperbarui. Hubungi admin jika berulang.",
    };
  }
  if (finalDiscrepancy.status !== "reviewed") {
    return {
      ok: false,
      status: 409,
      message: `Status selisih tidak berubah (saat ini: ${finalDiscrepancy.status}). Hubungi admin jika berulang.`,
    };
  }

  // Check whether all discrepancies in this shipment have been reviewed.
  let shipmentDone = false;
  const { data: allDiscrepancies, error: listError } =
    await listDiscrepanciesByShipmentId(supabase, discrepancy.shipment_id);
  if (!listError) {
    const allReviewed = allDiscrepancies.every((d) => d.status !== "open");
    if (allReviewed) {
      shipmentDone = true;
      await updateShipmentStatus(
        supabase,
        discrepancy.shipment_id,
        "done",
        "issue",
      );
    }
  }

  await insertAuditLog(supabase, {
    user_id: supervisor.profile.id,
    action: "supervisor_review_discrepancy",
    target_table: "discrepancies",
    payload: {
      discrepancy_id: finalDiscrepancy.id,
      shipment_id: finalDiscrepancy.shipment_id,
      shipment_code: reviewShipment?.shipment_code ?? null,
      discrepancy_type: finalDiscrepancy.discrepancy_type,
      discrepancy_layer: finalDiscrepancy.discrepancy_layer,
      discrepancy_status_from: "open",
      discrepancy_status_to: "reviewed",
      supervisor_action: "return",
      shipment_done: shipmentDone,
      actor_name: supervisor.profile.full_name,
    },
  });

  return { ok: true, data: { discrepancy: finalDiscrepancy, shipmentDone } };
}

export type SupervisorMonitoringFeedItem = {
  id: string;
  shipmentId: string;
  shipmentCode: string;
  shipmentStatus: string | null;
  poReference: string | null;
  vendorLabel: string;
  partNumber: string;
  layerKey: string;
  layerLabel: string;
  typeLabel: string;
  status: string;
  descriptionPreview: string;
  createdAt: string | null;
};

export type SupervisorMonitoringStats = {
  byLayer: { key: string; label: string; count: number }[];
  byType: { key: string; label: string; count: number }[];
  byDate: { date: string; count: number }[];
  topVendors: { vendorCode: string; label: string; count: number }[];
  topParts: { partNumber: string; count: number }[];
  recentIssueShipments: SupervisorIssueQueueItem[];
  discrepancyFeed: SupervisorMonitoringFeedItem[];
};

/** Rasio dari shipment berstatus `done` saja; rata-rata unit bermasalah per shipment done. */
export type SupervisorDashboardKpis = {
  /** Done tanpa baris selisih / semua done, 0–100, atau null jika tidak ada shipment done. */
  shipmentDoneCleanRatePercent: number | null;
  /** Done dengan minimal satu selisih / semua done, 0–100, atau null jika tidak ada shipment done. */
  shipmentDoneProblemRatePercent: number | null;
  /** Σ(kotak bermasalah + baris tanpa kotak) per shipment done, dibagi jumlah shipment done. */
  avgProblemUnitsPerDoneShipment: number | null;
};

export type DashboardStats = {
  totalShipments: number;
  totalBoxes: number;
  totalDiscrepancies: number;
  issueShipments: number;
  /** Shipment `done` tanpa catatan selisih (kedatangan–QC bersih). */
  doneCleanShipments: number;
  /** Shipment `done` dengan minimal satu baris di `discrepancies`. */
  doneProblemShipments: number;
  kpis: SupervisorDashboardKpis;
  recentShipments: Shipment[];
  monitoring: SupervisorMonitoringStats;
};

function buildSupervisorDashboardKpis(
  doneQuality: DoneShipmentQualityAggregate,
): SupervisorDashboardKpis {
  const { doneCount, cleanDoneCount, problemDoneCount, sumProblemUnits } =
    doneQuality;
  if (doneCount <= 0) {
    return {
      shipmentDoneCleanRatePercent: null,
      shipmentDoneProblemRatePercent: null,
      avgProblemUnitsPerDoneShipment: null,
    };
  }
  return {
    shipmentDoneCleanRatePercent: (cleanDoneCount / doneCount) * 100,
    shipmentDoneProblemRatePercent: (problemDoneCount / doneCount) * 100,
    avgProblemUnitsPerDoneShipment: sumProblemUnits / doneCount,
  };
}

function inferPartNumberFromMonitoringRow(row: DiscrepancyMonitoringRow): string {
  if (row.box?.part_number) {
    return row.box.part_number;
  }
  const desc = row.description;
  const forPart = desc.match(/for part\s+([^\s,]+)/i);
  if (forPart?.[1]) {
    return forPart[1];
  }
  const idPart = desc.match(/untuk part\s+([^\s,;]+)/i);
  if (idPart?.[1]) {
    return idPart[1];
  }
  const boxLine = desc.match(/\(([A-Z0-9._-]+),\s*qty\s/i);
  if (boxLine?.[1]) {
    return boxLine[1];
  }
  return "—";
}

function utcDayFromIso(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

function last14UtcDays(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - i,
      ),
    );
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function formatDiscrepancyTypeLabel(
  raw: string,
): string {
  if (raw === "missing" || raw === "over" || raw === "defect" || raw === "other") {
    return DISCREPANCY_TYPE_LABELS[raw];
  }
  if (raw.length === 0) {
    return raw;
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function vendorLabelFromRow(row: DiscrepancyMonitoringRow): {
  vendorCode: string;
  displayLabel: string;
} {
  const vp = row.shipment?.vendor_profile;
  const displayLabel = supervisorVendorDisplayLabel(vp);
  const vendorCode = vp?.vendor_code?.trim() || "Tidak diketahui";
  return {
    vendorCode,
    displayLabel,
  };
}

function layerLabelFromKey(layer: string | null): { key: string; label: string } {
  if (layer === "po_vendor" || layer === "arrival" || layer === "qc") {
    return {
      key: layer,
      label: DISCREPANCY_LAYER_LABELS[layer as DiscrepancyLayer],
    };
  }
  if (layer === null || layer === "") {
    return { key: "unspecified", label: "Tidak ditetapkan" };
  }
  return { key: layer, label: layer };
}

function buildSupervisorMonitoringStats(
  rows: DiscrepancyMonitoringRow[],
  recentIssueShipments: SupervisorIssueQueueItem[],
): SupervisorMonitoringStats {
  const layerOrder = ["po_vendor", "arrival", "qc", "unspecified"] as const;
  const layerCounts = new Map<string, number>();
  for (const key of layerOrder) {
    layerCounts.set(key, 0);
  }

  const typeOrder = ["missing", "over", "defect", "other"] as const;
  const typeCounts = new Map<string, number>();
  for (const key of typeOrder) {
    typeCounts.set(key, 0);
  }

  const dateCounts = new Map<string, number>();
  const vendorCounts = new Map<string, { label: string; count: number }>();
  const partCounts = new Map<string, number>();

  for (const row of rows) {
    const layerKey =
      row.discrepancy_layer === "po_vendor" ||
      row.discrepancy_layer === "arrival" ||
      row.discrepancy_layer === "qc"
        ? row.discrepancy_layer
        : "unspecified";
    layerCounts.set(layerKey, (layerCounts.get(layerKey) ?? 0) + 1);

    const t = row.discrepancy_type;
    const typeKey =
      t === "missing" || t === "over" || t === "defect" || t === "other"
        ? t
        : "other";
    typeCounts.set(typeKey, (typeCounts.get(typeKey) ?? 0) + 1);

    const day = utcDayFromIso(row.created_at);
    if (day) {
      dateCounts.set(day, (dateCounts.get(day) ?? 0) + 1);
    }

    const { vendorCode, displayLabel } = vendorLabelFromRow(row);
    const prev = vendorCounts.get(vendorCode);
    vendorCounts.set(vendorCode, {
      label: displayLabel,
      count: (prev?.count ?? 0) + 1,
    });

    const part = inferPartNumberFromMonitoringRow(row);
    if (part !== "—") {
      partCounts.set(part, (partCounts.get(part) ?? 0) + 1);
    }
  }

  const byLayer = layerOrder.map((key) => ({
    key,
    label:
      key === "unspecified"
        ? "Tidak ditetapkan"
        : DISCREPANCY_LAYER_LABELS[key as DiscrepancyLayer],
    count: layerCounts.get(key) ?? 0,
  }));

  const byType = typeOrder.map((key) => ({
    key,
    label: formatDiscrepancyTypeLabel(key),
    count: typeCounts.get(key) ?? 0,
  }));

  const dayRange = last14UtcDays();
  const byDate = dayRange.map((date) => ({
    date,
    count: dateCounts.get(date) ?? 0,
  }));

  const topVendors = [...vendorCounts.entries()]
    .map(([vendorCode, { label, count }]) => ({
      vendorCode,
      label,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topParts = [...partCounts.entries()]
    .map(([partNumber, count]) => ({ partNumber, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const discrepancyFeed: SupervisorMonitoringFeedItem[] = rows
    .slice(0, 20)
    .map((row) => {
      const { displayLabel } = vendorLabelFromRow(row);
      const { key: layerKey, label: layerLabel } = layerLabelFromKey(
        row.discrepancy_layer,
      );
      const partNumber = inferPartNumberFromMonitoringRow(row);
      const desc = row.description;
      return {
        id: row.id,
        shipmentId: row.shipment_id,
        shipmentCode: row.shipment?.shipment_code ?? "—",
        shipmentStatus: row.shipment?.status ?? null,
        poReference: row.shipment?.po_reference ?? null,
        vendorLabel: displayLabel,
        partNumber,
        layerKey,
        layerLabel,
        typeLabel: formatDiscrepancyTypeLabel(row.discrepancy_type),
        status: row.status,
        descriptionPreview:
          desc.length > 72 ? `${desc.slice(0, 72)}…` : desc,
        createdAt: row.created_at,
      };
    });

  return {
    byLayer,
    byType,
    byDate,
    topVendors,
    topParts,
    recentIssueShipments,
    discrepancyFeed,
  };
}

export async function getDashboardStats(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; data: DashboardStats }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
> {
  const supervisor = await requireSupervisorProfile(supabase);
  if (!supervisor.ok) {
    return supervisor;
  }

  const [
    shipmentsCount,
    boxesCount,
    discrepanciesCount,
    issueCount,
    recentShipments,
    monitoringRows,
    recentIssueShipments,
    doneQualityResult,
  ] = await Promise.all([
    countShipments(supabase),
    countBoxes(supabase),
    countDiscrepancies(supabase),
    countShipmentsByStatus(supabase, "issue"),
    listRecentShipments(supabase, 5),
    listDiscrepanciesForSupervisorMonitoring(supabase),
    listRecentShipmentsByStatus(supabase, "issue", 10),
    getDoneShipmentQualityAggregate(supabase),
  ]);

  if (shipmentsCount.error) throw shipmentsCount.error;
  if (boxesCount.error) throw boxesCount.error;
  if (discrepanciesCount.error) throw discrepanciesCount.error;
  if (issueCount.error) throw issueCount.error;
  if (recentShipments.error) throw recentShipments.error;
  if (monitoringRows.error) throw monitoringRows.error;
  if (recentIssueShipments.error) throw recentIssueShipments.error;
  if (doneQualityResult.error) throw doneQualityResult.error;

  const recentIssueShipmentRows = recentIssueShipments.data;
  const issueVendorLabelMap = await buildVendorLabelMapForShipments(
    supabase,
    recentIssueShipmentRows,
  );
  const recentIssueQueue: SupervisorIssueQueueItem[] =
    recentIssueShipmentRows.map((shipment) => ({
      shipment,
      vendorLabel: issueVendorLabelMap[shipment.id] ?? "Tidak diketahui",
    }));

  const monitoring = buildSupervisorMonitoringStats(
    monitoringRows.data,
    recentIssueQueue,
  );

  const totalShipments = shipmentsCount.count;
  const doneQuality = doneQualityResult.data;
  const kpis = buildSupervisorDashboardKpis(doneQuality);

  return {
    ok: true,
    data: {
      totalShipments,
      totalBoxes: boxesCount.count,
      totalDiscrepancies: discrepanciesCount.count,
      issueShipments: issueCount.count,
      doneCleanShipments: doneQuality.cleanDoneCount,
      doneProblemShipments: doneQuality.problemDoneCount,
      kpis,
      recentShipments: recentShipments.data,
      monitoring,
    },
  };
}
