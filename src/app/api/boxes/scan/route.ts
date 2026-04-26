import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scanBoxArrival } from "@/lib/services/checker";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Format body tidak valid." }, { status: 400 });
  }

  const shipmentId =
    typeof payload.shipment_id === "string" ? payload.shipment_id : "";
  const boxCode = typeof payload.box_code === "string" ? payload.box_code : "";

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof scanBoxArrival>>;

  try {
    result = await scanBoxArrival(supabase, {
      shipmentId,
      boxCode,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal memproses scan box.";
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
