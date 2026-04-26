import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getHeaderByPoNumber,
  listHeadersByVendorCode,
  listItemsByPoNumber,
} from "@/lib/queries/erp-po";
import type { ErpPoDetail, ErpPoHeader } from "@/types/erp-po";

function normalizeVendorCode(vendorCode: string | undefined | null): string {
  return typeof vendorCode === "string" ? vendorCode.trim() : "";
}

export async function listPurchaseOrdersByVendor(
  supabase: SupabaseClient,
  vendorCodeRaw: string | undefined | null,
): Promise<
  { ok: true; data: ErpPoHeader[] } | { ok: false; status: 400; message: string }
> {
  const vendorCode = normalizeVendorCode(vendorCodeRaw);
  if (!vendorCode) {
    return { ok: false, status: 400, message: "Vendor code wajib diisi." };
  }
  const { data, error } = await listHeadersByVendorCode(supabase, vendorCode);
  if (error) {
    throw error;
  }
  return { ok: true, data };
}

export async function getPurchaseOrderDetail(
  supabase: SupabaseClient,
  poNumber: string,
  vendorCodeRaw: string | undefined | null,
): Promise<
  | { ok: true; data: ErpPoDetail }
  | { ok: false; status: 400; message: string }
  | { ok: false; status: 404; message: string }
> {
  const vendorCode = normalizeVendorCode(vendorCodeRaw);
  if (!vendorCode) {
    return { ok: false, status: 400, message: "Vendor code wajib diisi." };
  }
  const { data: header, error: headerError } = await getHeaderByPoNumber(
    supabase,
    poNumber,
  );
  if (headerError) {
    throw headerError;
  }
  if (!header) {
    return { ok: false, status: 404, message: "PO tidak ditemukan." };
  }
  if (header.vendor_code !== vendorCode) {
    return { ok: false, status: 404, message: "PO tidak ditemukan." };
  }
  const { data: items, error: itemsError } = await listItemsByPoNumber(
    supabase,
    poNumber,
  );
  if (itemsError) {
    throw itemsError;
  }
  return { ok: true, data: { header, items } };
}
