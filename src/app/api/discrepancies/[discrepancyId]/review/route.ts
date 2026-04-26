import { NextResponse } from "next/server";
import { reviewDiscrepancy } from "@/lib/services/supervisor";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ discrepancyId: string }> },
) {
  const { discrepancyId } = await context.params;
  const supabase = await createClient();

  let result: Awaited<ReturnType<typeof reviewDiscrepancy>>;
  try {
    result = await reviewDiscrepancy(supabase, discrepancyId);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Gagal meninjau selisih.";
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
