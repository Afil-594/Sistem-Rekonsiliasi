import { createClient } from "@/lib/supabase/server";
import { getPurchaseOrderDetail } from "@/lib/services/erp-po";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ poNumber: string }> },
) {
  const { poNumber } = await context.params;
  const { searchParams } = new URL(request.url);
  const vendorCode = searchParams.get("vendor_code");

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof getPurchaseOrderDetail>>;
  try {
    result = await getPurchaseOrderDetail(supabase, poNumber, vendorCode);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Terjadi kesalahan.";
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
