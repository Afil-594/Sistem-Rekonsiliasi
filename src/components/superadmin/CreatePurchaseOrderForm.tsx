"use client";

import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type Line = {
  part_number: string;
  part_name: string;
  quantity_ordered: string;
  unit: string;
};

function emptyLine(): Line {
  return {
    part_number: "",
    part_name: "",
    quantity_ordered: "",
    unit: "pcs",
  };
}

export type VendorCodeHint = {
  code: string;
  label: string;
};

type Props = {
  /** Vendor codes from server (for datalist / quick reference). */
  vendorHints?: VendorCodeHint[];
};

export function CreatePurchaseOrderForm({ vendorHints = [] }: Props) {
  const [poNumber, setPoNumber] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const prepared = lines.map((row) => ({
      part_number: row.part_number.trim(),
      part_name: row.part_name.trim(),
      quantity_ordered:
        row.quantity_ordered.trim() === ""
          ? NaN
          : Number.parseInt(row.quantity_ordered, 10),
      unit: row.unit.trim() === "" ? "pcs" : row.unit.trim(),
    }));

    function rowComplete(row: (typeof prepared)[0]) {
      return (
        row.part_number !== "" &&
        row.part_name !== "" &&
        Number.isInteger(row.quantity_ordered) &&
        row.quantity_ordered > 0
      );
    }

    function rowEmpty(row: (typeof prepared)[0]) {
      const qtyEmpty =
        row.quantity_ordered === undefined ||
        !Number.isFinite(row.quantity_ordered);
      return row.part_number === "" && row.part_name === "" && qtyEmpty;
    }

    const hasPartial = prepared.some((row) => !rowEmpty(row) && !rowComplete(row));
    if (hasPartial) {
      setErrorMessage(
        "Setiap baris harus diisi lengkap (part number, nama part, qty), atau dikosongkan semua untuk baris cadangan.",
      );
      setIsSubmitting(false);
      return;
    }

    const items = prepared.filter(rowComplete);

    if (items.length === 0) {
      setErrorMessage("Isi minimal satu baris item dengan part number, nama part, dan qty.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/superadmin/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          po_number: poNumber,
          vendor_code: vendorCode,
          items,
        }),
      });

      const json = (await res.json()) as {
        data?: { po_number: string; vendor_code: string; item_count: number };
        error?: string;
      };

      if (!res.ok) {
        setErrorMessage(json.error ?? "Gagal menyimpan PO.");
        return;
      }

      if (json.data) {
        setSuccessMessage(
          `PO ${json.data.po_number} untuk vendor ${json.data.vendor_code} berhasil dibuat (${json.data.item_count} baris).`,
        );
      } else {
        setSuccessMessage("PO berhasil dibuat.");
      }
      setPoNumber("");
      setVendorCode("");
      setLines([emptyLine(), emptyLine()]);
    } catch {
      setErrorMessage("Gagal menyimpan PO. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const listId = "po-vendor-datalist";

  return (
    <div className="ds-section-card overflow-hidden">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="ds-section-card__header border-b border-[var(--border-default)] bg-[var(--section-bg)]/80">
          <div className="flex items-center gap-2">
            <ClipboardList
              className="h-4 w-4 text-[var(--navy)]"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="text-sm font-semibold text-[var(--text-primary)]">PO baru</p>
          </div>
        </div>
        <div className="ds-section-card__body gap-4">
          {vendorHints.length > 0 && (
            <datalist id={listId}>
              {vendorHints.map((h) => (
                <option key={h.code} value={h.code} label={h.label} />
              ))}
            </datalist>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="po-number" className="ds-form-label">
                Nomor PO
              </label>
              <input
                id="po-number"
                type="text"
                required
                autoComplete="off"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="ds-input font-mono"
                placeholder="Contoh: PO-2026-001"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="po-vendor" className="ds-form-label">
                Vendor code
              </label>
              <input
                id="po-vendor"
                type="text"
                required
                autoComplete="off"
                value={vendorCode}
                onChange={(e) => setVendorCode(e.target.value)}
                className="ds-input font-mono"
                placeholder="Harus sama dengan profil vendor"
                list={vendorHints.length > 0 ? listId : undefined}
              />
              <p className="text-xs text-[var(--text-muted)]">
                Hanya bisa disimpan jika sudah ada akun vendor dengan kode ini.
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--border-default)] pt-4">
            <p className="ds-form-label mb-3">Barang (line items)</p>
            <div className="flex flex-col gap-3">
              {lines.map((row, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)]/60 p-3 sm:grid-cols-12 sm:items-end"
                >
                  <div className="flex flex-col gap-1.5 sm:col-span-3">
                    <label
                      htmlFor={`po-part-${index}`}
                      className="text-xs font-medium text-[var(--text-secondary)]"
                    >
                      Part number
                    </label>
                    <input
                      id={`po-part-${index}`}
                      type="text"
                      value={row.part_number}
                      onChange={(e) => updateLine(index, { part_number: e.target.value })}
                      className="ds-input font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-4">
                    <label
                      htmlFor={`po-partname-${index}`}
                      className="text-xs font-medium text-[var(--text-secondary)]"
                    >
                      Nama part
                    </label>
                    <input
                      id={`po-partname-${index}`}
                      type="text"
                      value={row.part_name}
                      onChange={(e) => updateLine(index, { part_name: e.target.value })}
                      className="ds-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label
                      htmlFor={`po-qty-${index}`}
                      className="text-xs font-medium text-[var(--text-secondary)]"
                    >
                      Qty
                    </label>
                    <input
                      id={`po-qty-${index}`}
                      type="number"
                      min={1}
                      step={1}
                      value={row.quantity_ordered}
                      onChange={(e) =>
                        updateLine(index, { quantity_ordered: e.target.value })
                      }
                      className="ds-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label
                      htmlFor={`po-unit-${index}`}
                      className="text-xs font-medium text-[var(--text-secondary)]"
                    >
                      Satuan
                    </label>
                    <input
                      id={`po-unit-${index}`}
                      type="text"
                      value={row.unit}
                      onChange={(e) => updateLine(index, { unit: e.target.value })}
                      className="ds-input"
                      placeholder="pcs"
                    />
                  </div>
                  <div className="flex justify-end sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="ds-btn ds-btn-ghost p-2 text-[var(--text-muted)] hover:text-[var(--danger)]"
                      aria-label={`Hapus baris ${index + 1}`}
                      title="Hapus baris"
                      disabled={lines.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="ds-btn ds-btn-secondary mt-3 inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Tambah baris
            </button>
          </div>

          {errorMessage && (
            <p className="ds-alert ds-alert-error" role="alert">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="ds-alert ds-alert-success" role="status">
              {successMessage}
            </p>
          )}

          <div className="border-t border-[var(--border-default)] pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn ds-btn-primary px-5"
            >
              {isSubmitting ? "Menyimpan…" : "Simpan PO"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
