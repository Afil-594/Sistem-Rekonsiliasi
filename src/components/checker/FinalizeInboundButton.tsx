"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { pushThenRefresh } from "@/lib/safeClientNavigation";

type Props = {
  shipmentId: string;
  shipmentCode: string;
  pendingCount: number;
  totalCount: number;
};

export function FinalizeScanButton({
  shipmentId,
  shipmentCode,
  pendingCount,
  totalCount,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  const scannedCount = totalCount - pendingCount;

  async function runFinalize() {
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/shipments/${shipmentId}/finalize-inbound`,
        {
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        data?: { shipment: { shipment_code: string } };
        error?: string;
      };

      if (!response.ok || !payload.data) {
        setErrorMessage(payload.error ?? "Gagal menyelesaikan scan");
        return;
      }

      setFinalizeOpen(false);
      pushThenRefresh(
        router,
        `/checker/arrival?finalized=${encodeURIComponent(payload.data.shipment.shipment_code)}`,
      );
    } catch {
      setErrorMessage("Gagal menyelesaikan scan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--section-bg)] p-3 sm:p-4"
      style={{
        boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--navy) 8%, transparent)",
      }}
    >
      <ConfirmDialog
        open={finalizeOpen}
        onClose={() => {
          if (!submitting) {
            setFinalizeOpen(false);
          }
        }}
        title="Selesaikan scan & lanjut QC?"
        description={
          <div className="flex flex-col gap-2">
            <p className="m-0">
              Selesaikan scan untuk {shipmentCode}?
            </p>
            <p className="m-0">
              Sudah di-scan: {scannedCount} dari {totalCount} box.
            </p>
            {pendingCount > 0 ? (
              <p className="m-0">
                {pendingCount} box belum di-scan akan tercatat sebagai missing.
              </p>
            ) : null}
            <p className="m-0">
              Akan dibuat catatan selisih rekonsiliasi dan status shipment
              berubah ke tiba (arrived) untuk QC.
            </p>
          </div>
        }
        confirmLabel="Selesaikan scan & lanjut QC"
        onConfirm={runFinalize}
        loading={submitting}
        variant="default"
      />
      <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--navy)]">
        Finalisasi tahap
      </p>
      <p className="m-0 mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
        Selesaikan tahap scan untuk melanjutkan ke tahap QC. Box yang belum terscan akan
        tercatat <strong>missing</strong>.
      </p>
      <div
        className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        role="status"
        aria-label="Progres sebelum finalisasi"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="ds-summary-strip gap-1.5 border-0 bg-[var(--surface)] p-0 py-1.5 pl-0 pr-2 text-xs shadow-sm">
            <span className="text-[var(--text-muted)]">Ter-scan</span>
            <span className="ds-count-chip text-xs font-bold tabular-nums">
              {scannedCount}/{totalCount}
            </span>
          </span>
          {pendingCount > 0 ? (
            <span className="rounded-md border border-amber-300/60 bg-amber-50/80 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {pendingCount} belum scan → tercatat missing
            </span>
          ) : (
            <span className="rounded-md border border-emerald-300/50 bg-emerald-50/70 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
              Semua box tercatat
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFinalizeOpen(true)}
          disabled={submitting}
          className="ds-btn ds-btn-primary w-full min-w-[12rem] shrink-0 sm:w-auto"
        >
          {submitting ? "Memproses…" : "Finalisasi scan"}
        </button>
      </div>
      {errorMessage ? (
        <p className="ds-alert ds-alert-error mt-3 font-medium" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
