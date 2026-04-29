import type { SupabaseClient } from "@supabase/supabase-js";
import { listShipmentsByStatus } from "@/lib/queries/shipments";

const DISCREPANCY_SHIPMENT_CHUNK = 150;

/** Satu unit bermasalah per shipment done: kotak berbeda + satu unit per baris tanpa kotak. */
export function problemUnitsForDiscrepancyRows(
  rows: { box_id: string | null }[],
): number {
  const distinctBoxes = new Set<string>();
  let orphanRows = 0;
  for (const r of rows) {
    if (r.box_id) {
      distinctBoxes.add(r.box_id);
    } else {
      orphanRows += 1;
    }
  }
  return distinctBoxes.size + orphanRows;
}

export type DoneShipmentQualityAggregate = {
  doneCount: number;
  cleanDoneCount: number;
  problemDoneCount: number;
  /** Σ problem-units untuk tiap shipment done (kotak bermasalah + baris tanpa kotak). */
  sumProblemUnits: number;
};

/**
 * Metrik supervisor: partisi shipment `done`, dan basis rata-rata unit bermasalah per shipment done.
 */
export async function getDoneShipmentQualityAggregate(
  supabase: SupabaseClient,
): Promise<{ data: DoneShipmentQualityAggregate; error: Error | null }> {
  const { data: doneShipments, error: doneError } = await listShipmentsByStatus(
    supabase,
    "done",
  );
  if (doneError) {
    return {
      data: {
        doneCount: 0,
        cleanDoneCount: 0,
        problemDoneCount: 0,
        sumProblemUnits: 0,
      },
      error: doneError,
    };
  }

  const doneIds = (doneShipments ?? []).map((s) => s.id);
  const doneCount = doneIds.length;

  if (doneCount === 0) {
    return {
      data: {
        doneCount: 0,
        cleanDoneCount: 0,
        problemDoneCount: 0,
        sumProblemUnits: 0,
      },
      error: null,
    };
  }

  const rowsByShipment = new Map<string, { box_id: string | null }[]>();

  for (let i = 0; i < doneIds.length; i += DISCREPANCY_SHIPMENT_CHUNK) {
    const chunk = doneIds.slice(i, i + DISCREPANCY_SHIPMENT_CHUNK);
    const { data: discRows, error: discError } = await supabase
      .from("discrepancies")
      .select("shipment_id, box_id")
      .in("shipment_id", chunk);

    if (discError) {
      return {
        data: {
          doneCount: 0,
          cleanDoneCount: 0,
          problemDoneCount: 0,
          sumProblemUnits: 0,
        },
        error: new Error(discError.message),
      };
    }

    for (const raw of discRows ?? []) {
      const sid =
        typeof raw.shipment_id === "string" ? raw.shipment_id : "";
      if (!sid) {
        continue;
      }
      const boxId =
        typeof raw.box_id === "string" ? raw.box_id : null;
      const list = rowsByShipment.get(sid);
      const row = { box_id: boxId };
      if (list) {
        list.push(row);
      } else {
        rowsByShipment.set(sid, [row]);
      }
    }
  }

  let cleanDoneCount = 0;
  let problemDoneCount = 0;
  let sumProblemUnits = 0;

  for (const id of doneIds) {
    const rows = rowsByShipment.get(id) ?? [];
    if (rows.length === 0) {
      cleanDoneCount += 1;
      continue;
    }
    problemDoneCount += 1;
    sumProblemUnits += problemUnitsForDiscrepancyRows(rows);
  }

  return {
    data: {
      doneCount,
      cleanDoneCount,
      problemDoneCount,
      sumProblemUnits,
    },
    error: null,
  };
}
