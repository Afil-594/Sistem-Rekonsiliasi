import type { SupabaseClient } from "@supabase/supabase-js";
import { insertAuditLog } from "@/lib/queries/audit-logs";
import {
  getBoxByCode,
  getBoxById,
  listBoxCountsByShipmentIds,
  listBoxesByStatus,
  listBoxesByShipmentId,
  updateBoxStatus,
} from "@/lib/queries/boxes";
import {
  insertDiscrepancy,
  listDiscrepanciesByShipmentId,
} from "@/lib/queries/discrepancies";
import { getProfileById } from "@/lib/queries/profiles";
import {
  getShipmentById,
  listShipmentsByIds,
  listShipmentsByStatus,
  updateShipmentStatus,
} from "@/lib/queries/shipments";
import {
  listShipmentSnapshotsByShipmentId,
  listShipmentBoxSnapshotsByShipmentId,
} from "@/lib/queries/shipment-snapshots";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Box } from "@/types/box";
import type { Discrepancy, DiscrepancyType } from "@/types/discrepancy";
import type { Profile } from "@/types/profile";
import type { CheckerArrivalShipmentRow, Shipment } from "@/types/shipment";

const DISCREPANCY_TYPES: readonly DiscrepancyType[] = [
  "missing",
  "over",
  "defect",
  "other",
];
const ACTUAL_QTY_REQUIRED_TYPES = new Set<DiscrepancyType>(["missing", "over"]);
const EVIDENCE_BUCKET = process.env.SUPABASE_DISCREPANCY_EVIDENCE_BUCKET ?? "";

type ServiceError =
  | { ok: false; status: 400; message: string }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
  | { ok: false; status: 404; message: string }
  | { ok: false; status: 409; message: string }
  | { ok: false; status: 500; message: string };

async function requireCheckerProfile(
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
  if (!profile || profile.role !== "checker") {
    return {
      ok: false,
      status: 403,
      message: "Akses ditolak: peran checker tidak ditemukan.",
    };
  }

  return { ok: true, profile };
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim();
  const safeName = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safeName.length > 0 ? safeName : "evidence-image";
}

function parseActualQty(value: number | null | undefined) {
  if (value == null) {
    return { ok: true as const, value: null };
  }
  if (!Number.isInteger(value) || value < 0) {
    return {
      ok: false as const,
      message: "Qty aktual harus berupa bilangan bulat ≥ 0.",
    };
  }
  return { ok: true as const, value };
}

function validateDiscrepancyActualQty(
  discrepancyType: DiscrepancyType,
  actualQty: number | null,
  expectedQty: number,
) {
  if (actualQty == null) {
    return { ok: true as const };
  }

  if (discrepancyType === "missing" && actualQty >= expectedQty) {
    return {
      ok: false as const,
      message: `Untuk selisih \"kurang\", qty aktual harus lebih kecil dari yang diharapkan (${expectedQty}).`,
    };
  }

  if (discrepancyType === "over" && actualQty <= expectedQty) {
    return {
      ok: false as const,
      message: `Untuk selisih \"lebih\", qty aktual harus lebih besar dari yang diharapkan (${expectedQty}).`,
    };
  }

  return { ok: true as const };
}

async function uploadDiscrepancyEvidence(
  supabase: SupabaseClient,
  input: {
    shipmentId: string;
    boxId: string;
    file: File;
  },
): Promise<
  | { ok: true; path: string }
  | { ok: false; status: 400 | 500; message: string }
> {
  if (!input.file.type.startsWith("image/")) {
    return {
      ok: false,
      status: 400,
      message: "Foto bukti harus berupa file gambar.",
    };
  }
  if (!EVIDENCE_BUCKET) {
    return {
      ok: false,
      status: 500,
      message: "Bucket penyimpanan bukti belum dikonfigurasi (hubungi admin).",
    };
  }

  const path = `${input.shipmentId}/${input.boxId}/${Date.now()}-${sanitizeFileName(input.file.name)}`;
  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type,
    });

  if (error) {
    return {
      ok: false,
      status: 500,
      message: `Gagal mengunggah foto bukti: ${error.message}`,
    };
  }

  return { ok: true, path };
}

