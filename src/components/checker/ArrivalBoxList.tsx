"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Box } from "@/types/box";
import { statusBadgeClassName } from "@/lib/ui/status-styles";
import { BoxQcDialog } from "./BoxQcDialog";

type Props = {
  shipmentId: string;
  boxes: Box[];
  showQc: boolean;
  /** Buka dialog QC & scroll ke baris jika box masih menunggu QC (dari query `qcBox`). */
  initialQcBoxId?: string | null;
};

function statusLabel(status: Box["status"]) {
  if (status === "accepted") {
    return "Diterima (sesuai)";
  }
  if (status === "rejected") {
    return "Ditolak (bermasalah)";
  }
  if (status === "arrived") {
    return "Tiba (menunggu QC)";
  }
  if (status === "pending") {
    return "Belum di-scan";
  }
  return status ?? "—";
}

export function ArrivalBoxList({
  shipmentId,
  boxes,
  showQc,
  initialQcBoxId = null,
}: Props) {
  const router = useRouter();
  const [openBoxId, setOpenBoxId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const appliedInitialQcRef = useRef<string | null>(null);

  const openBox = boxes.find((box) => box.id === openBoxId) ?? null;

  useEffect(() => {
    const raw = initialQcBoxId?.trim();
    if (!raw) {
      appliedInitialQcRef.current = null;
      return;
    }
    if (appliedInitialQcRef.current === raw) {
      return;
    }
    const box = boxes.find((b) => b.id === raw);
    if (!box) {
      return;
    }
    appliedInitialQcRef.current = raw;
    requestAnimationFrame(() => {
      document
        .getElementById(`arrival-box-row-${box.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    if (showQc && box.status === "arrived") {
      setLastMessage(null);
      setOpenBoxId(box.id);
    }
  }, [initialQcBoxId, boxes, showQc]);

  if (boxes.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Belum ada box pada shipment ini.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {lastMessage ? (
        <p className="ds-alert ds-alert-success" role="status">
          {lastMessage}
        </p>
      ) : null}

      <div className="ds-table-wrap ds-table-wrap--sticky">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="ds-thead">
              <th className="ds-tcell border-0 pl-3">Kode box</th>
              <th className="ds-tcell border-0">Part</th>
              <th className="ds-tcell border-0 text-right">Qty</th>
              <th className="ds-tcell border-0">Lot</th>
              <th className="ds-tcell border-0">Status</th>
              {showQc ? (
                <th className="ds-tcell border-0 pr-3 text-left">Aksi QC</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {boxes.map((row) => {
              const needsQc = showQc && row.status === "arrived";
              const isQcDone =
                row.status === "accepted" || row.status === "rejected";
              return (
                <tr
                  key={row.id}
                  id={`arrival-box-row-${row.id}`}
                  className={`ds-trow ${
                    needsQc
                      ? "bg-amber-50/90 ring-1 ring-amber-300/50 ring-inset dark:bg-amber-950/30 dark:ring-amber-700/40"
                      : isQcDone
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                        : !showQc && row.status === "pending"
                          ? "bg-slate-50/50 dark:bg-slate-900/20"
                          : ""
                  }`}
                >
                  <td
                    className={`ds-tcell pl-3 ds-tcell--mono sm:text-sm ${
                      needsQc
                        ? "border-l-4 border-l-amber-500 pl-2"
                        : isQcDone
                          ? "border-l-2 border-l-emerald-500 pl-2.5"
                          : ""
                    }`}
                  >
                    {row.box_code}
                  </td>
                  <td className="ds-tcell ds-tcell--mono sm:text-sm">
                    {row.part_number}
                  </td>
                  <td className="ds-tcell text-right tabular-nums font-medium">
                    {row.qty_per_box}
                  </td>
                  <td className="ds-tcell ds-tcell--mono text-[0.8rem] text-[var(--text-secondary)]">
                    {row.lot_number}
                  </td>
                  <td className="ds-tcell">
                    <span
                      className={statusBadgeClassName(row.status)}
                      title={statusLabel(row.status)}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  {showQc ? (
                    <td className="ds-tcell pr-3">
                      {row.status === "arrived" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setLastMessage(null);
                            setOpenBoxId(row.id);
                          }}
                          className="ds-btn ds-btn-primary min-w-[5.5rem] px-2.5 py-1.5 text-xs font-semibold shadow-sm"
                        >
                          Mulai QC
                        </button>
                      ) : isQcDone ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                          <span
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[0.6rem] leading-none text-white"
                            aria-hidden
                          >
                            ✓
                          </span>
                          Selesai
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showQc && openBox ? (
        <BoxQcDialog
          key={openBox.id}
          shipmentId={shipmentId}
          box={openBox}
          onClose={() => setOpenBoxId(null)}
          onSuccess={(updated) => {
            setOpenBoxId(null);
            setLastMessage(
              updated.status === "accepted"
                ? `Box ${updated.box_code} diterima (sesuai).`
                : `Box ${updated.box_code} ditolak — selisih tercatat.`,
            );
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
