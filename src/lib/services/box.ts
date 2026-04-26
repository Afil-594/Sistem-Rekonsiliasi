import type { SupabaseClient } from "@supabase/supabase-js";
import { listItemsByPoNumber } from "@/lib/queries/erp-po";
import { getProfileById } from "@/lib/queries/profiles";
import { getShipmentById } from "@/lib/queries/shipments";
import {
  deleteBoxesByShipmentAndPart,
  insertBoxes,
  listBoxesByShipmentId,
} from "@/lib/queries/boxes";
import { generateBoxCode } from "@/lib/utils/box-code";
import type { Box, BoxInsertInput } from "@/types/box";
import type { ErpPoItem } from "@/types/erp-po";
import type { Shipment } from "@/types/shipment";

type VendorShipmentContext = {
  shipment: Shipment;
  poItems: ErpPoItem[];
};

type ServiceError =
  | { ok: false; status: 400; message: string }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
  | { ok: false; status: 404; message: string }
  | { ok: false; status: 409; message: string };

async function requireVendorProfile(supabase: SupabaseClient) {
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

  return { ok: true as const, profile };
}

async function loadVendorShipmentContext(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<
  | { ok: true; data: VendorShipmentContext }
  | ServiceError
> {
  const vendorResult = await requireVendorProfile(supabase);
  if (!vendorResult.ok) {
    return vendorResult;
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
  if (shipment.vendor_id !== vendorResult.profile.id) {
    return { ok: false, status: 404, message: "Shipment tidak ditemukan." };
  }
  if (shipment.status !== "pending") {
    return {
      ok: false,
      status: 409,
      message: "Shipment sudah tidak dalam status draft.",
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

  return { ok: true, data: { shipment, poItems } };
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  );
}

function isDuplicateCodeError(error: { code?: string } | null) {
  return error?.code === "23505";
}

async function insertBoxesWithUniqueCodes(
  supabase: SupabaseClient,
  baseInputs: Omit<BoxInsertInput, "box_code">[],
): Promise<{ data: Box[]; error: string | null }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inputs: BoxInsertInput[] = baseInputs.map((row) => ({
      ...row,
      box_code: generateBoxCode(),
    }));

    const { data, error } = await insertBoxes(supabase, inputs);
    if (!error) {
      return { data, error: null };
    }
    if (!isDuplicateCodeError(error)) {
      return { data: [], error: error.message };
    }
  }

  return {
    data: [],
    error: "Gagal membuat kode box unik setelah beberapa percobaan.",
  };
}

export async function listBoxesForVendorShipment(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<
  | { ok: true; data: Box[] }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
  | { ok: false; status: 404; message: string }
> {
  const vendorResult = await requireVendorProfile(supabase);
  if (!vendorResult.ok) {
    return vendorResult;
  }

  const { data: shipment, error: shipmentError } = await getShipmentById(
    supabase,
    shipmentId,
  );
  if (shipmentError) {
    throw shipmentError;
  }
  if (!shipment || shipment.vendor_id !== vendorResult.profile.id) {
    return { ok: false, status: 404, message: "Shipment tidak ditemukan." };
  }

  const { data, error } = await listBoxesByShipmentId(supabase, shipmentId);
  if (error) {
    throw error;
  }
  return { ok: true, data };
}

export type CreateBoxesInput =
  | {
      mode: "manual";
      shipment_id: string;
      part_number: string;
      lot_number: string;
      qty_per_box: number[];
      replace?: boolean;
    }
  | {
      mode: "auto";
      shipment_id: string;
      part_number: string;
      lot_number: string;
      box_count: number;
      total_qty: number;
      replace?: boolean;
    };

export async function createBoxes(
  supabase: SupabaseClient,
  input: CreateBoxesInput,
): Promise<
  | { ok: true; data: Box[] }
  | ServiceError
> {
  const shipmentId =
    typeof input.shipment_id === "string" ? input.shipment_id.trim() : "";
  const partNumber =
    typeof input.part_number === "string" ? input.part_number.trim() : "";
  const lotNumber =
    typeof input.lot_number === "string" ? input.lot_number.trim() : "";

  if (!shipmentId) {
    return { ok: false, status: 400, message: "Parameter shipment_id wajib diisi." };
  }
  if (!partNumber) {
    return { ok: false, status: 400, message: "Nomor part wajib diisi." };
  }
  if (!lotNumber) {
    return { ok: false, status: 400, message: "Nomor lot wajib diisi." };
  }

  const ctxResult = await loadVendorShipmentContext(supabase, shipmentId);
  if (!ctxResult.ok) {
    return ctxResult;
  }

  const poItem = ctxResult.data.poItems.find(
    (row) => row.part_number === partNumber,
  );
  if (!poItem) {
    return {
      ok: false,
      status: 400,
      message: "Part ini tidak ada di PO shipment ini.",
    };
  }

  let qtyList: number[];

  if (input.mode === "manual") {
    if (!Array.isArray(input.qty_per_box) || input.qty_per_box.length === 0) {
      return {
        ok: false,
        status: 400,
        message: "Daftar qty_per_box tidak boleh kosong.",
      };
    }
    for (const qty of input.qty_per_box) {
      if (!isPositiveInteger(qty)) {
        return {
          ok: false,
          status: 400,
          message: "Setiap qty_per_box harus bilangan bulat positif.",
        };
      }
    }
    qtyList = input.qty_per_box;
  } else {
    if (!isPositiveInteger(input.box_count)) {
      return {
        ok: false,
        status: 400,
        message: "Jumlah box harus bilangan bulat positif.",
      };
    }
    if (!isPositiveInteger(input.total_qty)) {
      return {
        ok: false,
        status: 400,
        message: "Total qty harus bilangan bulat positif.",
      };
    }
    if (input.total_qty % input.box_count !== 0) {
      return {
        ok: false,
        status: 400,
        message: `Total qty (${input.total_qty}) tidak habis dibagi merata ke ${input.box_count} box.`,
      };
    }
    const qtyPerBox = input.total_qty / input.box_count;
    qtyList = Array.from({ length: input.box_count }, () => qtyPerBox);
  }

  const baseInputs: Omit<BoxInsertInput, "box_code">[] = qtyList.map((qty) => ({
    shipment_id: shipmentId,
    part_number: partNumber,
    qty_per_box: qty,
    lot_number: lotNumber,
  }));

  if (input.replace === true) {
    const { error: deleteError } = await deleteBoxesByShipmentAndPart(
      supabase,
      shipmentId,
      partNumber,
    );
    if (deleteError) {
      throw deleteError;
    }
  }

  const result = await insertBoxesWithUniqueCodes(supabase, baseInputs);
  if (result.error) {
    throw new Error(result.error);
  }

  return { ok: true, data: result.data };
}
