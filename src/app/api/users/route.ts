import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUser } from "@/lib/services/user-management";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Format body tidak valid." }, { status: 400 });
  }

  const email = typeof payload.email === "string" ? payload.email : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const fullName = typeof payload.full_name === "string" ? payload.full_name : "";
  const role = typeof payload.role === "string" ? payload.role : "";
  const vendorCode = typeof payload.vendor_code === "string" ? payload.vendor_code : undefined;

  const supabase = await createClient();

  let result: Awaited<ReturnType<typeof createUser>>;
  try {
    result = await createUser(supabase, {
      email,
      password,
      full_name: fullName,
      role,
      vendor_code: vendorCode,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal membuat pengguna.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
