"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pushThenRefresh } from "@/lib/safeClientNavigation";

type Props = {
  poNumber: string;
};

type CreateShipmentResponse = {
  data?: {
    shipment: {
      id: string;
    };
  };
  error?: string;
};

export function CreateShipmentDraftForm({ poNumber }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ po_reference: poNumber }),
      });

      const payload = (await response.json()) as CreateShipmentResponse;

      if (!response.ok || !payload.data?.shipment.id) {
        setErrorMessage(payload.error ?? "Gagal membuat draft shipment");
        return;
      }

      pushThenRefresh(
        router,
        `/vendor/shipments/${payload.data.shipment.id}`,
      );
    } catch {
      setErrorMessage("Gagal membuat draft shipment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="ds-section-card"
      aria-label="Buat draft shipment"
    >
      <div className="ds-section-card__header">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Buat draft shipment</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Membuat draft untuk PO{" "}
          <span className="ds-inline-code text-[0.8rem]">{poNumber}</span>. Setelah itu
          atur box dan konfirmasi di halaman shipment.
        </p>
      </div>
      <div className="ds-section-card__body gap-3 pt-0">
        <div className="ds-alert ds-alert-info text-xs sm:text-sm">
          Satu purchase order hanya memiliki satu shipment. Pastikan jumlah part sudah
          sesuai sebelum membuat draft.
        </div>
        <button
          type="submit"
          className="ds-btn ds-btn-primary w-full sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Membuat…" : "Buat draft shipment"}
        </button>
        {errorMessage ? (
          <p className="ds-alert ds-alert-error m-0" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
}
