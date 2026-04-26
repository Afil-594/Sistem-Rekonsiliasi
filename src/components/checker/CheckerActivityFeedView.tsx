"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Package,
  ScanLine,
} from "lucide-react";
import type { CheckerActivityItem } from "@/components/checker/checker-activity-items";

export type { CheckerActivityItem } from "@/components/checker/checker-activity-items";

type ActivityFilterId = "all" | "scan" | "qc_ok" | "qc_find";

function formatActivityWhen(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchesFilter(item: CheckerActivityItem, f: ActivityFilterId) {
  if (f === "all") {
    return true;
  }
  if (f === "scan") {
    return item.action === "scan_box_arrival";
  }
  if (f === "qc_ok") {
    return item.action === "qc_box_accepted";
  }
  if (f === "qc_find") {
    return item.action === "qc_box_rejected";
  }
  return true;
}

function OutcomeStyle({
  outcome,
  action,
}: {
  outcome: string;
  action: string;
}) {
  if (action === "scan_box_arrival" || outcome === "Tiba") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border border-amber-200/90 bg-amber-50/90 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100">
        {outcome}
      </span>
    );
  }
  if (outcome === "Sesuai") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border border-emerald-200/90 bg-emerald-50/90 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-200">
        {outcome}
      </span>
    );
  }
  if (outcome === "Bermasalah") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border border-red-200/80 bg-red-50/80 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
        {outcome}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded border border-[var(--border-default)] bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[0.65rem] font-medium uppercase text-[var(--text-secondary)]">
      {outcome}
    </span>
  );
}

function ActivityIcon({ action }: { action: string }) {
  if (action === "scan_box_arrival") {
    return <ScanLine className="h-4 w-4" strokeWidth={2.1} aria-hidden />;
  }
  if (action === "qc_box_accepted") {
    return <CheckCircle2 className="h-4 w-4" strokeWidth={2.1} aria-hidden />;
  }
  if (action === "qc_box_rejected") {
    return <AlertCircle className="h-4 w-4" strokeWidth={2.1} aria-hidden />;
  }
  return <Package className="h-4 w-4" strokeWidth={2.1} aria-hidden />;
}

function leftAccentForAction(action: string) {
  if (action === "scan_box_arrival") {
    return "border-l-amber-500";
  }
  if (action === "qc_box_accepted") {
    return "border-l-emerald-500";
  }
  if (action === "qc_box_rejected") {
    return "border-l-red-500";
  }
  return "border-l-slate-400";
}

type FilterChip = {
  id: ActivityFilterId;
  label: string;
  count: number;
};

const FILTER_ORDER: ActivityFilterId[] = [
  "all",
  "scan",
  "qc_ok",
  "qc_find",
];

const FILTER_DEF: Record<ActivityFilterId, string> = {
  all: "Semua",
  scan: "Scan tiba",
  qc_ok: "QC sesuai",
  qc_find: "QC bermasalah",
};

type Props = {
  items: CheckerActivityItem[];
  loadError: boolean;
  hoursBack: number;
  maxItems: number;
};

/**
 * Operasional feed: box yang baru diproses (scan tiba, QC oke, QC bermasalah).
 */
