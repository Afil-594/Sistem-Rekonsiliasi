"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatMetricCard } from "@/components/ui/StatMetricCard";
import type { SupervisorIssueQueueItem } from "@/lib/services/supervisor";
import {
  buildProblemSummaryText,
  computeSupervisorReviewSummary,
  filterQueueByDateRange,
  filterQueueBySearch,
  filterQueueByShipmentStatus,
  openDiscrepanciesForShipment,
  priorityAccentClass,
  priorityBadgeLabel,
  priorityIconWrapClass,
  shipmentPriorityFromDiscrepancies,
  sortSupervisorReviewQueue,
  type SupervisorReviewSortId,
  type SupervisorReviewStatusFilterId,
} from "@/components/supervisor/supervisorReviewQueueHelpers";

type Props = {
  queue: SupervisorIssueQueueItem[];
};

function formatWhen(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? iso : value.toLocaleString();
}

/** Konfirmasi return untuk satu discrepancy `open`; dipakai bila shipment hanya punya satu selisih terbuka. */
function ReturnConfirmPayload({ shipmentCode }: { shipmentCode: string }) {
  return (
    <p className="m-0 text-sm text-[var(--text-secondary)]">
      Anda menyetujui hasil selisih dan menandakan retur ke vendor untuk shipment{" "}
      <span className="font-mono font-semibold">{shipmentCode}</span>.
    </p>
  );
}

