import type { SupabaseClient } from "@supabase/supabase-js";
import { insertAuditLog } from "@/lib/queries/audit-logs";
import {
  getHeaderByPoNumber,
  listItemsByPoNumber,
} from "@/lib/queries/erp-po";
import { getProfileById } from "@/lib/queries/profiles";
import {
  getShipmentById,
  insertShipment,
  listShipmentsByPoAndVendor,
  listShipmentsByVendorId,
  updateShipmentStatus,
} from "@/lib/queries/shipments";
import { listBoxCountsByShipmentIds, listBoxesByShipmentId } from "@/lib/queries/boxes";
import { listDiscrepanciesByShipmentId } from "@/lib/queries/discrepancies";
import {
  buildVendorProgressFields,
  VENDOR_SHIPMENT_PROCESSING_DB_STATUSES,
} from "@/lib/utils/vendor-shipment-visibility";
import {
  insertShipmentBoxSnapshots,
  insertShipmentSnapshots,
} from "@/lib/queries/shipment-snapshots";
import { generateShipmentCode } from "@/lib/utils/shipment-code";
import type { Box } from "@/types/box";
import type { Shipment, ShipmentDetail, VendorShipmentListRow } from "@/types/shipment";

function normalizePoReference(value: string | undefined | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function getCurrentVendorProfile(supabase: SupabaseClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    return {
      ok: false as const,
      status: 401 as const,
      message: "Silakan masuk terlebih dahulu.",
    };
  }

  const { data: profile, error: profileError } = await getProfileById(
    supabase,
    user.id,
  );

  if (profileError) {
    throw profileError;
  }

  if (!profile || profile.role !== "vendor") {
    return {
      ok: false as const,
      status: 403 as const,
      message: "Akses ditolak: peran vendor tidak ditemukan.",
    };
  }

  if (!profile.vendor_code) {
    return {
      ok: false as const,
      status: 403 as const,
      message: "Profil vendor belum memiliki vendor code.",
    };
  }

  return { ok: true as const, profile };
}

function isDuplicateShipmentCodeError(error: { code?: string } | null) {
  return error?.code === "23505";
}

function vendorDisplayNameForDetail(profile: {
  full_name: string | null;
  vendor_code: string | null;
}): string {
  const name = profile.full_name?.trim();
  if (name) {
    return name;
  }
  const code = profile.vendor_code?.trim();
  if (code) {
    return code;
  }
  return "—";
}

export async function createShipmentDraft(
  supabase: SupabaseClient,
  poReferenceRaw: string | undefined | null,
): Promise<
  | { ok: true; data: ShipmentDetail }
  | { ok: false; status: 400; message: string }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
  | { ok: false; status: 404; message: string }
  | { ok: false; status: 409; message: string }
> {
  const poReference = normalizePoReference(poReferenceRaw);

  if (!poReference) {
    return { ok: false, status: 400, message: "Referensi PO wajib diisi." };
  }

  const vendorProfileResult = await getCurrentVendorProfile(supabase);
  if (!vendorProfileResult.ok) {
    return vendorProfileResult;
  }

  const { data: header, error: headerError } = await getHeaderByPoNumber(
    supabase,
    poReference,
  );

  if (headerError) {
    throw headerError;
  }

  if (!header) {
    return { ok: false, status: 404, message: "PO tidak ditemukan." };
  }

  if (header.vendor_code !== vendorProfileResult.profile.vendor_code) {
    return {
      ok: false,
      status: 403,
      message: "PO ini tidak terkait dengan akun vendor yang sedang masuk.",
    };
  }

  const { data: existingShipments, error: existingError } =
    await listShipmentsByPoAndVendor(
      supabase,
      header.po_number,
      vendorProfileResult.profile.id,
    );
  if (existingError) {
    throw existingError;
  }

  if (existingShipments.length > 0) {
    const pending = existingShipments.find((row) => row.status === "pending");
    if (pending) {
      const { data: poItems, error: poItemsError } = await listItemsByPoNumber(
        supabase,
        header.po_number,
      );
      if (poItemsError) {
        throw poItemsError;
      }
      const { data: boxes, error: boxesError } = await listBoxesByShipmentId(
        supabase,
        pending.id,
      );
      if (boxesError) {
        throw boxesError;
      }
      return {
        ok: true,
        data: {
          shipment: pending,
          vendorDisplayName: vendorDisplayNameForDetail(vendorProfileResult.profile),
          poVendorCode: header.vendor_code,
          poItems,
          boxes,
          ...buildVendorProgressFields(pending, boxes, []),
        },
      };
    }

    const active = existingShipments[0];
    return {
      ok: false,
      status: 409,
      message: `PO ini sudah punya shipment (${active.shipment_code}, status: ${active.status ?? "tidak diketahui"}). Hanya satu shipment per PO.`,
    };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shipmentCode = generateShipmentCode();
    const { data: shipment, error: shipmentError } = await insertShipment(
      supabase,
      {
        shipment_code: shipmentCode,
        po_reference: header.po_number,
        vendor_id: vendorProfileResult.profile.id,
        status: "pending",
      },
    );

    if (shipmentError) {
      if (isDuplicateShipmentCodeError(shipmentError)) {
        continue;
      }

      throw new Error(shipmentError.message);
    }

    if (!shipment) {
      throw new Error("Shipment draft could not be created");
    }

    const { data: poItems, error: poItemsError } = await listItemsByPoNumber(
      supabase,
      header.po_number,
    );
    if (poItemsError) {
      throw poItemsError;
    }

    await insertAuditLog(supabase, {
      user_id: vendorProfileResult.profile.id,
      action: "create_shipment",
      target_table: "shipments",
      payload: {
        shipment_id: shipment.id,
        shipment_code: shipment.shipment_code,
        po_reference: header.po_number,
        actor_name: vendorProfileResult.profile.full_name,
      },
    });

    return {
      ok: true,
      data: {
        shipment,
        vendorDisplayName: vendorDisplayNameForDetail(vendorProfileResult.profile),
        poVendorCode: header.vendor_code,
        poItems,
        boxes: [],
        ...buildVendorProgressFields(shipment, [], []),
      },
    };
  }

  throw new Error("Could not generate a unique shipment_code");
}

