"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ExternalLink,
  ImageIcon,
  Package,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Discrepancy } from "@/types/discrepancy";
import {
  DISCREPANCY_LAYER_LABELS,
  DISCREPANCY_STATUS_LABELS,
  DISCREPANCY_TYPE_LABELS,
} from "@/types/discrepancy";

type Props = {
  discrepancy: Discrepancy;
  boxCode: string | null;
  evidenceUrl: string | null;
  /** e.g. `h-full` when used in `ds-card-grid` */
  className?: string;
  /** Shipment berstatus done: hilangkan aksi “Tandai untuk retur” (baca saja). */
  reviewsLocked?: boolean;
};

function statusPillClass(status: Discrepancy["status"]): string {
  if (status === "open") {
    return "ds-badge-warn";
  }
  if (status === "reviewed") {
    return "ds-badge-info";
  }
  if (status === "resolved") {
    return "ds-badge-success";
  }
  return "ds-badge-neutral";
}

export function DiscrepancyReviewCard({
  discrepancy,
  boxCode,
  evidenceUrl,
  className = "",
  reviewsLocked = false,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  const isOpen = discrepancy.status === "open";
  const canAct = isOpen && !reviewsLocked;

  async function runMarkReturn() {
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/discrepancies/${discrepancy.id}/review`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        data?: { discrepancy: Discrepancy; shipmentDone: boolean };
        error?: string;
      };

      if (!response.ok || !payload.data) {
        setErrorMessage(payload.error ?? "Gagal meninjau selisih");
        return;
      }

      setReturnDialogOpen(false);
      router.refresh();
    } catch {
      setErrorMessage("Gagal meninjau selisih");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article
      className={[
          "relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden transition-[box-shadow] duration-200",
          "rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)]",
          canAct
          ? "shadow-md ring-1 ring-[color-mix(in_srgb,var(--navy)_12%,var(--border-default))] before:pointer-events-none before:absolute before:bottom-0 before:left-0 before:top-0 before:z-[1] before:w-1 before:rounded-l-[var(--radius-lg)] before:bg-[var(--epson-yellow)] before:content-['']"
          : "bg-slate-50/90 opacity-[0.98] before:pointer-events-none before:absolute before:bottom-0 before:left-0 before:top-0 before:z-[1] before:w-1 before:rounded-l-[var(--radius-lg)] before:bg-slate-300/90 before:content-[''] dark:bg-slate-900/20 dark:before:bg-slate-600/90",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-state={isOpen ? "open" : "closed"}
    >
      <ConfirmDialog
        open={returnDialogOpen}
        onClose={() => {
          if (!submitting) {
            setReturnDialogOpen(false);
          }
        }}
        title="Tandai untuk retur"
        description={
          <p className="m-0">Tandai selisih ini untuk retur?</p>
        }
        confirmLabel="Tandai untuk retur"
        onConfirm={runMarkReturn}
        loading={submitting}
        variant="default"
      />
      <div
        className={[
          "relative z-[2] border-b border-[var(--border-default)] px-4 py-2.5 sm:px-5",
          canAct
            ? "bg-gradient-to-r from-amber-50/95 via-[var(--surface)] to-[var(--surface)] dark:from-amber-950/35"
            : "bg-slate-100/70 dark:bg-slate-800/40",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="m-0 flex min-w-0 items-center gap-2 text-xs font-semibold text-[var(--text-primary)] sm:text-sm">
            {canAct ? (
              <>
                <CircleDot
                  className="size-4 shrink-0 text-amber-700 dark:text-amber-400"
                  aria-hidden
                />
                <span>Menunggu keputusan</span>
              </>
            ) : reviewsLocked && isOpen ? (
              <>
                <CircleDot
                  className="size-4 shrink-0 text-slate-500 dark:text-slate-400"
                  aria-hidden
                />
                <span className="text-[var(--text-secondary)]">
                  Menunggu keputusan (arsip · tidak dapat mengubah)
                </span>
              </>
            ) : (
              <>
                <CheckCircle2
                  className="size-4 shrink-0 text-[var(--navy)]"
                  aria-hidden
                />
                <span className="text-[var(--text-secondary)]">Selesai ditinjau</span>
              </>
            )}
          </p>
          <span
            className={`ds-badge shrink-0 text-[0.7rem] font-semibold sm:text-xs ${statusPillClass(
              discrepancy.status,
            )}`}
          >
            {DISCREPANCY_STATUS_LABELS[discrepancy.status]}
          </span>
        </div>
      </div>

      <div
        className={`ds-card-pad min-h-0 min-w-0 flex-1 ${
          canAct ? "bg-[var(--surface)]" : "bg-[var(--surface)]/60"
        }`}
      >
        <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
          Konteks
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <span
            className="ds-badge ds-badge-layer text-xs sm:text-[0.8125rem]"
            title="Lapisan / tahap"
          >
            {discrepancy.discrepancy_layer
              ? DISCREPANCY_LAYER_LABELS[discrepancy.discrepancy_layer]
              : "—"}
          </span>
          <span className="ds-badge text-xs sm:text-[0.8125rem]">
            {DISCREPANCY_TYPE_LABELS[discrepancy.discrepancy_type]}
          </span>
        </div>

        <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {discrepancy.actual_qty != null ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--section-bg)] px-3.5 py-2.5">
              <p className="m-0 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Qty aktual
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums leading-none text-[var(--text-primary)] sm:text-3xl">
                {discrepancy.actual_qty}
              </p>
            </div>
          ) : null}
          {boxCode ? (
            <div
              className="rounded-[var(--radius-md)] border border-dashed border-[var(--navy)]/30 bg-[color-mix(in_srgb,var(--navy)_3.2%,#ffffff_96.8%)] px-3.5 py-2.5 dark:border-[var(--navy)]/25"
            >
              <p className="m-0 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <Package className="size-3.5 shrink-0" aria-hidden />
                Box terkait
              </p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[var(--navy)] sm:text-xl">
                {boxCode}
              </p>
            </div>
          ) : null}
        </div>

        {discrepancy.description ? (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--section-bg)] p-3.5 sm:p-4">
            <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--navy)]">
              Bermasalah
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--text-primary)] sm:text-[0.9375rem]">
              {discrepancy.description}
            </p>
          </div>
        ) : null}

        <dl
          className={`mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 ${
            !discrepancy.supervisor_action ? "hidden" : ""
          }`}
        >
          {discrepancy.supervisor_action ? (
            <div>
              <dt className="text-xs font-medium text-[var(--text-muted)]">
                Tindakan supervisor
              </dt>
              <dd className="mt-0.5 text-sm font-medium capitalize text-[var(--text-primary)]">
                {discrepancy.supervisor_action}
              </dd>
            </div>
          ) : null}
        </dl>

        {discrepancy.evidence_path ? (
          <div className="mt-4 min-w-0">
            <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--navy)]">
              Bukti
            </p>
            {evidenceUrl ? (
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface)] p-2.5 text-left shadow-sm transition-all duration-150 ease-out hover:border-[color-mix(in_srgb,var(--navy)_30%,var(--border-default))] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)]"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--navy-muted)] text-[var(--navy)]">
                    <ImageIcon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-[var(--text-primary)]">
                      Foto / lampiran
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      Buka di tab baru
                    </span>
                  </span>
                </span>
                <ExternalLink
                  className="size-4 shrink-0 text-[var(--navy)] opacity-80"
                  aria-hidden
                />
              </a>
            ) : (
              <div className="mt-2.5 flex items-center gap-2.5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--section-bg)] px-3 py-2.5 text-sm text-[var(--text-muted)]">
                <ImageIcon className="size-4 shrink-0 opacity-70" aria-hidden />
                <span>Terunggah — pratinjau belum tersedia</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div
        className={`mt-auto border-t border-[var(--border-default)] px-4 py-3.5 sm:px-5 ${
          canAct
            ? "bg-[color-mix(in_srgb,var(--navy)_2.4%,#ffffff_97.6%)] dark:bg-slate-900/30"
            : "bg-slate-100/80 dark:bg-slate-900/25"
        }`}
      >
        {reviewsLocked && isOpen ? (
          <p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
            Shipment telah selesai. Entri dengan status masih terbuka pada data tidak
            dapat dikunci dari halaman ini—hubungi admin bila ini tidak disengaja.
          </p>
        ) : canAct ? (
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4">
            <p className="m-0 max-w-prose self-center text-xs text-[var(--text-secondary)] sm:text-sm sm:leading-relaxed">
              Pastikan bukti dan qty sudah sesuai sebelum memutuskan untuk retur.
            </p>
            <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:min-w-[12.5rem] sm:shrink-0 sm:items-end sm:justify-center">
              <button
                type="button"
                onClick={() => setReturnDialogOpen(true)}
                disabled={submitting}
                className="ds-btn ds-btn-primary flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold shadow-md sm:min-w-[12.5rem]"
              >
                {submitting ? (
                  "Memproses…"
                ) : (
                  <>
                    Tandai untuk retur
                    <ChevronRight className="size-4 opacity-90" aria-hidden />
                  </>
                )}
              </button>
              {errorMessage ? (
                <p className="ds-alert ds-alert-error m-0 text-sm" role="alert">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="m-0 flex flex-wrap items-baseline gap-x-1.5 text-sm text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              Ditinjau
            </span>
            <span>
              tindakan:{" "}
              <span className="font-semibold capitalize text-[var(--text-primary)]">
                {discrepancy.supervisor_action ?? "—"}
              </span>
            </span>
          </p>
        )}
      </div>
    </article>
  );
}
