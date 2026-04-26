import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { confirmShipment } from "@/lib/services/shipment";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  const { shipmentId } = await params;

  if (!shipmentId) {
    return NextResponse.json(
      { error: "Parameter shipmentId wajib diisi." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof confirmShipment>>;

  try {
    result = await confirmShipment(supabase, shipmentId);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Gagal mengonfirmasi shipment.";
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
