import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfileById } from "@/lib/queries/profiles";
import { listAuditLogs, MAX_AUDIT_EXPORT_ROWS, type AuditLogFilters } from "@/lib/queries/audit-logs";
import type { AuditLogWithUser } from "@/types/audit-log";
import type { Profile } from "@/types/profile";

async function requireSuperadminProfile(
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
  if (!profile || profile.role !== "superadmin") {
    return { ok: false, status: 403, message: "Hanya Superadmin yang dapat mengakses." };
  }

  return { ok: true, profile };
}

export async function getAuditTrail(
  supabase: SupabaseClient,
  filters: AuditLogFilters = {},
): Promise<
  | { ok: true; data: AuditLogWithUser[]; count: number }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
> {
  const admin = await requireSuperadminProfile(supabase);
  if (!admin.ok) {
    return admin;
  }

  const { data, count, error } = await listAuditLogs(supabase, filters);
  if (error) {
    throw error;
  }

  return { ok: true, data, count };
}

/**
 * Export JSON: baris yang cocok dengan filter URL (sama seperti daftar), maks.
 * {@link MAX_AUDIT_EXPORT_ROWS} baris.
 */
export async function getAuditTrailExport(
  supabase: SupabaseClient,
  filters: Omit<AuditLogFilters, "limit" | "offset">,
): Promise<
  | { ok: true; rows: AuditLogWithUser[]; totalCount: number }
  | { ok: false; status: 401 | 403 | 413; message: string; totalCount?: number }
> {
  const admin = await requireSuperadminProfile(supabase);
  if (!admin.ok) {
    return admin;
  }

  const { data, count, error } = await listAuditLogs(supabase, {
    ...filters,
    limit: MAX_AUDIT_EXPORT_ROWS,
    offset: 0,
  });
  if (error) {
    throw error;
  }

  const totalCount = count ?? 0;
  if (totalCount > MAX_AUDIT_EXPORT_ROWS) {
    return {
      ok: false,
      status: 413,
      message: `Hasil filter terlalu besar (${totalCount.toLocaleString("id-ID")} baris). Maksimal ${MAX_AUDIT_EXPORT_ROWS.toLocaleString("id-ID")} baris per export. Persempit rentang tanggal atau filter lain.`,
      totalCount,
    };
  }

  return { ok: true, rows: data, totalCount };
}

export async function getAuditTrailFilterOptions(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; actions: string[]; targetTables: string[] }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
> {
  const admin = await requireSuperadminProfile(supabase);
  if (!admin.ok) {
    return admin;
  }

  const { data: actionRows } = await supabase
    .from("audit_logs")
    .select("action")
    .order("action");

  const { data: tableRows } = await supabase
    .from("audit_logs")
    .select("target_table")
    .not("target_table", "is", null)
    .order("target_table");

  const actions = [...new Set((actionRows ?? []).map((r) => r.action))];
  const targetTables = [...new Set((tableRows ?? []).map((r) => r.target_table as string))];

  return { ok: true, actions, targetTables };
}
