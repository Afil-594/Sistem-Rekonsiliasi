import { Calendar, ClipboardList, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AuditTrailExplorer } from "@/components/superadmin/AuditTrailExplorer";
import { StatMetricCard } from "@/components/ui/StatMetricCard";
import { KpiCard } from "@/components/ui/KpiCard";
import {
  getAuditLogSeverityCounts,
  getAuditTrailAggregateStats,
  listAuditTrailActorOptions,
  type AuditLogFilters,
} from "@/lib/queries/audit-logs";
import { auditTrailBaseFilters, type AuditSeverityTab } from "@/lib/superadmin/audit-trail-url-params";
import { getAuditTrail, getAuditTrailFilterOptions } from "@/lib/services/audit-trail";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { formatAuditTrailTimestamp } from "@/lib/utils/audit-trail-ui";

const PAGE_SIZE = 30;

function formatActionToken(action: string): string {
  return action.replaceAll("_", " ");
}

function formatActionLabel(action: string): string {
  if (action === "finalize_scan") return "Selesaikan scan inbound";
  return formatActionToken(action);
}

function buildUrlQuery(overrides: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(overrides)) {
    if (v && v.length > 0) qs.set(k, v);
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export default async function AuditTrailPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    target_table?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
    q?: string;
    severity?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const base = auditTrailBaseFilters(params);
  const severity: AuditSeverityTab = base.severity ?? "all";

  const baseListFilters: AuditLogFilters = {
    ...base,
    limit: PAGE_SIZE,
    offset,
  };

  const aggregateFilters: Omit<AuditLogFilters, "limit" | "offset" | "severity"> = {
    action: base.action,
    target_table: base.target_table,
    user_id: base.user_id,
    created_from: base.created_from,
    created_to: base.created_to,
    search: base.search,
  };

  const supabase = await createClient();

  const [trailResult, optionsResult, actorsResult, aggregatesResult, severityResult] =
    await Promise.all([
      getAuditTrail(supabase, baseListFilters).catch((e: unknown) => {
        const { message, detailHint } = userFacingLoadError(e, "Gagal memuat jejak audit");
        return {
          ok: false as const,
          status: 500 as const,
          message,
          detailHint,
        };
      }),
      getAuditTrailFilterOptions(supabase).catch(() => null),
      listAuditTrailActorOptions(supabase).catch(() => ({ data: [], error: null as Error | null })),
      getAuditTrailAggregateStats(supabase, aggregateFilters).catch(() => ({
        data: {
          totalEntries: 0,
          uniqueActors: 0,
          uniqueActorsSampleCap: false,
          latestCreatedAt: null as string | null,
          distinctTargetTables: 0,
          distinctTargetTablesSampleCap: false,
        },
        error: null as Error | null,
      })),
      getAuditLogSeverityCounts(supabase, aggregateFilters).catch(() => ({
        data: { total: 0, critical: 0, warning: 0, info: 0 },
        error: null as Error | null,
      })),
    ]);

  if (!trailResult.ok) {
    if (trailResult.status === 500) {
      const r = trailResult as { message: string; detailHint?: string };
      return (
        <div className="ds-page-operational">
          <LoadErrorState message={r.message} detailHint={r.detailHint} />
        </div>
      );
    }
    const { message, detailHint } = userFacingErrorText(trailResult.message);
    return (
      <div className="ds-page-operational">
        <LoadErrorState message={message} detailHint={detailHint} />
      </div>
    );
  }

  const logs = trailResult.data;
  const totalCount = trailResult.count;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const actions = optionsResult?.ok ? optionsResult.actions : [];
  const targetTables = optionsResult?.ok ? optionsResult.targetTables : [];
  const actors = actorsResult.data ?? [];

  const metrics = aggregatesResult.data;
  const severityCounts = severityResult.data;

  const hasFilter = Boolean(
    params.action ||
      params.target_table ||
      params.user_id ||
      params.date_from ||
      params.date_to ||
      params.q?.trim(),
  );

  const qBase: Record<string, string | undefined> = {
    action: params.action,
    target_table: params.target_table,
    user_id: params.user_id,
    date_from: params.date_from,
    date_to: params.date_to,
    q: params.q?.trim() || undefined,
    severity: severity === "all" ? undefined : severity,
  };

  const exportHref = `/api/superadmin/audit-trail/export${buildUrlQuery(qBase)}`;

  const latestFmt = formatAuditTrailTimestamp(metrics.latestCreatedAt);

  return (
    <div className="ds-page-operational">
      <header className="ds-section-tint border-l-[3px] border-l-[var(--navy)]">
        <p className="ds-section-label mb-1">Superadmin</p>
        <h1 className="ds-h1">Jejak audit</h1>
        <p className="ds-lead max-w-3xl">
          Rekaman aktivitas sistem: siapa melakukan apa, kapan, dan ke entitas mana. Detail payload tetap
          tersedia per baris.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatMetricCard
          label="Total entri"
          subLabel="Audit log tersedia"
          value={metrics.totalEntries}
          tone="danger"
          icon="clipboardList"
        />
        <StatMetricCard
          label="Aktor unik"
          subLabel={
            metrics.uniqueActorsSampleCap
              ? "Perkiraan (sampel terbatas)"
              : "User yang melakukan aksi"
          }
          value={metrics.uniqueActors}
          tone="warning"
          icon="user"
        />
        <KpiCard
          label="Entri paling baru"
          value={metrics.latestCreatedAt ? latestFmt.primary : "—"}
          hint={metrics.latestCreatedAt ? (latestFmt.secondary || "—") : "Belum ada data"}
          tone="success"
          icon={Calendar}
          className={
            metrics.latestCreatedAt
              ? ""
              : "opacity-[0.92] [&_.ds-kpi-value]:text-[var(--text-muted)]"
          }
        />
        <StatMetricCard
          label="Entitas terdampak"
          subLabel={
            metrics.distinctTargetTablesSampleCap
              ? "Tabel sasaran (perkiraan)"
              : "Shipment / Box / Discrepancy"
          }
          value={metrics.distinctTargetTables}
          tone="neutral"
          icon="barChart2"
        />
      </div>

      <section className="ds-card ds-card-pad shadow-[var(--shadow-sm)]" aria-label="Filter log audit">
        <form method="get" action="/superadmin/audit-trail" className="flex flex-col gap-4">
          {severity !== "all" ? <input type="hidden" name="severity" value={severity} /> : null}
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="q" value={params.q ?? ""} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="f-from" className="text-xs font-semibold text-[var(--text-secondary)]">
                Rentang tanggal — dari
              </label>
              <input
                id="f-from"
                type="date"
                name="date_from"
                defaultValue={params.date_from ?? ""}
                className="ds-input w-full min-w-0 text-sm"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="f-to" className="text-xs font-semibold text-[var(--text-secondary)]">
                Rentang tanggal — sampai
              </label>
              <input
                id="f-to"
                type="date"
                name="date_to"
                defaultValue={params.date_to ?? ""}
                className="ds-input w-full min-w-0 text-sm"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="f-actor" className="text-xs font-semibold text-[var(--text-secondary)]">
                Aktor
              </label>
              <select
                id="f-actor"
                name="user_id"
                defaultValue={params.user_id ?? ""}
                className="ds-select w-full min-w-0"
              >
                <option value="">Semua aktor</option>
                {actors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="f-table" className="text-xs font-semibold text-[var(--text-secondary)]">
                Entitas (tabel)
              </label>
              <select
                id="f-table"
                name="target_table"
                defaultValue={params.target_table ?? ""}
                className="ds-select w-full min-w-0"
              >
                <option value="">Semua entitas</option>
                {targetTables.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="f-action" className="text-xs font-semibold text-[var(--text-secondary)]">
                Jenis aksi
              </label>
              <select
                id="f-action"
                name="action"
                defaultValue={params.action ?? ""}
                className="ds-select w-full min-w-0"
              >
                <option value="">Semua aksi</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {formatActionLabel(a)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-default)] pt-4">
            <button type="submit" className="ds-btn ds-btn-primary">
              Terapkan
            </button>
            {hasFilter || severity !== "all" ? (
              <a
                href="/superadmin/audit-trail"
                className="ds-btn ds-btn-secondary"
              >
                Hapus filter
              </a>
            ) : null}
            <a
              href={exportHref}
              className="ds-btn ds-btn-secondary inline-flex items-center gap-2 no-underline"
              title="Unduh JSON untuk filter saat ini (sama dengan tab dan kolom filter)."
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              Export log
            </a>
            <p className="ml-auto hidden items-center gap-1.5 text-xs text-[var(--text-muted)] sm:flex">
              <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Urutan: terbaru dulu
            </p>
          </div>
        </form>
      </section>

      <AuditTrailExplorer
        logs={logs}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        severity={severity}
        severityCounts={severityCounts}
        hasActiveFilters={hasFilter || severity !== "all"}
      />

      {/* Pagination utama di dalam explorer; tautan cadangan bila JS off */}
      {totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-center gap-2 border-t border-[var(--border-default)] pt-2 text-sm text-[var(--text-muted)] sm:hidden"
          aria-label="Pagination cadangan"
        >
          {currentPage > 1 ? (
            <a
              className="ds-link"
              href={`/superadmin/audit-trail${buildUrlQuery({ ...qBase, page: String(currentPage - 1) })}`}
            >
              Sebelumnya
            </a>
          ) : null}
          {currentPage < totalPages ? (
            <a
              className="ds-link"
              href={`/superadmin/audit-trail${buildUrlQuery({ ...qBase, page: String(currentPage + 1) })}`}
            >
              Berikutnya
            </a>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
