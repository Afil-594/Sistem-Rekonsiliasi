import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Discrepancy,
  DiscrepancyInsertInput,
  DiscrepancyLayer,
} from "@/types/discrepancy";

const DISCREPANCY_COLUMNS =
  "id, shipment_id, box_id, discrepancy_type, discrepancy_layer, description, status, reported_by, reviewed_by, supervisor_action, reviewed_at, resolved_at, created_at, evidence_path, actual_qty";

/** Row shape for supervisor monitoring aggregates (embedded FKs from schema). */
export type DiscrepancyMonitoringRow = {
  id: string;
  shipment_id: string;
  box_id: string | null;
  discrepancy_type: string;
  discrepancy_layer: string | null;
  description: string;
  status: string;
  created_at: string | null;
  box: { part_number: string } | null;
  shipment: {
    shipment_code: string;
    status: string | null;
    po_reference: string | null;
    vendor_profile: {
      vendor_code: string | null;
      full_name: string | null;
    } | null;
  } | null;
};

const DISCREPANCY_MONITORING_SELECT = `
  id, shipment_id, box_id, discrepancy_type, discrepancy_layer, description, status, created_at,
  box:boxes(part_number),
  shipment:shipments(
    shipment_code,
    status,
    po_reference,
    vendor_profile:profiles!shipments_vendor_id_fkey(vendor_code, full_name)
  )
`;

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeDiscrepancyMonitoringRow(
  raw: Record<string, unknown>,
): DiscrepancyMonitoringRow {
  const shipmentRaw = firstOrNull(
    raw.shipment as Record<string, unknown> | Record<string, unknown>[] | null,
  );
  let vendor_profile: {
    vendor_code: string | null;
    full_name: string | null;
  } | null = null;
  let shipment: DiscrepancyMonitoringRow["shipment"] = null;

  if (shipmentRaw) {
    const vp = firstOrNull(
      shipmentRaw.vendor_profile as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | null,
    );
    vendor_profile = vp
      ? {
          vendor_code:
            typeof vp.vendor_code === "string" ? vp.vendor_code : null,
          full_name: typeof vp.full_name === "string" ? vp.full_name : null,
        }
      : null;
    shipment = {
      shipment_code:
        typeof shipmentRaw.shipment_code === "string"
          ? shipmentRaw.shipment_code
          : "",
      status:
        typeof shipmentRaw.status === "string" ? shipmentRaw.status : null,
      po_reference:
        typeof shipmentRaw.po_reference === "string"
          ? shipmentRaw.po_reference
          : null,
      vendor_profile,
    };
  }

  const boxRaw = firstOrNull(
    raw.box as Record<string, unknown> | Record<string, unknown>[] | null,
  );
  const box = boxRaw
    ? {
        part_number:
          typeof boxRaw.part_number === "string" ? boxRaw.part_number : "",
      }
    : null;

  return {
    id: String(raw.id),
    shipment_id: String(raw.shipment_id),
    box_id:
      raw.box_id === null || raw.box_id === undefined
        ? null
        : String(raw.box_id),
    discrepancy_type: String(raw.discrepancy_type),
    discrepancy_layer:
      raw.discrepancy_layer === null || raw.discrepancy_layer === undefined
        ? null
        : String(raw.discrepancy_layer),
    description: String(raw.description ?? ""),
    status: String(raw.status ?? ""),
    created_at:
      typeof raw.created_at === "string"
        ? raw.created_at
        : raw.created_at === null
          ? null
          : String(raw.created_at),
    box: box && box.part_number !== "" ? box : null,
    shipment,
  };
}

export async function listDiscrepanciesForSupervisorMonitoring(
  supabase: SupabaseClient,
): Promise<{ data: DiscrepancyMonitoringRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("discrepancies")
    .select(DISCREPANCY_MONITORING_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  return {
    data: rows.map((r) => normalizeDiscrepancyMonitoringRow(r)),
    error: null,
  };
}

export async function countDiscrepancies(
  supabase: SupabaseClient,
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from("discrepancies")
    .select("*", { count: "exact", head: true });

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

export async function listRecentDiscrepancies(
  supabase: SupabaseClient,
  limit: number,
): Promise<{ data: Discrepancy[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("discrepancies")
    .select(DISCREPANCY_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Discrepancy[], error: null };
}

export async function listDiscrepanciesByShipmentId(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<{ data: Discrepancy[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("discrepancies")
    .select(DISCREPANCY_COLUMNS)
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Discrepancy[], error: null };
}

export async function getDiscrepancyById(
  supabase: SupabaseClient,
  discrepancyId: string,
): Promise<{ data: Discrepancy | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("discrepancies")
    .select(DISCREPANCY_COLUMNS)
    .eq("id", discrepancyId)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: (data as Discrepancy | null) ?? null, error: null };
}

export async function updateDiscrepancyReview(
  supabase: SupabaseClient,
  discrepancyId: string,
  input: {
    status: Discrepancy["status"];
    reviewed_by: string;
    supervisor_action: NonNullable<Discrepancy["supervisor_action"]>;
    reviewed_at: string;
  },
  expectedCurrentStatus: Discrepancy["status"],
): Promise<{ data: Discrepancy | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("discrepancies")
    .update({
      status: input.status,
      reviewed_by: input.reviewed_by,
      supervisor_action: input.supervisor_action,
      reviewed_at: input.reviewed_at,
    })
    .eq("id", discrepancyId)
    .eq("status", expectedCurrentStatus)
    .select(DISCREPANCY_COLUMNS)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: (data as Discrepancy | null) ?? null, error: null };
}

export async function insertDiscrepancy(
  supabase: SupabaseClient,
  input: DiscrepancyInsertInput,
): Promise<{ data: Discrepancy | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("discrepancies")
    .insert(input)
    .select(DISCREPANCY_COLUMNS)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: data as Discrepancy, error: null };
}

export async function listDiscrepanciesByShipmentAndLayer(
  supabase: SupabaseClient,
  shipmentId: string,
  layer: DiscrepancyLayer,
): Promise<{ data: Discrepancy[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("discrepancies")
    .select(DISCREPANCY_COLUMNS)
    .eq("shipment_id", shipmentId)
    .eq("discrepancy_layer", layer)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data ?? []) as Discrepancy[], error: null };
}
