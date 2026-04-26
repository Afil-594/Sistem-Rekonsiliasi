import { ClipboardList, Filter, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AuditTrailLogRow } from "@/components/superadmin/AuditTrailLogRow";
import {
  getAuditTrail,
  getAuditTrailFilterOptions,
} from "@/lib/services/audit-trail";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import type { AuditLogWithUser } from "@/types/audit-log";

const PAGE_SIZE = 30;

function formatTimestamp(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatAction(action: string) {
  return action.replaceAll("_", " ");
}

/** Display label for well-known actions (payload / docs still use canonical action string). */
function formatActionLabel(action: string) {
  if (action === "finalize_scan") return "Selesaikan scan kedatangan";
  return formatAction(action);
}

function shortUserId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function userCellLabel(log: AuditLogWithUser) {
  const name = log.profiles?.full_name;
  if (typeof name === "string" && name.trim() !== "") {
    return name.trim();
  }
  if (log.user_id) {
    return shortUserId(log.user_id);
  }
  return "—";
}

export default async function AuditTrailPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    target_table?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const [trailResult, optionsResult] = await Promise.all([
    getAuditTrail(supabase, {
      action: params.action || undefined,
      target_table: params.target_table || undefined,
      limit: PAGE_SIZE,
      offset,
    }).catch((e: unknown) => {
      const { message, detailHint } = userFacingLoadError(
        e,
        "Gagal memuat jejak audit",
      );
      return {
        ok: false as const,
        status: 500 as const,
        message,
        detailHint,
      };
    }),
    getAuditTrailFilterOptions(supabase).catch(() => null),
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
  const from = totalCount === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, totalCount);

  const actions = optionsResult?.ok ? optionsResult.actions : [];
  const targetTables = optionsResult?.ok ? optionsResult.targetTables : [];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const merged = { ...params, ...overrides };
    const qs = new URLSearchParams();
    if (merged.action) qs.set("action", merged.action);
    if (merged.target_table) qs.set("target_table", merged.target_table);
    if (merged.page && merged.page !== "1") qs.set("page", merged.page);
    const str = qs.toString();
    return `/superadmin/audit-trail${str ? `?${str}` : ""}`;
  }

  const hasFilter = Boolean(params.action || params.target_table);

  return (
    <div className="ds-page-operational">
      <div className="ds-section-tint border-l-[3px] border-l-[var(--navy)]">
        <p className="ds-section-label mb-1">Superadmin</p>
        <h1 className="ds-h1">Jejak audit</h1>
        <p className="ds-lead max-w-2xl">
          Rekaman aktivitas sistem: siapa melakukan apa, kapan, dan ke entitas mana. Detail payload
          tetap tersedia per baris.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="ds-summary-strip">
            <History className="h-4 w-4 text-[var(--navy)]" aria-hidden />
            <span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {totalCount}
              </span>{" "}
              entri di basis data
            </span>
          </span>
          {hasFilter && (
            <span className="ds-badge ds-badge-accent">
              <Filter className="mr-1 inline h-3 w-3" aria-hidden />
              Filter aktif
            </span>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3" aria-label="Filter log">
        <div className="ds-filter-bar">
          <form
            method="get"
            action="/superadmin/audit-trail"
            className="flex w-full flex-wrap items-end gap-4"
          >
            <div className="flex min-w-[10rem] flex-col gap-1.5">
              <label
                htmlFor="f-action"
                className="text-xs font-semibold text-[var(--text-secondary)]"
              >
                Aksi
              </label>
              <select
                id="f-action"
                name="action"
                defaultValue={params.action ?? ""}
                className="ds-select min-w-[12rem]"
              >
                <option value="">Semua aksi</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {formatActionLabel(a)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex min-w-[10rem] flex-col gap-1.5">
              <label
                htmlFor="f-table"
                className="text-xs font-semibold text-[var(--text-secondary)]"
              >
                Tabel sasaran
              </label>
              <select
                id="f-table"
                name="target_table"
                defaultValue={params.target_table ?? ""}
                className="ds-select min-w-[12rem]"
              >
                <option value="">Semua tabel</option>
                {targetTables.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="ds-btn ds-btn-primary">
              Terapkan
            </button>

            {(params.action || params.target_table) && (
              <a
                href="/superadmin/audit-trail"
                className="ds-link self-center sm:min-h-10 sm:self-end"
              >
                Hapus filter
              </a>
            )}
          </form>
        </div>

        <div className="ds-subpanel flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">Ringkasan halaman</span>{" "}
            — entri {from}–{to} dari {totalCount}
            {hasFilter && (
              <span className="text-[var(--text-muted)]"> (hasil terfilter)</span>
            )}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Urutan: terbaru dulu
          </p>
        </div>
      </section>

      {logs.length === 0 ? (
        <p className="ds-empty">Tidak ada entri audit{hasFilter ? " untuk filter ini" : ""}.</p>
      ) : (
        <div className="ds-table-wrap">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="ds-thead">
                <th className="ds-tcell w-[1%] pl-4 whitespace-nowrap">Waktu</th>
                <th className="ds-tcell min-w-[8rem]">Ringkasan</th>
                <th className="ds-tcell w-[1%] whitespace-nowrap">Aksi</th>
                <th className="ds-tcell w-[1%]">Tabel</th>
                <th className="ds-tcell min-w-[6rem]">Aktor</th>
                <th className="ds-tcell min-w-[10rem] pr-4">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <AuditTrailLogRow
                  key={log.id}
                  log={log}
                  formatActionLabel={formatActionLabel}
                  formatTimestamp={formatTimestamp}
                  userCellLabel={userCellLabel}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="flex flex-col gap-2 border-t border-[var(--border-default)] pt-4 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Pagination"
        >
          <span className="text-sm text-[var(--text-secondary)]">
            Halaman <span className="font-mono font-semibold">{currentPage}</span> dari{" "}
            {totalPages}
          </span>
          <div className="flex flex-wrap gap-2">
            {currentPage > 1 && (
              <a
                href={buildUrl({ page: String(currentPage - 1) })}
                className="ds-btn ds-btn-secondary py-1.5"
              >
                Sebelumnya
              </a>
            )}
            {currentPage < totalPages && (
              <a
                href={buildUrl({ page: String(currentPage + 1) })}
                className="ds-btn ds-btn-secondary py-1.5"
              >
                Berikutnya
              </a>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
