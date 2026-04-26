"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Props = {
  shipmentId: string;
  disabled?: boolean;
  disabledReason?: string;
  warningMessage?: string;
};

export function ConfirmShipmentButton({
  shipmentId,
  disabled = false,
  disabledReason,
  warningMessage,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function runConfirm() {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/shipments/${encodeURIComponent(shipmentId)}/confirm`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(payload.error ?? "Gagal mengonfirmasi shipment");
        return;
      }

      setConfirmOpen(false);
      router.refresh();
    } catch {
      setErrorMessage("Gagal mengonfirmasi shipment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!isSubmitting) {
            setConfirmOpen(false);
          }
        }}
        title="Konfirmasi shipment"
        description={
          warningMessage ? (
            <div className="flex flex-col gap-3">
              <p className="m-0">{warningMessage}</p>
              <p className="m-0 text-[var(--text-secondary)]">
                Tetap konfirmasi shipment? Setelah ini packing box terkunci.
              </p>
            </div>
          ) : (
            <p className="m-0">
              Konfirmasi shipment? Fitur packing akan terkunci
            </p>
          )
        }
        confirmLabel="Konfirmasi"
        onConfirm={runConfirm}
        loading={isSubmitting}
        variant="default"
      />
      {warningMessage && !disabled ? (
        <p className="ds-alert ds-alert-warn" role="status">
          {warningMessage}
        </p>
      ) : null}
      <div>
        <button
          type="button"
          onClick={() => {
            if (disabled) {
              return;
            }
            setConfirmOpen(true);
          }}
          disabled={disabled || isSubmitting}
          className="ds-btn ds-btn-success"
        >
          {isSubmitting ? "Mengonfirmasi…" : "Konfirmasi shipment"}
        </button>
      </div>
      {disabled && disabledReason ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{disabledReason}</p>
      ) : null}
      {errorMessage ? (
        <p
          className="ds-alert ds-alert-error"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
