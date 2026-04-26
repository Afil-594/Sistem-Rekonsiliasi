"use client";

import { useState } from "react";
import { BoxList } from "@/components/boxes/BoxList";
import type { Box } from "@/types/box";

const DEFAULT_VISIBLE = 5;

type Props = {
  boxes: Box[];
};

/**
 * Membatasi jumlah baris tabel box yang tampil secara default; sisa dilalui
 * lewat expand ringan (tanpa mengubah data).
 */
export function BoxListWithLimit({ boxes }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (boxes.length === 0) {
    return <BoxList boxes={boxes} />;
  }

  const hasMore = boxes.length > DEFAULT_VISIBLE;
  const visible = !hasMore || showAll ? boxes : boxes.slice(0, DEFAULT_VISIBLE);

  return (
    <div className="flex flex-col gap-3">
      <BoxList boxes={visible} />
      {hasMore ? (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-xs text-[var(--text-muted)]" role="status">
            {showAll
              ? `Menampilkan semua ${boxes.length} box.`
              : `Menampilkan ${DEFAULT_VISIBLE} dari ${boxes.length} box.`}
          </p>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="ds-link self-start text-sm font-medium sm:self-auto"
          >
            {showAll ? "Tampilkan 5 teratas saja" : "Lihat semua packing box"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