export function SupervisorReviewShipmentList({ queue }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<SupervisorReviewStatusFilterId>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortId, setSortId] = useState<SupervisorReviewSortId>("newest");

  const [returnDialogShipmentId, setReturnDialogShipmentId] = useState<
    string | null
  >(null);
  const [returnDiscrepancyId, setReturnDiscrepancyId] = useState<
    string | null
  >(null);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");

  const summary = useMemo(() => computeSupervisorReviewSummary(queue), [queue]);

  const filtered = useMemo(() => {
    let rows = [...queue];
    rows = filterQueueBySearch(rows, query);
    rows = filterQueueByShipmentStatus(rows, statusFilter);
    rows = filterQueueByDateRange(
      rows,
      dateFrom.trim() || null,
      dateTo.trim() || null,
    );
    rows = sortSupervisorReviewQueue(rows, sortId);
    return rows;
  }, [queue, query, statusFilter, dateFrom, dateTo, sortId]);

  function closeReturnDialog() {
    if (!returnSubmitting) {
      setReturnDialogShipmentId(null);
      setReturnDiscrepancyId(null);
      setReturnError("");
    }
  }

  async function runApproveReturn() {
    if (!returnDiscrepancyId) {
      return;
    }
    setReturnSubmitting(true);
    setReturnError("");
    try {
      const response = await fetch(
        `/api/discrepancies/${returnDiscrepancyId}/review`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        data?: unknown;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        setReturnError(payload.error ?? "Gagal memproses setujui & return");
        return;
      }
      closeReturnDialog();
      router.refresh();
    } catch {
      setReturnError("Gagal memproses setujui & return");
    } finally {
      setReturnSubmitting(false);
    }
  }

  const dialogShipment = returnDialogShipmentId
    ? queue.find((r) => r.shipment.id === returnDialogShipmentId)
    : undefined;
  const dialogOpenDs = dialogShipment
    ? openDiscrepanciesForShipment(dialogShipment)
    : [];

  return (
    <div className="space-y-8">
      <ConfirmDialog
        open={
          !!returnDiscrepancyId &&
          !!dialogShipment &&
          dialogOpenDs.length <= 1
        }
        onClose={closeReturnDialog}
        title="Setujui & return ke vendor?"
        description={
          dialogShipment ? (
            <div className="space-y-3">
              <ReturnConfirmPayload
                shipmentCode={dialogShipment.shipment.shipment_code}
              />
              {returnError ? (
                <p className="ds-alert ds-alert-error m-0 text-sm" role="alert">
                  {returnError}
                </p>
              ) : null}
            </div>
          ) : null
        }
        confirmLabel="Setujui & Return"
        onConfirm={runApproveReturn}
        loading={returnSubmitting}
        variant="default"
      />

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Ringkasan antrian discrepancy"
      >
        <StatMetricCard
          label="Perlu tinjauan"
          subLabel="Shipment menunggu keputusan"
          value={summary.pendingInitialShipmentCount}
          tone="danger"
          icon="alertOctagon"
        />
        <StatMetricCard
          label="Dalam proses"
          subLabel="Sedang ditindaklanjuti"
          value={summary.inProgressShipmentCount}
          tone="warning"
          icon="hourglass"
        />
        <StatMetricCard
          label="Selesai"
          subLabel="Jumlah keputusan dibuat untuk box"
          value={summary.decisionsCompletedRowCount}
          tone="success"
          icon="checkCircle2"
        />
        <StatMetricCard
          label="Total Box"
          subLabel="Seluruh box discrepancy di antrian"
          value={summary.totalDiscrepancyRowCount}
          icon="barChart2"
        />
      </section>
      {queue.length > 0 ? (
        <p className="-mt-4 text-[0.7rem] leading-relaxed text-[var(--text-muted)]">
          {/* TODO(shipment KPI): “Selesai” per shipment-butuh-keputusan vs per baris */}
          Dua kartu kiri menghitung{" "}
          <span className="font-semibold text-[var(--text-secondary)]">
            shipment
          </span>
          ; dua kanan menghitung{" "}
          <span className="font-semibold text-[var(--text-secondary)]">
            baris discrepancy
          </span>
          . Keduanya tidak bisa dijumlahkan jadi satu angka (mis. 1 shipment
          bisa berisi banyak baris selisih).
        </p>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Pencarian
            </span>
            <input
              type="search"
              autoComplete="off"
              placeholder="Cari nomor shipment, PO, atau vendor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ds-input w-full min-w-0 text-sm"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as SupervisorReviewStatusFilterId)
              }
              className="ds-select w-full text-sm"
            >
              <option value="all">Semua status</option>
              <option value="all_open">Menunggu (semua baris terbuka)</option>
              <option value="in_progress">
                Ditinjau sebagian (ada baris tertutup)
              </option>
            </select>
          </label>
          <fieldset className="flex min-w-0 flex-col gap-1 border-0 p-0">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Rentang tanggal
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="date"
                aria-label="Dari tanggal"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="ds-input w-full flex-1 text-sm"
              />
              <span
                className="hidden shrink-0 text-[var(--text-muted)] sm:inline"
                aria-hidden
              >
                –
              </span>
              <input
                type="date"
                aria-label="Sampai tanggal"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="ds-input w-full flex-1 text-sm"
              />
            </div>
            <span className="text-[0.65rem] text-[var(--text-muted)]">
              Berdasarkan tanggal dibuat shipment atau selisih terbaru
            </span>
          </fieldset>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Urutan
            </span>
            <select
              value={sortId}
              onChange={(e) =>
                setSortId(e.target.value as SupervisorReviewSortId)
              }
              className="ds-select w-full text-sm"
            >
              <option value="newest">Urutkan: Terbaru</option>
              <option value="oldest">Urutkan: Terlama</option>
            </select>
          </label>
        </div>
      </div>

      <ul
        className="m-0 flex list-none flex-col gap-3 p-0"
        aria-label="Daftar shipment discrepancy"
      >
        {filtered.length === 0 ? (
          <li className="ds-empty rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] py-14 text-center text-sm">
            {queue.length === 0
              ? "Tidak ada shipment yang memerlukan tinjauan saat ini."
              : "Tidak ada shipment yang cocok dengan filter Anda."}
          </li>
        ) : (
          filtered.map(({ shipment, vendorLabel, discrepancies }) => {
            const priority =
              shipmentPriorityFromDiscrepancies(discrepancies);
            const badgeTitle = priorityBadgeLabel(priority);
            const accent = priorityAccentClass(priority);
            const iconWrap = priorityIconWrapClass(priority);
            const summaryText = buildProblemSummaryText(discrepancies);
            const openDs = openDiscrepanciesForShipment({
              shipment,
              vendorLabel,
              discrepancies,
            });
            const singleOpenId =
              openDs.length === 1 ? openDs[0]?.id ?? null : null;

            return (
              <li key={shipment.id} className="min-w-0">
                <article
                  className={[
                    "relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] shadow-sm transition-shadow hover:shadow-md",
                    "before:pointer-events-none before:absolute before:bottom-0 before:left-0 before:top-0 before:z-[1] before:w-[3px] before:rounded-l-[var(--radius-lg)] before:content-['']",
                    accent,
                  ].join(" ")}
                >
                  <div className="relative z-[2] flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:items-stretch lg:gap-6 lg:p-5">
                    <div className="flex min-w-0 shrink-0 items-start gap-3 lg:w-[340px] lg:shrink-0">
                      <div
                        className={`flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${iconWrap}`}
                        aria-hidden
                      >
                        {priority === "high" ? (
                          <AlertTriangle className="size-5" strokeWidth={2} />
                        ) : (
                          <ClipboardList className="size-5" strokeWidth={2} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              priority === "high"
                                ? "ds-badge shrink-0 border border-red-200 bg-red-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-red-900 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-100"
                                : "ds-badge ds-badge-warn shrink-0 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider"
                            }
                          >
                            {badgeTitle}
                          </span>
                        </div>
                        <div>
                          <p className="m-0 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            Nomor shipment
                          </p>
                          <p className="m-0 truncate font-mono text-base font-semibold text-[var(--text-primary)] sm:text-lg">
                            {shipment.shipment_code}
                          </p>
                        </div>
                        <dl className="m-0 grid gap-1 text-xs text-[var(--text-muted)] sm:text-[0.8125rem]">
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                            <dt className="sr-only">PO</dt>
                            <dd className="m-0 min-w-0">
                              <span className="font-medium text-[var(--text-secondary)]">
                                PO:
                              </span>{" "}
                              {shipment.po_reference ?? "—"}
                            </dd>
                          </div>
                          <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-0.5">
                            <dt className="sr-only">Vendor</dt>
                            <dd className="m-0 min-w-0 truncate" title={vendorLabel}>
                              <span className="font-medium text-[var(--text-secondary)]">
                                Vendor:
                              </span>{" "}
                              {vendorLabel}
                            </dd>
                          </div>
                          <div>
                            <dt className="sr-only">Tanggal dibuat</dt>
                            <dd className="m-0">
                              <span className="font-medium text-[var(--text-secondary)]">
                                Dibuat:
                              </span>{" "}
                              {formatWhen(shipment.created_at)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 border-t border-[var(--border-default)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                      <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--navy)]">
                        Ringkasan masalah
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-primary)] sm:text-[0.9375rem]">
                        {summaryText}
                      </p>
                    </div>

                    <div className="flex w-full shrink-0 flex-col items-stretch justify-center gap-2 border-t border-[var(--border-default)] pt-4 sm:flex-row sm:flex-wrap lg:w-[200px] lg:flex-col lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 xl:w-[220px]">
                      <Link
                        href={`/supervisor/review/${shipment.id}`}
                        className="ds-btn ds-btn-secondary w-full px-4 py-2.5 text-center text-sm font-semibold"
                      >
                        Lihat detail
                      </Link>
                      {openDs.length === 0 ? (
                        <p className="m-0 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] px-3 py-2 text-center text-xs text-[var(--text-muted)]">
                          Tidak ada selisih terbuka
                        </p>
                      ) : singleOpenId ? (
                        <button
                          type="button"
                          className="ds-btn ds-btn-primary flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
                          disabled={returnSubmitting}
                          onClick={() => {
                            setReturnDialogShipmentId(shipment.id);
                            setReturnDiscrepancyId(singleOpenId);
                            setReturnError("");
                          }}
                        >
                          Setujui & Return
                        </button>
                      ) : (
                        <Link
                          href={`/supervisor/review/${shipment.id}`}
                          className="ds-btn ds-btn-primary flex w-full items-center justify-center gap-2 px-4 py-2.5 text-center text-sm font-semibold"
                        >
                          Setujui & Return
                          <span className="sr-only">
                            · buka halaman detail untuk beberapa selisih terbuka
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            );
          })
        )}
      </ul>

      {filtered.length > 0 && filtered.length !== queue.length ? (
        <p className="text-xs text-[var(--text-muted)]">
          Menampilkan {filtered.length} dari {queue.length} shipment.
        </p>
      ) : null}
    </div>
  );
}
