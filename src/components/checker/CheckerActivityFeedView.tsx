"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ListFilter,
  Package,
  ScanLine,
} from "lucide-react";
import type { CheckerActivityItem } from "@/components/checker/checker-activity-items";
import {
  checkerShipmentHref,
  getActivityCardPresentation,
  matchesCheckerActivityFilter,
  type CheckerActivityFilterId,
} from "@/components/checker/checker-activity-feed-meta";
import { KpiCard } from "@/components/ui/KpiCard";

export type { CheckerActivityItem } from "@/components/checker/checker-activity-items";

type SortOrder = "newest";

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

function sortByNewest(list: CheckerActivityItem[]): CheckerActivityItem[] {
  return [...list].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

const FILTER_ORDER: CheckerActivityFilterId[] = [
  "needs_attention",
  "done",
  "all",
];

const FILTER_LABEL: Record<CheckerActivityFilterId, string> = {
  all: "Semua",
  needs_attention: "Perlu dicek",
  done: "Selesai",
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
  const [filter, setFilter] = useState<CheckerActivityFilterId>("all");
  const sortOrder: SortOrder = "newest";

  const sortedItems = useMemo(() => {
    if (sortOrder === "newest") {
      return sortByNewest(items);
    }
    return items;
  }, [items, sortOrder]);

  const summary = useMemo(() => {
    const needsAttention = sortedItems.filter((i) =>
      matchesCheckerActivityFilter(i, "needs_attention"),
    ).length;
    const done = sortedItems.filter((i) =>
      matchesCheckerActivityFilter(i, "done"),
    ).length;
    return {
      total: sortedItems.length,
      needsAttention,
      done,
    };
  }, [sortedItems]);

  const filterCounts: Record<CheckerActivityFilterId, number> = useMemo(
    () => ({
      all: sortedItems.length,
      needs_attention: summary.needsAttention,
      done: summary.done,
    }),
    [sortedItems.length, summary.done, summary.needsAttention],
  );

  const filtered = useMemo(
    () =>
      sortedItems.filter((i) => matchesCheckerActivityFilter(i, filter)),
    [sortedItems, filter],
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
      className="flex flex-col gap-5"
      aria-label={`Aktivitas, hingga ${maxItems} entri, ${hoursBack} jam terakhir`}
    >
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        role="region"
        aria-label="Ringkasan operasional"
      >
        <KpiCard
          label="Perlu dicek"
          value={String(summary.needsAttention)}
          hint="Scan tiba & QC bermasalah"
          tone="danger"
          icon={AlertCircle}
        />
        <KpiCard
          label="Selesai"
          value={String(summary.done)}
          hint="QC sesuai"
          tone="success"
          icon={CheckCircle2}
        />
        <KpiCard
          label="Total"
          value={String(summary.total)}
          hint="Semua aktivitas"
          tone="info"
          icon={Package}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div
          className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
          role="search"
          aria-label="Saring jenis aktivitas"
        >
          <p className="shrink-0 text-xs font-medium text-[var(--text-muted)]">
            Tampilkan
          </p>
          <div
            className="flex min-w-0 flex-wrap gap-1.5"
            role="group"
            aria-label="Filter jenis"
          >
            {FILTER_ORDER.map((id) => {
              const selected = filter === id;
              const count = filterCounts[id];
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
                  {FILTER_LABEL[id]}
                  <span
                    className={[
                      "inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-1 text-[0.65rem] font-semibold tabular-nums",
                      selected
                        ? "bg-white/20 text-white"
                        : "bg-[var(--section-bg)] text-[var(--text-secondary)]",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ListFilter
            className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
            aria-hidden
          />
          <label className="sr-only" htmlFor="activity-sort">
            Urutkan feed
          </label>
          <select
            id="activity-sort"
            value={sortOrder}
            disabled
            className="max-w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] shadow-sm disabled:cursor-not-allowed disabled:opacity-90"
            aria-describedby="activity-sort-hint"
          >
            <option value="newest">Terbaru</option>
          </select>
          <span id="activity-sort-hint" className="sr-only">
            Saat ini hanya urutan terbaru yang didukung.
          </span>
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
        <ol className="flex min-w-0 flex-col gap-3" role="list">
          {filtered.map((row) => {
            const pres = getActivityCardPresentation(row);
            const CardIcon = pres.Icon;
            const accent =
              pres.accent === "success"
                ? "border-l-emerald-500"
                : "border-l-orange-500";
            const headerTone =
              pres.accent === "success"
                ? "text-emerald-800 dark:text-emerald-200"
                : "text-orange-800 dark:text-orange-200";
            const helperTone =
              pres.accent === "success"
                ? "text-emerald-800/90 dark:text-emerald-200/90"
                : "text-orange-900/85 dark:text-orange-100/90";

            const detailHref = checkerShipmentHref(row.shipmentId);
            const qcHref = pres.showQcCta
              ? checkerShipmentHref(row.shipmentId, { qcBoxId: row.boxId })
              : null;

            return (
              <li key={row.id} className="min-w-0">
                <article
                  className={[
                    "ds-entity-tile flex min-w-0 flex-col gap-4 border-l-4 bg-[var(--surface)] p-4 shadow-sm sm:p-5 lg:flex-row lg:items-stretch lg:gap-5",
                    accent,
                  ].join(" ")}
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--section-bg)] shadow-sm ${
                        pres.accent === "success"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-orange-700 dark:text-orange-300"
                      }`}
                      aria-hidden
                    >
                      <CardIcon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={`text-[0.7rem] font-bold uppercase tracking-[0.08em] ${headerTone}`}
                        >
                          {pres.headerLabel}
                        </span>
                        {row.discrepancyTypeLabel ? (
                          <span className="max-w-full truncate text-[0.65rem] font-medium text-[var(--text-muted)]">
                            · {row.discrepancyTypeLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 font-mono text-base font-bold leading-tight text-[var(--text-primary)] sm:text-lg">
                        {row.boxCode}
                        {row.partNumber ? (
                          <span className="mt-0.5 block font-mono text-sm font-semibold text-[var(--text-secondary)] sm:mt-0 sm:ml-2 sm:inline">
                            · {row.partNumber}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-2 break-words text-sm text-[var(--text-secondary)]">
                        {row.shipmentId && detailHref ? (
                          <span>
                            Shipment{" "}
                            <Link
                              href={detailHref}
                              className="font-mono font-semibold text-[var(--info)] underline decoration-[var(--border-hover)] underline-offset-2 hover:opacity-90"
                            >
                              {row.shipmentCode}
                            </Link>
                          </span>
                        ) : (
                          <span className="font-mono text-[var(--text-secondary)]">
                            Shipment {row.shipmentCode}
                          </span>
                        )}
                        {row.actorLabel ? (
                          <span className="ml-1 text-[var(--text-muted)]">
                            · {row.actorLabel}
                          </span>
                        ) : null}
                      </p>
                      <time
                        dateTime={row.createdAt ?? undefined}
                        className="mt-1.5 block font-mono text-xs text-[var(--text-muted)]"
                      >
                        {formatActivityWhen(row.createdAt)}
                      </time>
                    </div>
                  </div>

                  <div
                    className={`flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)]/60 bg-[var(--section-bg)]/50 px-3 py-2.5 text-sm lg:max-w-[14rem] lg:shrink-0 lg:self-center lg:border-0 lg:bg-transparent lg:px-2 lg:py-0`}
                  >
                    <CardIcon
                      className={`h-4 w-4 shrink-0 opacity-80 ${helperTone}`}
                      aria-hidden
                    />
                    <span className={`min-w-0 leading-snug ${helperTone}`}>
                      {pres.helperText}
                    </span>
                  </div>

                  <div className="flex w-full min-w-0 flex-col gap-2 border-t border-[var(--border-default)] pt-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:shrink-0 lg:flex-col lg:items-stretch lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    {pres.showQcCta && qcHref ? (
                      <Link
                        href={qcHref}
                        className="inline-flex min-h-[2.5rem] w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 sm:w-auto lg:w-full dark:bg-orange-600 dark:hover:bg-orange-500"
                      >
                        <ScanLine className="h-4 w-4 shrink-0" aria-hidden />
                        Lakukan QC
                      </Link>
                    ) : null}
                    {pres.showQcCta && !qcHref ? (
                      <span className="inline-flex min-h-[2.5rem] w-full items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] px-3 py-2 text-center text-xs text-[var(--text-muted)] lg:w-full">
                        Shipment tidak tersedia untuk QC dari feed ini.
                      </span>
                    ) : null}
                    {detailHref ? (
                      <Link
                        href={detailHref}
                        className={
                          pres.showQcCta
                            ? "inline-flex min-h-[2.25rem] w-full items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-sm font-semibold text-[var(--navy)] underline-offset-2 hover:underline sm:w-auto lg:w-full"
                            : "ds-btn ds-btn-secondary inline-flex min-h-[2.5rem] w-full items-center justify-center gap-1.5 px-3 py-2 text-sm sm:w-auto lg:w-full"
                        }
                      >
                        {pres.detailLinkLabel}
                        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                      </Link>
                    ) : (
                      <span className="text-center text-xs text-[var(--text-muted)] lg:text-left">
                        Detail shipment tidak tersedia.
                      </span>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-center text-xs text-[var(--text-muted)]">
        Menampilkan {filtered.length} dari {sortedItems.length} aktivitas
        terbaru ({hoursBack} jam terakhir)
      </p>
    </div>
  );
}
