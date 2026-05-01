import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLog, AuditLogWithUser } from "@/types/audit-log";

/** PostgREST builder shape differs per `.select()`; use loose typing for shared filters. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuditRpcQuery = any;

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

/** URL / UI: yyyy-mm-dd → converted to ISO bounds in the page layer before querying. */
export type AuditLogFilters = {
  action?: string;
  target_table?: string;
  user_id?: string;
  created_from?: string;
  created_to?: string;
  /** Free-text: action, target_table, actor name, common payload keys. */
  search?: string;
  /** Matches SQL severity buckets (mutually exclusive with total = crit + warn + info). */
  severity?: "all" | "critical" | "warning" | "info";
  limit?: number;
  offset?: number;
};

const AGG_SAMPLE_CAP = 10_000;

/** Batas keamanan satu unduhan; jika `count` lebih besar, minta persempit filter. */
export const MAX_AUDIT_EXPORT_ROWS = 25_000;

function escapeForOrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function applySearchOr(
  query: AuditRpcQuery,
  rawTerm: string,
): AuditRpcQuery {
  const t = rawTerm.trim();
  if (!t) return query;
  const wild = `%${escapeForOrValue(t)}%`;
  return query.or(
    [
      `action.ilike."${wild}"`,
      `target_table.ilike."${wild}"`,
      `profiles.full_name.ilike."${wild}"`,
      `payload->>shipment_code.ilike."${wild}"`,
      `payload->>box_code.ilike."${wild}"`,
      `payload->>discrepancy_id.ilike."${wild}"`,
      `payload->>po_reference.ilike."${wild}"`,
    ].join(","),
  );
}

function applySeverityFilter(query: AuditRpcQuery, severity: AuditLogFilters["severity"]): AuditRpcQuery {
  if (!severity || severity === "all") return query;

  if (severity === "critical") {
    return query.or(
      [
        `action.ilike."%error%"`,
        `action.ilike."%reject%"`,
        `action.ilike."%defect%"`,
        `action.ilike."%discrepancy%"`,
        `action.ilike."%failed%"`,
      ].join(","),
    );
  }

  if (severity === "warning") {
    let q = query.or(
      [
        `action.ilike."%update%"`,
        `action.ilike."%status%"`,
        `action.ilike."%review%"`,
        `action.ilike."%change%"`,
      ].join(","),
    );
    for (const term of ["error", "reject", "defect", "discrepancy", "failed"]) {
      q = q.not("action", "ilike", `%${term}%`);
    }
    return q;
  }

  let q = query;
  for (const term of ["error", "reject", "defect", "discrepancy", "failed"]) {
    q = q.not("action", "ilike", `%${term}%`);
  }
  for (const term of ["update", "status", "review", "change"]) {
    q = q.not("action", "ilike", `%${term}%`);
  }
  return q;
}

function applyAuditListFilters(
  query: AuditRpcQuery,
  filters: Omit<AuditLogFilters, "limit" | "offset">,
): AuditRpcQuery {
  let q = query;

  if (filters.action) {
    q = q.eq("action", filters.action);
  }
  if (filters.target_table) {
    q = q.eq("target_table", filters.target_table);
  }
  if (filters.user_id) {
    q = q.eq("user_id", filters.user_id);
  }
  if (filters.created_from) {
    q = q.gte("created_at", filters.created_from);
  }
  if (filters.created_to) {
    q = q.lte("created_at", filters.created_to);
  }
  if (filters.search?.trim()) {
    q = applySearchOr(q, filters.search);
  }
  q = applySeverityFilter(q, filters.severity);

  return q;
}

export type AuditTrailActorOption = { id: string; label: string };

