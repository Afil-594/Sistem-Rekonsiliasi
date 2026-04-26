import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLog, AuditLogWithUser } from "@/types/audit-log";

export type AuditLogInsertInput = {
  user_id: string | null;
  action: string;
  target_table?: string | null;
  payload?: Record<string, unknown> | null;
};

export async function insertAuditLog(
  supabase: SupabaseClient,
  input: AuditLogInsertInput,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("audit_logs").insert({
    user_id: input.user_id,
    action: input.action,
    target_table: input.target_table ?? null,
    payload: input.payload ?? null,
  });

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

export type AuditLogFilters = {
  action?: string;
  target_table?: string;
  user_id?: string;
  limit?: number;
  offset?: number;
};

export async function listAuditLogs(
  supabase: SupabaseClient,
  filters: AuditLogFilters = {},
): Promise<{ data: AuditLogWithUser[]; count: number; error: Error | null }> {
  let query = supabase
    .from("audit_logs")
    .select("*, profiles(full_name)", { count: "exact" });

  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.target_table) {
    query = query.eq("target_table", filters.target_table);
  }
  if (filters.user_id) {
    query = query.eq("user_id", filters.user_id);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return { data: [], count: 0, error: new Error(error.message) };
  }

  return {
    data: (data as AuditLogWithUser[]) ?? [],
    count: count ?? 0,
    error: null,
  };
}

/**
 * Read-only window for checker “Aktivitas” feed. No `profiles` embed (operator
 * comes from `payload.actor_name`) to keep RLS-friendly selects minimal.
 */
export const CHECKER_ACTIVITY_FEED_HOURS = 24;
export const CHECKER_ACTIVITY_FEED_MAX = 30;

export const CHECKER_ACTIVITY_FEED_ACTIONS = [
  "scan_box_arrival",
  "qc_box_accepted",
  "qc_box_rejected",
] as const;

/**
 * `audit_logs` rows for scan arrival + QC accept/reject, last N hours, newest
 * first, capped. Does not change scan/QC business logic.
 */
export async function listCheckerActivityFeed(
  supabase: SupabaseClient,
  options?: { hoursBack?: number; maxItems?: number },
): Promise<{ data: AuditLog[]; error: Error | null }> {
  const hoursBack = options?.hoursBack ?? CHECKER_ACTIVITY_FEED_HOURS;
  const maxItems = options?.maxItems ?? CHECKER_ACTIVITY_FEED_MAX;
  const since = new Date(
    Date.now() - hoursBack * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, user_id, action, target_table, payload, created_at")
    .in("action", [...CHECKER_ACTIVITY_FEED_ACTIONS])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(maxItems);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return {
    data: (data as unknown as AuditLog[]) ?? [],
    error: null,
  };
}