export function CheckerActivityFeedView({
  items,
  loadError,
  hoursBack,
  maxItems,
}: Props) {
  const [filter, setFilter] = useState<ActivityFilterId>("all");

  const summary = useMemo(() => {
    const scan = items.filter((i) => i.action === "scan_box_arrival").length;
    const qcOk = items.filter((i) => i.action === "qc_box_accepted").length;
    const qcFind = items.filter((i) => i.action === "qc_box_rejected").length;
    return {
      total: items.length,
      scanTiba: scan,
      qcSesuai: qcOk,
      qcBermasalah: qcFind,
    };
  }, [items]);

  const filterChips: FilterChip[] = useMemo(
    () => [
      { id: "all", label: FILTER_DEF.all, count: summary.total },
      { id: "scan", label: FILTER_DEF.scan, count: summary.scanTiba },
      { id: "qc_ok", label: FILTER_DEF.qc_ok, count: summary.qcSesuai },
      { id: "qc_find", label: FILTER_DEF.qc_find, count: summary.qcBermasalah },
    ],
    [summary],
  );

  const filtered = useMemo(
    () => items.filter((i) => matchesFilter(i, filter)),
    [items, filter],
  );

  if (loadError) {
    return (
      <p className="ds-alert ds-alert-warn border-amber-200/80" role="status">
        Aktivitas tidak dapat dimuat. Periksa koneksi lalu segarkan. Alur scan dan
        QC di lapangan tidak terpengaruh.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="ds-empty border border-dashed border-[var(--border-default)] bg-[var(--section-bg)]/40">
        Belum ada aktivitas box tercatat dalam {hoursBack} jam terakhir. Scan
        tiba, QC sukses, dan QC bermasalah muncul di sini bila tercatat di audit.
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4"
      aria-label={`Aktivitas, hingga ${maxItems} entri, ${hoursBack} jam terakhir`}
    >
      <div
        className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
        role="region"
        aria-label="Ringkasan jumlah per jenis"
      >
        <div className="ds-stat ds-stat--compact min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Total
          </p>
          <p className="ds-stat-value text-[var(--text-primary)]">
            {summary.total}
          </p>
        </div>
        <div className="ds-stat ds-stat--compact min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-amber-800/90">
            Scan tiba
          </p>
          <p className="ds-stat-value tabular-nums text-amber-950">
            {summary.scanTiba}
          </p>
        </div>
        <div className="ds-stat ds-stat--compact min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-emerald-800/90">
            QC sesuai
          </p>
          <p className="ds-stat-value tabular-nums text-emerald-900">
            {summary.qcSesuai}
          </p>
        </div>
        <div className="ds-stat ds-stat--compact min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-red-800/90">
            QC bermasalah
          </p>
          <p className="ds-stat-value tabular-nums text-red-800">
            {summary.qcBermasalah}
          </p>
        </div>
      </div>

      <div
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        role="search"
        aria-label="Saring jenis aktivitas"
      >
        <p className="text-xs font-medium text-[var(--text-muted)]">
          Tampilkan
        </p>
        <div
          className="flex min-w-0 flex-wrap gap-1.5"
          role="group"
          aria-label="Filter jenis"
        >
          {FILTER_ORDER.map((id) => {
            const def = filterChips.find((c) => c.id === id);
            if (!def) {
              return null;
            }
            const selected = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFilter(id);
                }}
                aria-pressed={selected}
                className={[
                  "inline-flex min-h-[2rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  selected
                    ? "border-[var(--navy)] bg-[var(--navy)] text-white shadow-sm"
                    : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-elevated)]",
                ].join(" ")}
              >
                {def.label}
                <span
                  className={[
                    "inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-1 text-[0.65rem] font-semibold tabular-nums",
                    selected
                      ? "bg-white/20 text-white"
                      : "bg-[var(--section-bg)] text-[var(--text-secondary)]",
                  ].join(" ")}
                >
                  {def.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p
          className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--section-bg)]/50 px-3 py-4 text-sm text-[var(--text-secondary)]"
          role="status"
        >
          Tidak ada entri untuk filter ini dalam jendela tampil saat ini. Ubah
          filter atau perluas cakupan waktu (pengaturan jendela di sisi
          pelayanan / audit).
        </p>
      ) : (
        <ol
          className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2"
          role="list"
        >
          {filtered.map((row) => {
            return (
              <li key={row.id} className="min-w-0">
                <article
                  className={[
                    "ds-entity-tile h-full min-w-0 border-l-4 p-3.5 pl-2.5",
                    leftAccentForAction(row.action),
                  ].join(" ")}
                >
                  <div className="flex gap-2.5">
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--section-bg)] text-[var(--navy)] shadow-sm dark:border-[var(--border-default)]/80"
                      aria-hidden
                    >
                      <ActivityIcon action={row.action} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 gap-y-1">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">
                          {row.activityTitle}
                        </span>
                        <OutcomeStyle
                          outcome={row.outcomeBadge}
                          action={row.action}
                        />
                        {row.discrepancyTypeLabel ? (
                          <span className="max-w-full truncate text-[0.7rem] text-[var(--text-muted)]">
                            · {row.discrepancyTypeLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 break-words font-mono text-sm font-semibold leading-tight text-[var(--text-primary)]">
                        {row.boxCode}
                        {row.partNumber ? (
                          <span className="ml-1.5 font-mono text-xs font-medium text-[var(--text-secondary)] sm:ml-2">
                            · {row.partNumber}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 break-words text-xs text-[var(--text-secondary)]">
                        {row.shipmentId ? (
                          <span>
                            Shipment{" "}
                            <Link
                              className="font-mono font-medium text-[var(--navy)] underline decoration-[var(--border-hover)] underline-offset-2 hover:text-[var(--navy-hover)]"
                              href={`/checker/arrival/${row.shipmentId}`}
                            >
                              {row.shipmentCode}
                            </Link>
                          </span>
                        ) : (
                          <span className="font-mono">{row.shipmentCode}</span>
                        )}
                        {row.actorLabel ? (
                          <span className="ml-1 text-[var(--text-muted)]">
                            · {row.actorLabel}
                          </span>
                        ) : null}
                      </p>
                      <time
                        dateTime={row.createdAt ?? undefined}
                        className="mt-1.5 block font-mono text-[0.7rem] text-[var(--text-muted)]"
                      >
                        {formatActivityWhen(row.createdAt)}
                      </time>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
