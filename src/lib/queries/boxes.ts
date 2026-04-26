import type { SupabaseClient } from "@supabase/supabase-js";
import type { Box, BoxInsertInput } from "@/types/box";

type QueryError = {
  code?: string;
  message: string;
};

const BOX_COLUMNS =
  "id, shipment_id, box_code, part_number, qty_per_box, lot_number, status";

export async function countBoxes(
  supabase: SupabaseClient,
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from("boxes")
    .select("*", { count: "exact", head: true });

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

export async function listBoxesByStatus(
  supabase: SupabaseClient,
  status: NonNullable<Box["status"]>,
): Promise<{ data: Box[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("boxes")
    .select(BOX_COLUMNS)
    .eq("status", status)
    .order("box_code", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Box[], error: null };
}

export async function listBoxesByShipmentId(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<{ data: Box[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("boxes")
    .select(BOX_COLUMNS)
    .eq("shipment_id", shipmentId)
    .order("box_code", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return { data: (data ?? []) as Box[], error: null };
}

export async function getBoxByCode(
  supabase: SupabaseClient,
  boxCode: string,
): Promise<{ data: Box | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("boxes")
    .select(BOX_COLUMNS)
    .eq("box_code", boxCode)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: (data as Box | null) ?? null, error: null };
}

export async function getBoxById(
  supabase: SupabaseClient,
  boxId: string,
): Promise<{ data: Box | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("boxes")
    .select(BOX_COLUMNS)
    .eq("id", boxId)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: (data as Box | null) ?? null, error: null };
}

/** Read-only: map `box_id` → `part_number` for a set of box IDs (e.g. audit payload joins). */
export async function getPartNumbersByBoxIds(
  supabase: SupabaseClient,
  boxIds: string[],
): Promise<{ data: Record<string, string>; error: Error | null }> {
  if (boxIds.length === 0) {
    return { data: {}, error: null };
  }
  const { data, error } = await supabase
    .from("boxes")
    .select("id, part_number")
    .in("id", boxIds);

  if (error) {
    return { data: {}, error: new Error(error.message) };
  }
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const r = row as { id: string; part_number: string };
    if (r.id) {
      map[r.id] = r.part_number;
    }
  }
  return { data: map, error: null };
}

export async function updateBoxStatus(
  supabase: SupabaseClient,
  boxId: string,
  nextStatus: NonNullable<Box["status"]>,
  expectedCurrentStatus?: NonNullable<Box["status"]>,
): Promise<{ data: Box | null; error: Error | null }> {
  let query = supabase
    .from("boxes")
    .update({ status: nextStatus })
    .eq("id", boxId);

  if (expectedCurrentStatus) {
    query = query.eq("status", expectedCurrentStatus);
  }

  const { data, error } = await query.select(BOX_COLUMNS).maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: (data as Box | null) ?? null, error: null };
}

export async function deleteBoxesByShipmentAndPart(
  supabase: SupabaseClient,
  shipmentId: string,
  partNumber: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("boxes")
    .delete()
    .eq("shipment_id", shipmentId)
    .eq("part_number", partNumber);

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

export async function insertBoxes(
  supabase: SupabaseClient,
  inputs: BoxInsertInput[],
): Promise<{ data: Box[]; error: QueryError | null }> {
  const { data, error } = await supabase
    .from("boxes")
    .insert(inputs)
    .select(BOX_COLUMNS);

  if (error) {
    return { data: [], error: { code: error.code, message: error.message } };
  }
  return { data: (data ?? []) as Box[], error: null };
}