async function confirmShipmentStatus(
  supabase: SupabaseClient,
  shipmentId: string,
  nextStatus: NonNullable<Shipment["status"]>,
): Promise<{ ok: true; shipment: Shipment } | ServiceError> {
  const { data: updated, error: updateError } = await updateShipmentStatus(
    supabase,
    shipmentId,
    nextStatus,
    "in_transit",
  );
  if (updateError) {
    throw updateError;
  }

  let finalShipment = updated;
  if (!finalShipment) {
    const { data: refetched, error: refetchError } = await getShipmentById(
      supabase,
      shipmentId,
    );
    if (refetchError) {
      throw refetchError;
    }
    finalShipment = refetched;
  }

  if (!finalShipment) {
    return {
      ok: false,
      status: 409,
      message: "Status shipment tidak berhasil diperbarui. Coba lagi atau hubungi admin.",
    };
  }
  if (finalShipment.status !== nextStatus) {
    return {
      ok: false,
      status: 409,
      message: `Status shipment tidak berubah (saat ini: ${finalShipment.status ?? "tidak diketahui"}). Hubungi admin jika berulang.`,
    };
  }

  return { ok: true, shipment: finalShipment };
}

export async function listCheckerShipments(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; data: CheckerArrivalShipmentRow[] }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
> {
  const checker = await requireCheckerProfile(supabase);
  if (!checker.ok) {
    return checker;
  }

  const { data: inTransitShipments, error: inTransitError } =
    await listShipmentsByStatus(supabase, "in_transit");
  if (inTransitError) {
    throw inTransitError;
  }

  const { data: arrivedShipments, error: arrivedError } =
    await listShipmentsByStatus(supabase, "arrived");
  if (arrivedError) {
    throw arrivedError;
  }

  const knownIds = new Set(
    [...inTransitShipments, ...arrivedShipments].map((s) => s.id),
  );

  // Recovery: shipments in other states that still have boxes needing QC.
  const { data: arrivedBoxes, error: arrivedBoxesError } =
    await listBoxesByStatus(supabase, "arrived");
  if (arrivedBoxesError) {
    throw arrivedBoxesError;
  }

  const recoveryShipmentIds = Array.from(
    new Set(
      arrivedBoxes
        .map((box) => box.shipment_id)
        .filter(
          (sid): sid is string =>
            typeof sid === "string" && !knownIds.has(sid),
        ),
    ),
  );

  const { data: recoveryShipments, error: recoveryShipmentsError } =
    await listShipmentsByIds(supabase, recoveryShipmentIds);
  if (recoveryShipmentsError) {
    throw recoveryShipmentsError;
  }

  const shipments = [
    ...inTransitShipments,
    ...arrivedShipments,
    ...recoveryShipments,
  ].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const { data: boxCounts, error: boxCountsError } =
    await listBoxCountsByShipmentIds(
      supabase,
      shipments.map((s) => s.id),
    );
  if (boxCountsError) {
    throw boxCountsError;
  }

  const data: CheckerArrivalShipmentRow[] = shipments.map((s) => ({
    ...s,
    box_count: boxCounts.get(s.id) ?? 0,
  }));

  return { ok: true, data };
}

