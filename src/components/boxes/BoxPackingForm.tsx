"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Box } from "@/types/box";
import type { ErpPoItem } from "@/types/erp-po";

type Props = {
  shipmentId: string;
  poItems: ErpPoItem[];
  existingBoxes: Box[];
};

type Mode = "manual" | "auto";

const MAX_BOX_COUNT = 50;

function clampBoxCount(value: number, max: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }
  if (value < 1) {
    return 1;
  }
  if (value > max) {
    return Math.max(1, max);
  }
  return Math.floor(value);
}

export function BoxPackingForm({
  shipmentId,
  poItems,
  existingBoxes,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("manual");
  const [partNumber, setPartNumber] = useState(poItems[0]?.part_number ?? "");
  const [lotNumber, setLotNumber] = useState("");
  const [boxCount, setBoxCount] = useState(1);
  const [qtyInputs, setQtyInputs] = useState<string[]>([""]);
  const [autoTotalQty, setAutoTotalQty] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [pendingBody, setPendingBody] = useState<Record<string, unknown> | null>(
    null,
  );

  const selectedItem = useMemo(
    () => poItems.find((row) => row.part_number === partNumber) ?? null,
    [poItems, partNumber],
  );

  const manualTotal = useMemo(() => {
    return qtyInputs.reduce((sum, raw) => {
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? sum + Math.floor(parsed) : sum;
    }, 0);
  }, [qtyInputs]);

  const orderedQty = selectedItem?.quantity_ordered ?? 0;
  const diff = manualTotal - orderedQty;

  useEffect(() => {
    setAutoTotalQty(orderedQty > 0 ? String(orderedQty) : "");
  }, [orderedQty]);

  function handleBoxCountChange(next: number) {
    const safe = clampBoxCount(next, MAX_BOX_COUNT);
    setBoxCount(safe);
    setQtyInputs((prev) => {
      if (safe === prev.length) {
        return prev;
      }
      if (safe < prev.length) {
        return prev.slice(0, safe);
      }
      return [...prev, ...Array.from({ length: safe - prev.length }, () => "")];
    });
  }

  function handleQtyChange(index: number, value: string) {
    setQtyInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const parsedAutoTotal = Number(autoTotalQty);
  const autoTotalValid =
    Number.isInteger(parsedAutoTotal) && parsedAutoTotal > 0;
  const autoCanSplitEvenly =
    autoTotalValid && parsedAutoTotal % boxCount === 0;
  const autoQtyPerBox = autoCanSplitEvenly ? parsedAutoTotal / boxCount : null;
  const autoDiff = autoTotalValid ? parsedAutoTotal - orderedQty : null;

  const manualHasValues = manualTotal > 0;

  async function submitPackingBody(body: Record<string, unknown>) {
    const response = await fetch("/api/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setErrorMessage(payload.error ?? "Gagal membuat box");
      return;
    }

    setLotNumber("");
    setQtyInputs(Array.from({ length: boxCount }, () => ""));
    setAutoTotalQty(orderedQty > 0 ? String(orderedQty) : "");
    router.refresh();
  }

  async function handleConfirmReplace() {
    if (!pendingBody) {
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const body = { ...pendingBody, replace: true };
      await submitPackingBody(body);
    } catch {
      setErrorMessage("Gagal membuat box");
    } finally {
      setIsSubmitting(false);
      setReplaceDialogOpen(false);
      setPendingBody(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      let body: Record<string, unknown>;

      if (mode === "manual") {
        const qtyNumbers: number[] = [];
        for (const raw of qtyInputs) {
          const trimmed = raw.trim();
          if (trimmed === "" || !/^\d+$/.test(trimmed)) {
            setErrorMessage("Setiap qty_per_box harus bilangan bulat positif");
            return;
          }
          const parsed = Number(trimmed);
          if (!Number.isInteger(parsed) || parsed <= 0) {
            setErrorMessage("Setiap qty_per_box harus bilangan bulat positif");
            return;
          }
          qtyNumbers.push(parsed);
        }

        body = {
          mode: "manual",
          shipment_id: shipmentId,
          part_number: partNumber,
          lot_number: lotNumber,
          qty_per_box: qtyNumbers,
        };
      } else {
        if (!selectedItem) {
          setErrorMessage("Pilih part terlebih dahulu");
          return;
        }
        if (!Number.isInteger(boxCount) || boxCount <= 0) {
          setErrorMessage("Jumlah box harus bilangan bulat positif");
          return;
        }
        if (!autoTotalValid) {
          setErrorMessage("Total qty harus bilangan bulat positif");
          return;
        }
        if (!autoCanSplitEvenly) {
          setErrorMessage(
            `Total qty (${parsedAutoTotal}) tidak habis dibagi merata ke ${boxCount} box`,
          );
          return;
        }

        body = {
          mode: "auto",
          shipment_id: shipmentId,
          part_number: partNumber,
          lot_number: lotNumber,
          box_count: boxCount,
          total_qty: parsedAutoTotal,
        };
      }

      const existingForPart = existingBoxes.filter(
        (row) => row.part_number === partNumber,
      );
      if (existingForPart.length > 0) {
        setPendingBody(body);
        setReplaceDialogOpen(true);
        return;
      }

      await submitPackingBody(body);
    } catch {
      setErrorMessage("Gagal membuat box");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (poItems.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        PO ini tidak punya baris. Tidak ada yang perlu di-pack.
      </p>
    );
  }

  const existingCountForPending =
    pendingBody && typeof pendingBody.part_number === "string"
      ? existingBoxes.filter(
          (row) => row.part_number === pendingBody.part_number,
        ).length
      : 0;
  const pendingPartNumber =
    pendingBody && typeof pendingBody.part_number === "string"
      ? pendingBody.part_number
      : "";

  return (
    <>
      <ConfirmDialog
        open={replaceDialogOpen}
        onClose={() => {
          if (!isSubmitting) {
            setReplaceDialogOpen(false);
            setPendingBody(null);
          }
        }}
        title="Ganti rencana packing?"
        description={
          <p className="m-0">
            Part {pendingPartNumber} sudah di-pack.
            Ganti dengan rencana packing baru?
          </p>
        }
        confirmLabel="Ganti"
        onConfirm={handleConfirmReplace}
        loading={isSubmitting}
        variant="danger"
      />
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
      >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`rounded border px-3 py-1.5 text-sm ${
            mode === "manual"
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        >
          Input manual
        </button>
        <button
          type="button"
          onClick={() => setMode("auto")}
          className={`rounded border px-3 py-1.5 text-sm ${
            mode === "auto"
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        >
          Input otomatis
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Part</span>
          <select
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
            required
          >
            {poItems.map((row) => (
              <option key={row.id} value={row.part_number}>
                {row.part_number} — {row.part_name} (qty PO {row.quantity_ordered})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Nomor lot</span>
          <input
            type="text"
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            Jumlah box{" "}
            <span className="text-zinc-500">(maks. {MAX_BOX_COUNT})</span>
          </span>
          <input
            type="number"
            min={1}
            max={MAX_BOX_COUNT}
            step={1}
            value={boxCount}
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleBoxCountChange(Number(e.target.value))}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
            required
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Qty PO</span>
          <span className="rounded border border-dashed border-zinc-300 px-2 py-1.5 font-medium dark:border-zinc-700">
            {orderedQty}
          </span>
        </div>
      </div>

      {mode === "manual" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Qty per box</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {qtyInputs.map((value, index) => (
              <label key={index} className="flex flex-col gap-1 text-xs">
                <span className="text-zinc-500">Box {index + 1}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => handleQtyChange(index, e.target.value)}
                  className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
                  required
                />
              </label>
            ))}
          </div>
          <div className="text-sm">
            <span className="text-zinc-500">Total ter-pack:</span>{" "}
            <span className="font-medium">{manualTotal}</span>{" "}
            <span className="text-zinc-500">/ qty PO {orderedQty}</span>
            {manualHasValues ? (
              <span
                className={`ml-2 font-medium ${
                  diff === 0
                    ? "text-emerald-600"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {diff === 0
                  ? "Sesuai PO"
                  : diff < 0
                    ? `Kurang ${Math.abs(diff)}`
                    : `Lebih ${diff}`}
              </span>
            ) : null}
          </div>
          {diff !== 0 && manualHasValues ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Total ter-pack tidak sama dengan qty PO. Box tetap bisa dibuat,
              namun akan tercatat sebagai selisih.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Total qty yang akan di-pack
            </span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={autoTotalQty}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAutoTotalQty(e.target.value)}
              className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
              required
            />
          </label>
          {autoTotalValid && autoCanSplitEvenly ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Setiap box berisi{" "}
              <span className="font-medium">{autoQtyPerBox}</span> unit.
            </p>
          ) : autoTotalValid && !autoCanSplitEvenly ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {parsedAutoTotal} tidak habis dibagi merata ke {boxCount} box.
            </p>
          ) : null}
          {autoDiff !== null && autoDiff !== 0 ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {autoDiff < 0
                ? `Kurang ${Math.abs(autoDiff)} vs qty PO (${orderedQty}).`
                : `Lebih ${autoDiff} vs qty PO (${orderedQty}).`}{" "}
              Akan tercatat sebagai selisih.
            </p>
          ) : null}
        </div>
      )}

      {errorMessage ? (
        <p
          className="ds-alert ds-alert-error"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={
            isSubmitting ||
            (mode === "manual" && !manualHasValues) ||
            (mode === "auto" && (!autoTotalValid || !autoCanSplitEvenly))
          }
        >
          {isSubmitting ? "Membuat…" : "Buat box"}
        </button>
      </div>
    </form>
    </>
  );
}
