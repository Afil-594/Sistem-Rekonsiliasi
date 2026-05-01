import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MAX_AUDIT_EXPORT_ROWS } from "@/lib/queries/audit-logs";
import {
  auditTrailBaseFilters,
  auditTrailParamsFromSearchParams,
} from "@/lib/superadmin/audit-trail-url-params";
import { getAuditTrailExport } from "@/lib/services/audit-trail";

export async function GET(request: Request) {
  const supabase = await createClient();
  const sp = new URL(request.url).searchParams;
  const params = auditTrailParamsFromSearchParams(sp);
  const filters = auditTrailBaseFilters(params);

  let result: Awaited<ReturnType<typeof getAuditTrailExport>>;
  try {
    result = await getAuditTrailExport(supabase, filters);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal mengekspor log.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!result.ok) {
    if (result.status === 413) {
      return NextResponse.json(
        {
          error: result.message,
          totalCount: result.totalCount,
          maxRows: MAX_AUDIT_EXPORT_ROWS,
        },
        { status: 413 },
      );
    }
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  const exportedAt = new Date().toISOString();
  const payload = {
    meta: {
      exported_at: exportedAt,
      row_count: result.rows.length,
      total_matching_filters: result.totalCount,
      max_export_rows: MAX_AUDIT_EXPORT_ROWS,
      filters: {
        action: params.action ?? null,
        target_table: params.target_table ?? null,
        user_id: params.user_id ?? null,
        date_from: params.date_from ?? null,
        date_to: params.date_to ?? null,
        q: params.q?.trim() || null,
        severity: filters.severity === "all" ? null : filters.severity,
      },
    },
    rows: result.rows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      user_id: row.user_id,
      actor_full_name: row.profiles?.full_name ?? null,
      actor_role: row.profiles?.role ?? null,
      action: row.action,
      target_table: row.target_table,
      payload: row.payload,
    })),
  };

  const json = JSON.stringify(payload, null, 2);
  const filename = `audit-trail-export-${exportedAt.slice(0, 10)}.json`;

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
