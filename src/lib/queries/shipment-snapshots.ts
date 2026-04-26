import type { SupabaseClient } from "@supabase/supabase-js";

export type ShipmentSnapshotInsertInput = {
  shipment_id: string;
  part_number: string;
  part_name: string;
  expected_qty: number;
};

export type ShipmentSnapshot = {
  id: string;
  shipment_id: string;
  part_number: string;
  part_name: string;
  expected_qty: number;
  created_at: string | null;
};

export type ShipmentBoxSnapshotInsertInput = {
  shipment_id: string;
  box_code: string;
  part_number: string;
  qty_per_box: number;
  lot_number: string;
};

export type ShipmentBoxSnapshot = {
  id: string;
  shipment_id: string;
  box_code: string;
  part_number: string;
  qty_per_box: number;
  lot_number: string;
  created_at: string | null;
};

export async function insertShipmentSnapshots(
  supabase: SupabaseClient,
  rows: ShipmentSnapshotInsertInput[],
): Promise<{ count: number; error: Error | null }> {
  if (rows.length === 0) {
    return { count: 0, error: null };
  }

  const { data, error } = await supabase
    .from("shipment_snapshots")
    .insert(rows)
    .select("id");

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }
  return { count: data?.length ?? 0, error: null };
}

export async function listShipmentSnapshotsByShipmentId(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<{ data: ShipmentSnapshot[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("shipment_snapshots")
    .select("id, shipment_id, part_number, part_name, expected_qty, created_at")
    .eq("shipment_id", shipmentId)
    .order("part_number", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return { data: (data ?? []) as ShipmentSnapshot[], error: null };
}

export async function insertShipmentBoxSnapshots(
  supabase: SupabaseClient,
  rows: ShipmentBoxSnapshotInsertInput[],
): Promise<{ count: number; error: Error | null }> {
  if (rows.length === 0) {
    return { count: 0, error: null };
  }

  const { data, error } = await supabase
    .from("shipment_box_snapshots")
    .insert(rows)
    .select("id");

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }
  return { count: data?.length ?? 0, error: null };
}

export async function listShipmentBoxSnapshotsByShipmentId(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<{ data: ShipmentBoxSnapshot[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("shipment_box_snapshots")
    .select("id, shipment_id, box_code, part_number, qty_per_box, lot_number, created_at")
    .eq("shipment_id", shipmentId)
    .order("box_code", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return { data: (data ?? []) as ShipmentBoxSnapshot[], error: null };
}
