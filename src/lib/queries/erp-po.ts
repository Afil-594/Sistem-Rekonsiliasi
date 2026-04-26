import type { SupabaseClient } from "@supabase/supabase-js";
import type { ErpPoHeader, ErpPoItem } from "@/types/erp-po";

export async function listHeadersByVendorCode(
  supabase: SupabaseClient,
  vendorCode: string,
): Promise<{ data: ErpPoHeader[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("erp_po_headers")
    .select("po_number, vendor_code, created_at")
    .eq("vendor_code", vendorCode)
    .order("po_number", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return { data: (data ?? []) as ErpPoHeader[], error: null };
}

export async function getHeaderByPoNumber(
  supabase: SupabaseClient,
  poNumber: string,
): Promise<{ data: ErpPoHeader | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("erp_po_headers")
    .select("po_number, vendor_code, created_at")
    .eq("po_number", poNumber)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: (data as ErpPoHeader | null) ?? null, error: null };
}

export async function listItemsByPoNumber(
  supabase: SupabaseClient,
  poNumber: string,
): Promise<{ data: ErpPoItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("erp_po_items")
    .select(
      "id, po_number, part_number, part_name, quantity_ordered, unit",
    )
    .eq("po_number", poNumber)
    .order("part_number", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return { data: (data ?? []) as ErpPoItem[], error: null };
}