export async function listAuditTrailActorOptions(
  supabase: SupabaseClient,
): Promise<{ data: AuditTrailActorOption[]; error: Error | null }> {
  /** Sampel terbatas: cukup untuk dropdown filter Superadmin. */
  const { data: rows, error: rowErr } = await supabase
    .from("audit_logs")
    .select("user_id")
    .not("user_id", "is", null)
    .limit(15_000);

  if (rowErr) {
    return { data: [], error: new Error(rowErr.message) };
  }

  const ids = [
    ...new Set(
      (rows ?? [])
        .map((r) => r.user_id as string | null)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (ids.length === 0) {
    return { data: [], error: null };
  }

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);

  if (profErr) {
    return { data: [], error: new Error(profErr.message) };
  }

  const labelById = new Map<string, string>();
  for (const p of profiles ?? []) {
    const name =
      typeof p.full_name === "string" && p.full_name.trim() !== ""
        ? p.full_name.trim()
        : p.id.slice(0, 8) + "…";
    labelById.set(p.id, name);
  }

  const data: AuditTrailActorOption[] = ids
    .map((id) => ({ id, label: labelById.get(id) ?? id.slice(0, 8) + "…" }))
    .sort((a, b) => a.label.localeCompare(b.label, "id"));

  return { data, error: null };
}

export type AuditTrailAggregateStats = {
  totalEntries: number;
  uniqueActors: number;
  uniqueActorsSampleCap: boolean;
  latestCreatedAt: string | null;
  distinctTargetTables: number;
  distinctTargetTablesSampleCap: boolean;
};

export async function getAuditTrailAggregateStats(
  supabase: SupabaseClient,
  filters: Omit<AuditLogFilters, "limit" | "offset" | "severity">,
): Promise<{ data: AuditTrailAggregateStats; error: Error | null }> {
  const baseFilters = { ...filters, severity: "all" as const };

  let countQ = supabase.from("audit_logs").select("*", { count: "exact", head: true });
  countQ = applyAuditListFilters(countQ, baseFilters);
  const { count: totalEntries, error: cErr } = await countQ;
  if (cErr) {
    return {
      data: {
        totalEntries: 0,
        uniqueActors: 0,
        uniqueActorsSampleCap: false,
        latestCreatedAt: null,
        distinctTargetTables: 0,
        distinctTargetTablesSampleCap: false,
      },
      error: new Error(cErr.message),
    };
  }

  let latestQ = supabase
    .from("audit_logs")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  latestQ = applyAuditListFilters(latestQ, baseFilters);
  const { data: latestRow, error: lErr } = await latestQ;
  if (lErr) {
    return {
      data: {
        totalEntries: totalEntries ?? 0,
        uniqueActors: 0,
        uniqueActorsSampleCap: false,
        latestCreatedAt: null,
        distinctTargetTables: 0,
        distinctTargetTablesSampleCap: false,
      },
      error: new Error(lErr.message),
    };
  }

  let actorsQ = supabase
    .from("audit_logs")
    .select("user_id")
    .not("user_id", "is", null)
    .range(0, AGG_SAMPLE_CAP - 1);
  actorsQ = applyAuditListFilters(actorsQ, baseFilters);
  const { data: actorRows, error: aErr } = await actorsQ;
  if (aErr) {
    return {
      data: {
        totalEntries: totalEntries ?? 0,
        uniqueActors: 0,
        uniqueActorsSampleCap: false,
        latestCreatedAt: latestRow?.[0]?.created_at ?? null,
        distinctTargetTables: 0,
        distinctTargetTablesSampleCap: false,
      },
      error: new Error(aErr.message),
    };
  }

  const uniqueActors = new Set(
    (actorRows ?? [])
      .map((r) => r.user_id as string | null)
      .filter((id): id is string => typeof id === "string"),
  ).size;

  let tablesQ = supabase
    .from("audit_logs")
    .select("target_table")
    .not("target_table", "is", null)
    .range(0, AGG_SAMPLE_CAP - 1);
  tablesQ = applyAuditListFilters(tablesQ, baseFilters);
  const { data: tableRows, error: tErr } = await tablesQ;
  if (tErr) {
    return {
      data: {
        totalEntries: totalEntries ?? 0,
        uniqueActors,
        uniqueActorsSampleCap: (actorRows?.length ?? 0) >= AGG_SAMPLE_CAP,
        latestCreatedAt: latestRow?.[0]?.created_at ?? null,
        distinctTargetTables: 0,
        distinctTargetTablesSampleCap: false,
      },
      error: new Error(tErr.message),
    };
  }

  const distinctTargetTables = new Set(
    (tableRows ?? [])
      .map((r) => r.target_table as string | null)
      .filter((t): t is string => typeof t === "string" && t.length > 0),
  ).size;

  return {
    data: {
      totalEntries: totalEntries ?? 0,
      uniqueActors,
      uniqueActorsSampleCap: (actorRows?.length ?? 0) >= AGG_SAMPLE_CAP,
      latestCreatedAt: latestRow?.[0]?.created_at ?? null,
      distinctTargetTables,
      distinctTargetTablesSampleCap: (tableRows?.length ?? 0) >= AGG_SAMPLE_CAP,
    },
    error: null,
  };
}

export type AuditLogSeverityCounts = {
  total: number;
  critical: number;
  warning: number;
  info: number;
};

export async function getAuditLogSeverityCounts(
  supabase: SupabaseClient,
  filters: Omit<AuditLogFilters, "limit" | "offset" | "severity">,
): Promise<{ data: AuditLogSeverityCounts; error: Error | null }> {
  const base = { ...filters, severity: "all" as const };

  let totalQ = supabase.from("audit_logs").select("*", { count: "exact", head: true });
  totalQ = applyAuditListFilters(totalQ, base);
  const { count: total, error: tErr } = await totalQ;
  if (tErr) {
    return {
      data: { total: 0, critical: 0, warning: 0, info: 0 },
      error: new Error(tErr.message),
    };
  }

  let critQ = supabase.from("audit_logs").select("*", { count: "exact", head: true });
  critQ = applyAuditListFilters(critQ, base);
  critQ = applySeverityFilter(critQ, "critical");
  const { count: critical, error: cErr } = await critQ;
  if (cErr) {
    return {
      data: { total: total ?? 0, critical: 0, warning: 0, info: 0 },
      error: new Error(cErr.message),
    };
  }

  let warnQ = supabase.from("audit_logs").select("*", { count: "exact", head: true });
  warnQ = applyAuditListFilters(warnQ, base);
  warnQ = applySeverityFilter(warnQ, "warning");
  const { count: warning, error: wErr } = await warnQ;
  if (wErr) {
    return {
      data: { total: total ?? 0, critical: critical ?? 0, warning: 0, info: 0 },
      error: new Error(wErr.message),
    };
  }

  const info = Math.max(0, (total ?? 0) - (critical ?? 0) - (warning ?? 0));

  return {
    data: {
      total: total ?? 0,
      critical: critical ?? 0,
      warning: warning ?? 0,
      info,
    },
    error: null,
  };
}

export async function listAuditLogs(
  supabase: SupabaseClient,
  filters: AuditLogFilters = {},
): Promise<{ data: AuditLogWithUser[]; count: number; error: Error | null }> {
  let query = supabase
    .from("audit_logs")
    .select("*, profiles(full_name, role)", { count: "exact" });

  query = applyAuditListFilters(query, filters);

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