function resolveVendorShipmentListQuery(raw: string): {
  status?: NonNullable<Shipment["status"]>;
  statusIn?: readonly NonNullable<Shipment["status"]>[];
} | undefined {
  if (raw === "" || raw === "all") {
    return undefined;
  }
  if (raw === "processing") {
    return { statusIn: VENDOR_SHIPMENT_PROCESSING_DB_STATUSES };
  }
  if (raw === "issue" || raw === "done") {
    return { status: raw };
  }
  if (raw === "pending" || raw === "in_transit" || raw === "arrived") {
    return { statusIn: VENDOR_SHIPMENT_PROCESSING_DB_STATUSES };
  }
  return undefined;
}

export async function listVendorShipments(
  supabase: SupabaseClient,
  options?: { status?: string | null },
): Promise<
  | { ok: true; data: VendorShipmentListRow[] }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
> {
  const vendorProfileResult = await getCurrentVendorProfile(supabase);
  if (!vendorProfileResult.ok) {
    return vendorProfileResult;
  }

  const raw = typeof options?.status === "string" ? options.status.trim() : "";
  const listOpts = resolveVendorShipmentListQuery(raw);

  const { data, error } = await listShipmentsByVendorId(
    supabase,
    vendorProfileResult.profile.id,
    listOpts,
  );
  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const { data: boxCounts, error: boxCountsError } =
    await listBoxCountsByShipmentIds(
      supabase,
      rows.map((s) => s.id),
    );
  if (boxCountsError) {
    throw boxCountsError;
  }

  const dataWithCounts: VendorShipmentListRow[] = rows.map((s) => ({
    ...s,
    box_count: boxCounts.get(s.id) ?? 0,
  }));

  return { ok: true, data: dataWithCounts };
}

export async function getVendorShipmentForPo(
  supabase: SupabaseClient,
  poNumber: string,
): Promise<
  | { ok: true; data: Shipment | null }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
> {
  const vendorProfileResult = await getCurrentVendorProfile(supabase);
  if (!vendorProfileResult.ok) {
    return vendorProfileResult;
  }

  const { data, error } = await listShipmentsByPoAndVendor(
    supabase,
    poNumber,
    vendorProfileResult.profile.id,
  );
  if (error) {
    throw error;
  }

  if (data.length === 0) {
    return { ok: true, data: null };
  }

  const pending = data.find((row) => row.status === "pending");
  return { ok: true, data: pending ?? data[0] };
}

