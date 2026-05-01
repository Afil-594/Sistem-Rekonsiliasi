import type { SupabaseClient } from "@supabase/supabase-js";
import type { Shipment } from "@/types/shipment";

type QueryError = {
  code?: string;
  message: string;
};

export async function insertShipment(
  supabase: SupabaseClient,
  input: {
    shipment_code: string;
    po_reference: string;
    vendor_id: string;
    status: "pending";
  },
): Promise<{ data: Shipment | null; error: QueryError | null }> {
  const { data, error } = await supabase
    .from("shipments")
    .insert(input)
    .select("id, shipment_code, po_reference, status, vendor_id, created_at")
    .single();

  if (error) {
    return { data: null, error: { code: error.code, message: error.message } };
  }

  return { data: data as Shipment, error: null };
}

export async function listShipmentsByPoAndVendor(
  supabase: SupabaseClient,
  poNumber: string,
  vendorId: string,
): Promise<{ data: Shipment[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("shipments")
    .select("id, shipment_code, po_reference, status, vendor_id, created_at")
    .eq("po_reference", poNumber)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Shipment[], error: null };
}

export async function listShipmentsByVendorId(
  supabase: SupabaseClient,
  vendorId: string,
  options?: {
    status?: NonNullable<Shipment["status"]>;
    statusIn?: readonly NonNullable<Shipment["status"]>[];
  },
): Promise<{ data: Shipment[]; error: Error | null }> {
  let query = supabase
    .from("shipments")
    .select("id, shipment_code, po_reference, status, vendor_id, created_at")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  const inList = options?.statusIn;
  if (inList?.length) {
    query = query.in("status", [...inList]);
  } else if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Shipment[], error: null };
}

export async function listShipmentsByStatus(
  supabase: SupabaseClient,
  status: NonNullable<Shipment["status"]>,
): Promise<{ data: Shipment[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("shipments")
    .select("id, shipment_code, po_reference, status, vendor_id, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Shipment[], error: null };
}

/** Untuk History shipment supervisor: beberapa status dalam satu query. */
export async function listShipmentsByStatuses(
  supabase: SupabaseClient,
  statuses: readonly NonNullable<Shipment["status"]>[],
  limit: number,
): Promise<{ data: Shipment[]; error: Error | null }> {
  if (!statuses.length || limit <= 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("shipments")
    .select("id, shipment_code, po_reference, status, vendor_id, created_at")
    .in("status", [...statuses])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Shipment[], error: null };
}

export async function listShipmentsByIds(
  supabase: SupabaseClient,
  shipmentIds: string[],
): Promise<{ data: Shipment[]; error: Error | null }> {
  if (shipmentIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("shipments")
    .select("id, shipment_code, po_reference, status, vendor_id, created_at")
    .in("id", shipmentIds)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Shipment[], error: null };
}

/**
 * Nomor PO (`po_reference`) yang sudah punya minimal satu baris shipment untuk vendor ini.
 */
export async function listPoReferencesShippedByVendorId(
  supabase: SupabaseClient,
  vendorProfileId: string,
): Promise<{ data: string[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("shipments")
    .select("po_reference")
    .eq("vendor_id", vendorProfileId);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const seen = new Set<string>();
  for (const row of data ?? []) {
    const raw = row.po_reference;
    const po =
      typeof raw === "string" ? raw.trim() : "";
    if (po !== "") seen.add(po);
  }
  return { data: [...seen], error: null };
}

export async function getShipmentById(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<{ data: Shipment | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("shipments")
    .select("id, shipment_code, po_reference, status, vendor_id, created_at")
    .eq("id", shipmentId)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: (data as Shipment | null) ?? null, error: null };
}

export async function countShipments(
  supabase: SupabaseClient,
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from("shipments")
    .select("*", { count: "exact", head: true });

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

export async function countShipmentsByStatus(
  supabase: SupabaseClient,
  status: NonNullable<Shipment["status"]>,
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from("shipments")
    .select("*", { count: "exact", head: true })
    .eq("status", status);

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

export async function listRecentShipments(
  supabase: SupabaseClient,
  limit: number,
): Promise<{ data: Shipment[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("shipments")
    .select("id, shipment_code, po_reference, status, vendor_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Shipment[], error: null };
}

export async function listRecentShipmentsByStatus(
  supabase: SupabaseClient,
  status: NonNullable<Shipment["status"]>,
  limit: number,
): Promise<{ data: Shipment[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("shipments")
    .select("id, shipment_code, po_reference, status, vendor_id, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Shipment[], error: null };
}

export async function updateShipmentStatus(
  supabase: SupabaseClient,
  shipmentId: string,
  nextStatus: NonNullable<Shipment["status"]>,
  expectedCurrentStatus?: NonNullable<Shipment["status"]>,
): Promise<{ data: Shipment | null; error: Error | null }> {
  let query = supabase
    .from("shipments")
    .update({ status: nextStatus })
    .eq("id", shipmentId);

  if (expectedCurrentStatus) {
    query = query.eq("status", expectedCurrentStatus);
  }

  const { data, error } = await query
    .select("id, shipment_code, po_reference, status, vendor_id, created_at")
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: (data as Shipment | null) ?? null, error: null };
}
