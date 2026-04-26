import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createShipmentDraft } from "@/lib/services/shipment";

export async function POST(request: Request) {
  let payload: { po_reference?: unknown };

  try {
    payload = (await request.json()) as { po_reference?: unknown };
  } catch {
    return NextResponse.json({ error: "Format body tidak valid." }, { status: 400 });
  }

  const poReference =
    typeof payload.po_reference === "string" ? payload.po_reference : undefined;

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof createShipmentDraft>>;

  try {
    result = await createShipmentDraft(supabase, poReference);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Gagal membuat draft shipment.";
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
