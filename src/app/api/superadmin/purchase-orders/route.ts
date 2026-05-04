import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createPurchaseOrder,
  type CreatePurchaseOrderItemInput,
} from "@/lib/services/erp-po-admin";

function parseItems(raw: unknown): CreatePurchaseOrderItemInput[] | null {
  if (!Array.isArray(raw)) return null;
  const out: CreatePurchaseOrderItemInput[] = [];
  for (const el of raw) {
    if (!el || typeof el !== "object") return null;
    const o = el as Record<string, unknown>;
    const part_number = typeof o.part_number === "string" ? o.part_number : "";
    const part_name = typeof o.part_name === "string" ? o.part_name : "";
    const quantity_ordered =
      typeof o.quantity_ordered === "number" ? o.quantity_ordered : NaN;
    const unit =
      o.unit === null || o.unit === undefined
        ? undefined
        : typeof o.unit === "string"
          ? o.unit
          : null;
    out.push({ part_number, part_name, quantity_ordered, unit });
  }
  return out;
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Format body tidak valid." }, { status: 400 });
  }

  const po_number = typeof payload.po_number === "string" ? payload.po_number : "";
  const vendor_code = typeof payload.vendor_code === "string" ? payload.vendor_code : "";
  const items = parseItems(payload.items);

  if (!items) {
    return NextResponse.json({ error: "Field items harus berupa array." }, { status: 400 });
  }

  const supabase = await createClient();

  let result: Awaited<ReturnType<typeof createPurchaseOrder>>;
  try {
    result = await createPurchaseOrder(supabase, {
      po_number,
      vendor_code,
      items,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal membuat PO.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