export async function getShipmentBoxLabelsForVendor(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<
  | { ok: true; data: { shipment: Shipment; boxes: Box[] } }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
  | { ok: false; status: 404; message: string }
  | { ok: false; status: 409; message: string }
> {
  const vendorProfileResult = await getCurrentVendorProfile(supabase);
  if (!vendorProfileResult.ok) {
    return vendorProfileResult;
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

  if (shipment.vendor_id !== vendorProfileResult.profile.id) {
    return { ok: false, status: 404, message: "Shipment tidak ditemukan." };
  }

  if (shipment.status !== "in_transit") {
    return {
      ok: false,
      status: 409,
      message:
        "Label box hanya tersedia untuk shipment yang sudah dikonfirmasi (in transit).",
    };
  }

  const { data: boxes, error: boxesError } = await listBoxesByShipmentId(
    supabase,
    shipment.id,
  );
  if (boxesError) {
    throw boxesError;
  }

  return { ok: true, data: { shipment, boxes } };
}

export async function getShipmentDetailForVendor(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<
  | { ok: true; data: ShipmentDetail }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
  | { ok: false; status: 404; message: string }
> {
  const vendorProfileResult = await getCurrentVendorProfile(supabase);
  if (!vendorProfileResult.ok) {
    return vendorProfileResult;
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

  if (shipment.vendor_id !== vendorProfileResult.profile.id) {
    return { ok: false, status: 404, message: "Shipment tidak ditemukan." };
  }

  let poVendorCode: string | null = null;
  let poItems: ShipmentDetail["poItems"] = [];
  if (shipment.po_reference) {
    const { data: header, error: headerError } = await getHeaderByPoNumber(
      supabase,
      shipment.po_reference,
    );

    if (headerError) {
      throw headerError;
    }

    poVendorCode = header?.vendor_code ?? null;

    const { data: items, error: itemsError } = await listItemsByPoNumber(
      supabase,
      shipment.po_reference,
    );
    if (itemsError) {
      throw itemsError;
    }
    poItems = items;
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

  return {
    ok: true,
    data: {
      shipment,
      vendorDisplayName: vendorDisplayNameForDetail(vendorProfileResult.profile),
      poVendorCode,
      poItems,
      boxes,
      ...buildVendorProgressFields(shipment, boxes, discrepancies),
    },
  };
}

export async function confirmShipment(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<
  | { ok: true; data: Shipment }
  | { ok: false; status: 400; message: string }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
  | { ok: false; status: 404; message: string }
  | { ok: false; status: 409; message: string }
> {
  const vendorProfileResult = await getCurrentVendorProfile(supabase);
  if (!vendorProfileResult.ok) {
    return vendorProfileResult;
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
  if (shipment.vendor_id !== vendorProfileResult.profile.id) {
    return { ok: false, status: 404, message: "Shipment tidak ditemukan." };
  }
  if (shipment.status !== "pending") {
    return {
      ok: false,
      status: 409,
      message: "Shipment sudah terkonfirmasi sebelumnya (bukan status draft).",
    };
  }
  if (!shipment.po_reference) {
    return {
      ok: false,
      status: 400,
      message: "Shipment belum memiliki referensi PO.",
    };
  }

  const { data: poItems, error: poItemsError } = await listItemsByPoNumber(
    supabase,
    shipment.po_reference,
  );
  if (poItemsError) {
    throw poItemsError;
  }
  if (poItems.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "PO terkait tidak memiliki line item.",
    };
  }

  const { data: boxes, error: boxesError } = await listBoxesByShipmentId(
    supabase,
    shipment.id,
  );
  if (boxesError) {
    throw boxesError;
  }
  if (boxes.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Belum ada box pada shipment ini.",
    };
  }

  const packedQtyByPart = new Map<string, number>();
  for (const box of boxes) {
    packedQtyByPart.set(
      box.part_number,
      (packedQtyByPart.get(box.part_number) ?? 0) + box.qty_per_box,
    );
  }

  const unpackedParts: string[] = [];
  for (const item of poItems) {
    const packed = packedQtyByPart.get(item.part_number) ?? 0;
    if (packed === 0) {
      unpackedParts.push(item.part_number);
    }
  }

  if (unpackedParts.length > 0) {
    return {
      ok: false,
      status: 400,
      message: `Part berikut belum punya box: ${unpackedParts.join(", ")}`,
    };
  }

  const { error: snapshotError } = await insertShipmentSnapshots(
    supabase,
    poItems.map((item) => ({
      shipment_id: shipment.id,
      part_number: item.part_number,
      part_name: item.part_name,
      expected_qty: item.quantity_ordered,
    })),
  );
  if (snapshotError) {
    return {
      ok: false,
      status: 400,
      message: `Gagal membuat snapshot PO: ${snapshotError.message}`,
    };
  }

  const { error: boxSnapshotError } = await insertShipmentBoxSnapshots(
    supabase,
    boxes.map((box) => ({
      shipment_id: shipment.id,
      box_code: box.box_code,
      part_number: box.part_number,
      qty_per_box: box.qty_per_box,
      lot_number: box.lot_number,
    })),
  );
  if (boxSnapshotError) {
    return {
      ok: false,
      status: 400,
      message: `Gagal membuat snapshot box: ${boxSnapshotError.message}`,
    };
  }

  const { data: updatedShipment, error: updateError } =
    await updateShipmentStatus(supabase, shipment.id, "in_transit", "pending");
  if (updateError) {
    throw updateError;
  }
  if (!updatedShipment) {
    return {
      ok: false,
      status: 409,
      message: "Status shipment berubah sebelum sempat dikonfirmasi. Coba lagi.",
    };
  }

  await insertAuditLog(supabase, {
    user_id: vendorProfileResult.profile.id,
    action: "confirm_shipment",
    target_table: "shipments",
    payload: {
      shipment_id: shipment.id,
      shipment_code: shipment.shipment_code,
      po_reference: shipment.po_reference,
      box_count: boxes.length,
      shipment_status_from: "pending",
      shipment_status_to: "in_transit",
      actor_name: vendorProfileResult.profile.full_name,
    },
  });

  return { ok: true, data: updatedShipment };
}
