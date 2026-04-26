import { createClient } from "@/lib/supabase/server";
import { listPurchaseOrdersByVendor } from "@/lib/services/erp-po";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorCode = searchParams.get("vendor_code");

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof listPurchaseOrdersByVendor>>;
  try {
    result = await listPurchaseOrdersByVendor(supabase, vendorCode);
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