export async function getShipmentForChecker(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<
  | {
      ok: true;
      data: { shipment: Shipment; boxes: Box[]; discrepancies: Discrepancy[] };
    }
  | ServiceError
> {
  const checker = await requireCheckerProfile(supabase);
  if (!checker.ok) {
    return checker;
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

  const allowedStatuses = new Set(["in_transit", "arrived", "done", "issue"]);
  const hasAllowedStatus = allowedStatuses.has(shipment.status ?? "");

  const { data: boxes, error: boxesError } = await listBoxesByShipmentId(
    supabase,
    shipment.id,
  );
  if (boxesError) {
    throw boxesError;
  }

  // Recovery: allow access if the shipment has boxes still awaiting QC.
  const hasArrivedBoxes = boxes.some((box) => box.status === "arrived");
  if (!hasAllowedStatus && !hasArrivedBoxes) {
    return {
      ok: false,
      status: 409,
      message: "Shipment ini tidak dapat di-scan atau di-QC pada tahap ini.",
    };
  }

  const { data: discrepancies, error: discrepanciesError } =
    await listDiscrepanciesByShipmentId(supabase, shipment.id);
  if (discrepanciesError) {
    throw discrepanciesError;
  }

  return { ok: true, data: { shipment, boxes, discrepancies } };
}

export async function scanBoxArrival(
  supabase: SupabaseClient,
  input: { shipmentId: string; boxCode: string },
): Promise<{ ok: true; data: Box } | ServiceError> {
  const checker = await requireCheckerProfile(supabase);
  if (!checker.ok) {
    return checker;
  }

  const shipmentId =
    typeof input.shipmentId === "string" ? input.shipmentId.trim() : "";
  const boxCode =
    typeof input.boxCode === "string" ? input.boxCode.trim() : "";

  if (!shipmentId) {
    return { ok: false, status: 400, message: "Parameter shipment_id wajib diisi." };
  }
  if (!boxCode) {
    return { ok: false, status: 400, message: "Kode box wajib diisi." };
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
  if (shipment.status !== "in_transit") {
    return {
      ok: false,
      status: 409,
      message: "Shipment tidak dalam status dalam perjalanan (in transit).",
    };
  }

  const { data: box, error: boxError } = await getBoxByCode(supabase, boxCode);
  if (boxError) {
    throw boxError;
  }
  if (!box) {
    return { ok: false, status: 404, message: "Box tidak ditemukan." };
  }

  if (box.shipment_id !== shipment.id) {
    return {
      ok: false,
      status: 400,
      message: "Box ini bukan bagian dari shipment ini.",
    };
  }

  if (box.status === "arrived") {
    return {
      ok: false,
      status: 409,
      message: "Box ini sudah di-scan sebagai tiba (arrived).",
    };
  }
  if (box.status !== "pending") {
    return {
      ok: false,
      status: 409,
      message: `Box tidak dapat ditandai tiba (status saat ini: ${box.status ?? "tidak diketahui"}).`,
    };
  }

  const { data: updated, error: updateError } = await updateBoxStatus(
    supabase,
    box.id,
    "arrived",
    "pending",
  );
  if (updateError) {
    throw updateError;
  }
  if (!updated) {
    return {
      ok: false,
      status: 409,
      message: "Status box berubah sebelum sempat diperbarui. Coba lagi.",
    };
  }

  // Best-effort audit log; do not fail the scan if logging fails.
  await insertAuditLog(supabase, {
    user_id: checker.profile.id,
    action: "scan_box_arrival",
    target_table: "boxes",
    payload: {
      shipment_id: shipment.id,
      shipment_code: shipment.shipment_code,
      box_id: box.id,
      box_code: box.box_code,
      box_status_from: "pending",
      box_status_to: "arrived",
      actor_name: checker.profile.full_name,
    },
  });

  return { ok: true, data: updated };
}

export type QcBoxInput =
  | { shipmentId: string; boxId: string; decision: "accepted" }
  | {
      shipmentId: string;
      boxId: string;
      decision: "rejected";
      discrepancyType: DiscrepancyType;
      description: string;
      actualQty: number | null;
      evidenceFile?: File | null;
    };

export async function qcBox(
  supabase: SupabaseClient,
  input: QcBoxInput,
): Promise<
  | {
      ok: true;
      data: { box: Box; discrepancy: Discrepancy | null; qcComplete: boolean };
    }
  | ServiceError
> {
  const checker = await requireCheckerProfile(supabase);
  if (!checker.ok) {
    return checker;
  }

  const shipmentId =
    typeof input.shipmentId === "string" ? input.shipmentId.trim() : "";
  const boxId = typeof input.boxId === "string" ? input.boxId.trim() : "";

  if (!shipmentId) {
    return { ok: false, status: 400, message: "Parameter shipment_id wajib diisi." };
  }
  if (!boxId) {
    return { ok: false, status: 400, message: "Parameter box_id wajib diisi." };
  }
  if (input.decision !== "accepted" && input.decision !== "rejected") {
    return { ok: false, status: 400, message: "Keputusan QC tidak valid." };
  }

  let rejectionType: DiscrepancyType | null = null;
  let rejectionDescription = "";
  let actualQty: number | null = null;
  let evidenceFile: File | null = null;
  if (input.decision === "rejected") {
    if (!DISCREPANCY_TYPES.includes(input.discrepancyType)) {
      return { ok: false, status: 400, message: "Jenis selisih tidak valid." };
    }
    rejectionDescription =
      typeof input.description === "string" ? input.description.trim() : "";
    if (rejectionDescription.length === 0) {
      return {
        ok: false,
        status: 400,
        message: "Deskripsi selisih wajib diisi.",
      };
    }
    const parsedActualQty = parseActualQty(input.actualQty);
    if (!parsedActualQty.ok) {
      return { ok: false, status: 400, message: parsedActualQty.message };
    }

    rejectionType = input.discrepancyType;
    actualQty = ACTUAL_QTY_REQUIRED_TYPES.has(rejectionType)
      ? parsedActualQty.value
      : null;
    if (
      ACTUAL_QTY_REQUIRED_TYPES.has(rejectionType) &&
      parsedActualQty.value == null
    ) {
      return {
        ok: false,
        status: 400,
        message: "Qty aktual wajib untuk jenis selisih kurang dan lebih.",
      };
    }
    evidenceFile =
      input.evidenceFile instanceof File && input.evidenceFile.size > 0
        ? input.evidenceFile
        : null;
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

  const { data: box, error: boxError } = await getBoxById(supabase, boxId);
  if (boxError) {
    throw boxError;
  }
  if (!box) {
    return { ok: false, status: 404, message: "Box tidak ditemukan." };
  }

  if (box.shipment_id !== shipment.id) {
    return {
      ok: false,
      status: 400,
      message: "Box ini bukan bagian dari shipment ini.",
    };
  }

  if (box.status !== "arrived") {
    return {
      ok: false,
      status: 409,
      message: `Box belum siap untuk QC (status: ${box.status ?? "tidak diketahui"}).`,
    };
  }

  if (input.decision === "rejected" && rejectionType) {
    const actualQtyValidation = validateDiscrepancyActualQty(
      rejectionType,
      actualQty,
      box.qty_per_box,
    );
    if (!actualQtyValidation.ok) {
      return {
        ok: false,
        status: 400,
        message: actualQtyValidation.message,
      };
    }
  }

  const nextStatus: NonNullable<Box["status"]> =
    input.decision === "accepted" ? "accepted" : "rejected";

  const { data: updated, error: updateError } = await updateBoxStatus(
    supabase,
    box.id,
    nextStatus,
    "arrived",
  );
  if (updateError) {
    throw updateError;
  }

  // The UPDATE may succeed but return no row when a SELECT RLS policy
  // filters out the updated row. Re-read to confirm actual state.
  let finalBox: Box | null = updated;
  if (!finalBox) {
    const { data: refetched, error: refetchError } = await getBoxById(
      supabase,
      box.id,
    );
    if (refetchError) {
      throw refetchError;
    }
    finalBox = refetched;
  }

  if (!finalBox) {
    return {
      ok: false,
      status: 409,
      message: "Status box tidak berhasil diperbarui. Hubungi admin jika berulang.",
    };
  }
  if (finalBox.status !== nextStatus) {
    return {
      ok: false,
      status: 409,
      message: `Status box tidak berubah (saat ini: ${finalBox.status ?? "tidak diketahui"}). Hubungi admin jika berulang.`,
    };
  }

  let discrepancy: Discrepancy | null = null;
  if (input.decision === "rejected" && rejectionType) {
    let evidencePath: string | null = null;
    if (evidenceFile) {
      const uploadResult = await uploadDiscrepancyEvidence(supabase, {
        shipmentId: shipment.id,
        boxId: box.id,
        file: evidenceFile,
      });
      if (!uploadResult.ok) {
        return uploadResult;
      }
      evidencePath = uploadResult.path;
    }

    const { data: inserted, error: discrepancyError } = await insertDiscrepancy(
      supabase,
      {
        shipment_id: shipment.id,
        box_id: box.id,
        discrepancy_type: rejectionType,
        discrepancy_layer: "qc",
        description: rejectionDescription,
        reported_by: checker.profile.id,
        actual_qty: actualQty,
        evidence_path: evidencePath,
      },
    );
    if (discrepancyError) {
      throw discrepancyError;
    }
    discrepancy = inserted;
  }

  // Best-effort audit log; do not fail the QC if logging fails.
  await insertAuditLog(supabase, {
    user_id: checker.profile.id,
    action: input.decision === "accepted" ? "qc_box_accepted" : "qc_box_rejected",
    target_table: "boxes",
    payload: {
      shipment_id: shipment.id,
      shipment_code: shipment.shipment_code,
      box_id: box.id,
      box_code: box.box_code,
      box_status_from: "arrived",
      box_status_to: nextStatus,
      discrepancy_id: discrepancy?.id ?? null,
      discrepancy_type: discrepancy?.discrepancy_type ?? null,
      discrepancy_layer: discrepancy?.discrepancy_layer ?? null,
      actor_name: checker.profile.full_name,
    },
  });

  // --- QC completion: transition shipment when no arrived boxes remain ---
  let qcComplete = false;
  const { data: remainingBoxes, error: remainingError } =
    await listBoxesByShipmentId(supabase, shipment.id);
  if (remainingError) throw remainingError;

  const hasArrivedBoxes = remainingBoxes.some((b) => b.status === "arrived");
  if (!hasArrivedBoxes && shipment.status === "arrived") {
    qcComplete = true;
    const { data: allDiscrepancies, error: discListError } =
      await listDiscrepanciesByShipmentId(supabase, shipment.id);
    if (discListError) throw discListError;

    const nextStatus = allDiscrepancies.length > 0 ? "issue" : "done";
    const { error: transitionError } = await updateShipmentStatus(
      supabase,
      shipment.id,
      nextStatus,
      "arrived",
    );
    if (transitionError) throw transitionError;
  }

  return { ok: true, data: { box: finalBox, discrepancy, qcComplete } };
}

export async function getDiscrepancyEvidenceUrlMap(
  supabase: SupabaseClient,
  discrepancies: Discrepancy[],
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};

  if (!EVIDENCE_BUCKET) {
    return result;
  }

  await Promise.all(
    discrepancies.map(async (discrepancy) => {
      if (!discrepancy.evidence_path) {
        return;
      }

      const { data, error } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUrl(discrepancy.evidence_path, 60 * 60);

      result[discrepancy.id] = error ? null : data.signedUrl;
    }),
  );

  return result;
}

export async function finalizeScanForShipment(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<
  | {
      ok: true;
      data: {
        shipment: Shipment;
        poVendorDiscrepancyCount: number;
        arrivalDiscrepancyCount: number;
        missingBoxCount: number;
      };
    }
  | ServiceError
> {
  const checker = await requireCheckerProfile(supabase);
  if (!checker.ok) {
    return checker;
  }

  const trimmedShipmentId =
    typeof shipmentId === "string" ? shipmentId.trim() : "";
  if (!trimmedShipmentId) {
    return { ok: false, status: 400, message: "Parameter shipment_id wajib diisi." };
  }

  const { data: shipment, error: shipmentError } = await getShipmentById(
    supabase,
    trimmedShipmentId,
  );
  if (shipmentError) {
    throw shipmentError;
  }
  if (!shipment) {
    return { ok: false, status: 404, message: "Shipment tidak ditemukan." };
  }
  if (shipment.status !== "in_transit") {
    return {
      ok: false,
      status: 409,
      message: "Shipment tidak dalam status dalam perjalanan (in transit).",
    };
  }

  const { data: boxes, error: boxesError } = await listBoxesByShipmentId(
    supabase,
    shipment.id,
  );
  if (boxesError) {
    throw boxesError;
  }

  // Snapshot tables may lack RLS SELECT policies for checker role.
  // Use admin client to guarantee reads succeed.
  const admin = createAdminClient();

  const { data: snapshots, error: snapshotsError } =
    await listShipmentSnapshotsByShipmentId(admin, shipment.id);
  if (snapshotsError) {
    throw snapshotsError;
  }

  const { data: boxSnapshots, error: boxSnapshotsError } =
    await listShipmentBoxSnapshotsByShipmentId(admin, shipment.id);
  if (boxSnapshotsError) {
    throw boxSnapshotsError;
  }

  let poVendorDiscrepancyCount = 0;
  let arrivalDiscrepancyCount = 0;
  let missingBoxCount = 0;

  // --- A. PO vs Vendor reconciliation ---
  // Compare PO expected quantities against vendor-declared packed totals.
  const vendorTotalByPart = new Map<string, number>();
  for (const bs of boxSnapshots) {
    vendorTotalByPart.set(
      bs.part_number,
      (vendorTotalByPart.get(bs.part_number) ?? 0) + bs.qty_per_box,
    );
  }

  for (const snap of snapshots) {
    const poQty = snap.expected_qty;
    const vendorQty = vendorTotalByPart.get(snap.part_number) ?? 0;

    if (vendorQty < poQty) {
      const { error: discErr } = await insertDiscrepancy(admin, {
        shipment_id: shipment.id,
        box_id: null,
        discrepancy_type: "missing",
        discrepancy_layer: "po_vendor",
        description: `Vendor mem-pack ${vendorQty} pcs untuk part ${snap.part_number}; PO memesan ${poQty} pcs`,
        reported_by: checker.profile.id,
        actual_qty: vendorQty,
      });
      if (discErr) throw discErr;
      poVendorDiscrepancyCount += 1;
    } else if (vendorQty > poQty) {
      const { error: discErr } = await insertDiscrepancy(admin, {
        shipment_id: shipment.id,
        box_id: null,
        discrepancy_type: "over",
        discrepancy_layer: "po_vendor",
        description: `Vendor mem-pack ${vendorQty} pcs untuk part ${snap.part_number}; PO memesan ${poQty} pcs`,
        reported_by: checker.profile.id,
        actual_qty: vendorQty,
      });
      if (discErr) throw discErr;
      poVendorDiscrepancyCount += 1;
    }
  }

  // --- B. Outbound Vendor vs Inbound Factory reconciliation ---
  // Pending boxes were never scanned → arrival-layer missing discrepancy.
  for (const box of boxes) {
    if (box.status !== "pending") {
      continue;
    }

    const { error: discErr } = await insertDiscrepancy(admin, {
      shipment_id: shipment.id,
      box_id: box.id,
      discrepancy_type: "missing",
      discrepancy_layer: "arrival",
      description: `Box ${box.box_code} (part ${box.part_number}, qty ${box.qty_per_box}) belum di-scan saat inbound`,
      reported_by: checker.profile.id,
      actual_qty: 0,
    });
    if (discErr) throw discErr;
    arrivalDiscrepancyCount += 1;

    const { data: updatedBox, error: updateBoxError } = await updateBoxStatus(
      supabase,
      box.id,
      "rejected",
      "pending",
    );
    if (updateBoxError) throw updateBoxError;

    let finalBox = updatedBox;
    if (!finalBox) {
      const { data: refetchedBox, error: refetchBoxError } = await getBoxById(
        supabase,
        box.id,
      );
      if (refetchBoxError) throw refetchBoxError;
      finalBox = refetchedBox;
    }

    if (!finalBox || finalBox.status !== "rejected") {
      return {
        ok: false,
        status: 409,
        message: `Status box ${box.box_code} tidak berhasil diperbarui. Hubungi admin jika berulang.`,
      };
    }

    missingBoxCount += 1;
  }

  // --- Transition shipment to arrived ---
  const shipmentUpdate = await confirmShipmentStatus(
    supabase,
    shipment.id,
    "arrived",
  );
  if (!shipmentUpdate.ok) {
    return shipmentUpdate;
  }

  await insertAuditLog(supabase, {
    user_id: checker.profile.id,
    action: "finalize_scan",
    target_table: "shipments",
    payload: {
      shipment_id: shipment.id,
      shipment_code: shipment.shipment_code,
      po_vendor_discrepancy_count: poVendorDiscrepancyCount,
      arrival_discrepancy_count: arrivalDiscrepancyCount,
      missing_box_count: missingBoxCount,
      shipment_status_from: "in_transit",
      shipment_status_to: shipmentUpdate.shipment.status,
      actor_name: checker.profile.full_name,
    },
  });

  return {
    ok: true,
    data: {
      shipment: shipmentUpdate.shipment,
      poVendorDiscrepancyCount,
      arrivalDiscrepancyCount,
      missingBoxCount,
    },
  };
}
