"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Info,
  Search,
  ScrollText,
  X,
} from "lucide-react";
import type { AuditLogWithUser } from "@/types/audit-log";
import type { AuditLogSeverityCounts } from "@/lib/queries/audit-logs";
import { buildAuditLogSummary, prettyJsonString } from "@/lib/utils/audit-log-display";
import {
  actorDisplayName,
  actorInitials,
  actorRoleLabel,
  auditSeverityLabel,
  formatActionLabel,
  formatAuditTrailTimestamp,
  formatAuditTrailTimestampCompact,
  getAuditEntityDetailLabel,
  mapAuditLogSeverity,
  prettyPrintAuditPayload,
} from "@/lib/utils/audit-trail-ui";

type Props = {
  logs: AuditLogWithUser[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  severity: "all" | "critical" | "warning" | "info";
  severityCounts: AuditLogSeverityCounts;
  hasActiveFilters: boolean;
};

const PAYLOAD_PREVIEW_CHARS = 1200;

function useAuditTrailHref() {
  const sp = useSearchParams();
  return useCallback(
    (patch: Record<string, string | undefined | null>) => {
      const p = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
      }
      const qs = p.toString();
      return `/superadmin/audit-trail${qs ? `?${qs}` : ""}`;
    },
    [sp],
  );
}

function severityRowIcon(s: ReturnType<typeof mapAuditLogSeverity>) {
  const cls = "h-4 w-4 shrink-0";
  switch (s) {
    case "critical":
      return <AlertCircle className={`${cls} text-[var(--danger)]`} aria-hidden />;
    case "warning":
      return <AlertTriangle className={`${cls} text-[var(--warning)]`} aria-hidden />;
    default:
      return <Info className={`${cls} text-[var(--info)]`} aria-hidden />;
  }
}

function severityBadgeClass(s: ReturnType<typeof mapAuditLogSeverity>): string {
  switch (s) {
    case "critical":
      return "ds-badge ds-badge-danger ds-badge--sm";
    case "warning":
      return "ds-badge ds-badge-warn ds-badge--sm";
    default:
      return "ds-badge ds-badge-info ds-badge--sm";
  }
}

function paginationItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, "ellipsis", total];
  }
  if (current >= total - 2) {
    return [1, "ellipsis", total - 3, total - 2, total - 1, total];
  }
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export function AuditTrailExplorer({
  logs,
  totalCount,
  currentPage,
  pageSize,
  severity,
  severityCounts,
  hasActiveFilters,
}: Props) {
  const router = useRouter();
  const href = useAuditTrailHref();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [payloadExpanded, setPayloadExpanded] = useState(false);

  const sp = useSearchParams();
  useEffect(() => {
    setSearchDraft(sp.get("q") ?? "");
  }, [sp]);

  const selected = useMemo(
    () => logs.find((l) => l.id === selectedId) ?? null,
    [logs, selectedId],
  );

  useEffect(() => {
    if (selectedId && !logs.some((l) => l.id === selectedId)) {
      setSelectedId(null);
    }
  }, [logs, selectedId]);

  useEffect(() => {
    setPayloadExpanded(false);
  }, [selectedId]);

  const from = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const tabs: { key: "all" | "critical" | "warning" | "info"; label: string; count: number; className?: string }[] =
    [
      { key: "all", label: "Semua", count: severityCounts.total },
      {
        key: "critical",
        label: "Kritis",
        count: severityCounts.critical,
        className: "text-[var(--danger)]",
      },
      {
        key: "warning",
        label: "Peringatan",
        count: severityCounts.warning,
        className: "text-[var(--warning)]",
      },
      {
        key: "info",
        label: "Informasi",
        count: severityCounts.info,
        className: "text-[var(--info)]",
      },
    ];

  const rawPayloadStr = selected ? prettyJsonString(selected.payload) : "";
  const payloadIsLong = rawPayloadStr.length > PAYLOAD_PREVIEW_CHARS;

  return (
    <section className="flex flex-col gap-4" aria-label="Daftar dan detail jejak audit">
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5 sm:gap-2" role="tablist" aria-label="Kategori log">
            {tabs.map((t) => {
              const active = severity === t.key;
              return (
                <Link
                  key={t.key}
                  href={href({ severity: t.key === "all" ? null : t.key, page: "1" })}
                  role="tab"
                  aria-selected={active}
                  className={[
                    "rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--navy)] text-white shadow-[var(--shadow-sm)]"
                      : "bg-[var(--section-bg)] text-[var(--text-secondary)] hover:bg-[var(--navy-muted)] hover:text-[var(--text-primary)]",
                    t.className && !active ? t.className : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {t.label}{" "}
                  <span className={active ? "opacity-90" : "opacity-80"}>({t.count})</span>
                </Link>
              );
            })}
          </div>

          <div className="relative min-w-[12rem] flex-1 lg:max-w-md">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            />
            <form
              className="w-full"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(
                  href({
                    q: searchDraft.trim() || null,
                    page: "1",
                  }),
                );
              }}
            >
              <input
                name="q"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Cari shipment ID, user, aksi, atau detail…"
                className="ds-input w-full py-2 pl-9 pr-3 text-sm"
                aria-label="Cari log audit"
              />
            </form>
          </div>
        </div>
      </div>

      <div className="grid min-h-[24rem] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_min(22rem,34vw)]">
        <div className="ds-card min-w-0 overflow-hidden shadow-[var(--shadow-md)]">
          {logs.length === 0 ? (
            <p className="ds-card-pad ds-muted">
              Tidak ada entri audit
              {hasActiveFilters ? " untuk filter ini" : ""}.
            </p>
          ) : (
            <>
              <div className="hidden gap-0 border-b border-[var(--border-default)] bg-[var(--section-bg)] px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:grid sm:grid-cols-[minmax(6rem,1fr)_minmax(0,2.2fr)_minmax(7rem,1fr)_minmax(0,1.2fr)_2rem] sm:px-4">
                <span className="whitespace-nowrap">Waktu</span>
                <span>Aktivitas</span>
                <span>Aktor</span>
                <span className="min-w-0">Detail</span>
                <span className="sr-only">Buka</span>
              </div>
              <ul className="divide-y divide-[var(--border-default)]">
                {logs.map((log) => {
                  const sev = mapAuditLogSeverity(log.action);
                  const active = log.id === selectedId;
                  const time = formatAuditTrailTimestamp(log.created_at);
                  const actor = actorDisplayName(log);
                  const initials = actorInitials(actor === "—" ? "?" : actor);
                  return (
                    <li key={log.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(log.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(log.id);
                          }
                        }}
                        className={[
                          "grid cursor-pointer gap-2 px-3 py-3 transition-colors sm:grid-cols-[minmax(6rem,1fr)_minmax(0,2.2fr)_minmax(7rem,1fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-3 sm:px-4",
                          active
                            ? "bg-[var(--info-muted)]"
                            : "hover:bg-[var(--section-bg)]",
                        ].join(" ")}
                      >
                        <div className="min-w-0 sm:pl-0">
                          <p className="font-mono text-[0.7rem] font-medium text-[var(--text-primary)]">
                            {time.primary}
                          </p>
                          {time.secondary ? (
                            <p className="text-[0.65rem] text-[var(--text-muted)]">{time.secondary}</p>
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {severityRowIcon(sev)}
                            <span className={`${severityBadgeClass(sev)} capitalize`}>
                              {auditSeverityLabel(sev)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                            {formatActionLabel(log.action)}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--text-secondary)]">
                            {buildAuditLogSummary(log.action, log.payload)}
                          </p>
                        </div>
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--navy-muted)] text-xs font-semibold text-[var(--navy)]"
                            aria-hidden
                          >
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{actor}</p>
                            <p className="truncate text-[0.7rem] text-[var(--text-muted)]">
                              {actorRoleLabel(log)}
                            </p>
                          </div>
                        </div>
                        <p className="min-w-0 break-words font-mono text-[0.75rem] text-[var(--text-primary)] sm:max-w-[14rem]">
                          {getAuditEntityDetailLabel(log)}
                        </p>
                        <div className="flex justify-end sm:justify-center">
                          <button
                            type="button"
                            className="ds-btn ds-btn-ghost rounded-full p-2 text-[var(--navy)] hover:bg-[var(--navy-muted)]"
                            aria-label="Buka detail aktivitas"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(log.id);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <div className="flex flex-col gap-3 border-t border-[var(--border-default)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Menampilkan{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {from}-{to}
              </span>{" "}
              dari{" "}
              <span className="font-medium text-[var(--text-primary)]">{totalCount}</span> entri
            </p>
            {totalPages > 1 ? (
              <nav className="flex flex-wrap items-center gap-1" aria-label="Pagination">
                {currentPage > 1 ? (
                  <Link
                    href={href({ page: String(currentPage - 1) })}
                    className="ds-btn ds-btn-secondary px-2.5 py-1.5 text-xs"
                  >
                    Sebelumnya
                  </Link>
                ) : (
                  <span className="ds-btn ds-btn-secondary pointer-events-none px-2.5 py-1.5 text-xs opacity-40">
                    Sebelumnya
                  </span>
                )}
                <div className="mx-1 flex flex-wrap items-center gap-0.5">
                  {paginationItems(currentPage, totalPages).map((item, i) =>
                    item === "ellipsis" ? (
                      <span key={`e-${i}`} className="px-1 text-[var(--text-muted)]">
                        …
                      </span>
                    ) : (
                      <Link
                        key={item}
                        href={href({ page: String(item) })}
                        className={[
                          "min-w-8 justify-center rounded-[var(--radius-md)] px-2 py-1 text-center text-xs font-medium",
                          item === currentPage
                            ? "bg-[var(--navy)] text-white"
                            : "text-[var(--text-secondary)] hover:bg-[var(--section-bg)] hover:text-[var(--text-primary)]",
                        ].join(" ")}
                      >
                        {item}
                      </Link>
                    ),
                  )}
                </div>
                {currentPage < totalPages ? (
                  <Link
                    href={href({ page: String(currentPage + 1) })}
                    className="ds-btn ds-btn-secondary px-2.5 py-1.5 text-xs"
                  >
                    Berikutnya
                  </Link>
                ) : (
                  <span className="ds-btn ds-btn-secondary pointer-events-none px-2.5 py-1.5 text-xs opacity-40">
                    Berikutnya
                  </span>
                )}
              </nav>
            ) : null}
          </div>
        </div>

        <aside className="ds-card min-h-[20rem] overflow-hidden shadow-[var(--shadow-md)] lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {!selected ? (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <ScrollText className="h-10 w-10 text-[var(--text-muted)] opacity-40" aria-hidden />
              <p className="text-sm font-medium text-[var(--text-secondary)]">Pilih salah satu daftar log</p>
              <p className="max-w-xs text-xs text-[var(--text-muted)]">
                Klik baris atau ikon panah untuk melihat ringkasan, entitas, dan payload JSON.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-start justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--section-bg)] px-4 py-3">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Detail aktivitas</h2>
                <button
                  type="button"
                  className="rounded-[var(--radius-md)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                  aria-label="Tutup panel"
                  onClick={() => setSelectedId(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="ds-card-pad flex flex-col gap-4">
                <dl className="flex flex-col gap-3 text-sm">
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Waktu
                    </dt>
                    <dd className="mt-0.5 font-mono text-[var(--text-primary)]">
                      {formatAuditTrailTimestampCompact(selected.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Aktor
                    </dt>
                    <dd className="mt-0.5 text-[var(--text-primary)]">
                      {actorDisplayName(selected)}
                      <span className="block text-xs text-[var(--text-muted)]">
                        {actorRoleLabel(selected)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Aksi
                    </dt>
                    <dd className="mt-0.5 capitalize text-[var(--text-primary)]">
                      {formatActionLabel(selected.action)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Entitas / tabel
                    </dt>
                    <dd className="mt-0.5 font-mono text-[0.8rem] text-[var(--text-primary)]">
                      {selected.target_table ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Ringkasan
                    </dt>
                    <dd className="mt-0.5 leading-relaxed text-[var(--text-primary)]">
                      {buildAuditLogSummary(selected.action, selected.payload)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Detail
                    </dt>
                    <dd className="mt-0.5 break-words text-[var(--text-primary)]">
                      {getAuditEntityDetailLabel(selected)}
                    </dd>
                  </div>
                </dl>

                <div>
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Detail payload
                  </p>
                  <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-3">
                    <pre
                      className={[
                        "overflow-x-auto font-mono text-[0.7rem] leading-relaxed text-[var(--text-primary)]",
                        payloadExpanded || !payloadIsLong ? "max-h-[min(28rem,55vh)] overflow-y-auto" : "max-h-40 overflow-y-auto",
                      ].join(" ")}
                    >
                      {payloadExpanded || !payloadIsLong
                        ? prettyPrintAuditPayload(selected.payload)
                        : `${rawPayloadStr.slice(0, PAYLOAD_PREVIEW_CHARS)}…`}
                    </pre>
                    {payloadIsLong ? (
                      <button
                        type="button"
                        className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface)] py-1.5 text-xs font-medium text-[var(--navy)] hover:bg-[var(--section-bg)]"
                        onClick={() => setPayloadExpanded((v) => !v)}
                      >
                        {payloadExpanded ? "Ringkas payload" : "Lihat semua payload"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
