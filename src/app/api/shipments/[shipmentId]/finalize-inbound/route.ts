import { NextResponse } from "next/server";
import { finalizeScanForShipment } from "@/lib/services/checker";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ shipmentId: string }> },
) {
  const { shipmentId } = await context.params;
  const supabase = await createClient();

  let result: Awaited<ReturnType<typeof finalizeScanForShipment>>;
  try {
    result = await finalizeScanForShipment(supabase, shipmentId);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Gagal menyelesaikan scan kedatangan.";
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
