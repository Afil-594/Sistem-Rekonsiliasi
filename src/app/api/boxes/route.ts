import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createBoxes,
  listBoxesForVendorShipment,
  type CreateBoxesInput,
} from "@/lib/services/box";

function parseQtyArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const result: number[] = [];
  for (const raw of value) {
    const num = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(num)) {
      return null;
    }
    result.push(num);
  }
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shipmentId = searchParams.get("shipment_id");

  if (!shipmentId) {
    return NextResponse.json(
      { error: "Parameter shipment_id wajib diisi." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof listBoxesForVendorShipment>>;

  try {
    result = await listBoxesForVendorShipment(supabase, shipmentId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal memuat daftar box.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ data: result.data });
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Format body tidak valid." }, { status: 400 });
  }

  const mode = payload.mode;
  const shipmentId =
    typeof payload.shipment_id === "string" ? payload.shipment_id : "";
  const partNumber =
    typeof payload.part_number === "string" ? payload.part_number : "";
  const lotNumber =
    typeof payload.lot_number === "string" ? payload.lot_number : "";
  const replace = payload.replace === true;

  let input: CreateBoxesInput;

  if (mode === "manual") {
    const qtyList = parseQtyArray(payload.qty_per_box);
    if (!qtyList) {
      return NextResponse.json(
        { error: "qty_per_box harus berupa array angka." },
        { status: 400 },
      );
    }
    input = {
      mode: "manual",
      shipment_id: shipmentId,
      part_number: partNumber,
      lot_number: lotNumber,
      qty_per_box: qtyList,
      replace,
    };
  } else if (mode === "auto") {
    const rawBoxCount = payload.box_count;
    const boxCount =
      typeof rawBoxCount === "number" ? rawBoxCount : Number(rawBoxCount);
    if (!Number.isFinite(boxCount)) {
      return NextResponse.json(
        { error: "box_count harus berupa angka." },
        { status: 400 },
      );
    }
    const rawTotalQty = payload.total_qty;
    const totalQty =
      typeof rawTotalQty === "number" ? rawTotalQty : Number(rawTotalQty);
    if (!Number.isFinite(totalQty)) {
      return NextResponse.json(
        { error: "total_qty harus berupa angka." },
        { status: 400 },
      );
    }
    input = {
      mode: "auto",
      shipment_id: shipmentId,
      part_number: partNumber,
      lot_number: lotNumber,
      box_count: boxCount,
      total_qty: totalQty,
      replace,
    };
  } else {
    return NextResponse.json(
      { error: "mode harus 'manual' atau 'auto'." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof createBoxes>>;

  try {
    result = await createBoxes(supabase, input);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal membuat box.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
