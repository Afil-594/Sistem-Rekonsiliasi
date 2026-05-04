import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfileById, vendorProfileExistsForCode } from "@/lib/queries/profiles";
import { getHeaderByPoNumber } from "@/lib/queries/erp-po";
import { insertAuditLog } from "@/lib/queries/audit-logs";
import type { Profile } from "@/types/profile";

async function requireSuperadminProfile(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; profile: Profile }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }
  if (!user) {
    return { ok: false, status: 401, message: "Silakan masuk terlebih dahulu." };
  }

  const { data: profile, error: profileError } = await getProfileById(
    supabase,
    user.id,
  );
  if (profileError) {
    throw profileError;
  }
  if (!profile || profile.role !== "superadmin") {
    return { ok: false, status: 403, message: "Hanya Superadmin yang dapat mengakses." };
  }

  return { ok: true, profile };
}

export type CreatePurchaseOrderItemInput = {
  part_number: string;
  part_name: string;
  quantity_ordered: number;
  unit?: string | null;
};

export type CreatePurchaseOrderInput = {
  po_number: string;
  vendor_code: string;
  items: CreatePurchaseOrderItemInput[];
};

export type CreatedPurchaseOrderResult = {
  po_number: string;
  vendor_code: string;
  item_count: number;
};

export async function createPurchaseOrder(
  supabase: SupabaseClient,
  input: CreatePurchaseOrderInput,
): Promise<
  | { ok: true; data: CreatedPurchaseOrderResult }
  | { ok: false; status: 400 | 401 | 403 | 409; message: string }
> {
  const admin = await requireSuperadminProfile(supabase);
  if (!admin.ok) return admin;

  const poNumber = input.po_number.trim();
  const vendorCode = input.vendor_code.trim();

  if (!poNumber) {
    return { ok: false, status: 400, message: "Nomor PO wajib diisi." };
  }
  if (!vendorCode) {
    return { ok: false, status: 400, message: "Vendor code wajib diisi." };
  }

  const items = input.items ?? [];
  if (items.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Minimal satu baris item PO.",
    };
  }

  const normalizedItems: {
    part_number: string;
    part_name: string;
    quantity_ordered: number;
    unit: string;
  }[] = [];

  for (let i = 0; i < items.length; i++) {
    const row = items[i]!;
    const partNumber = row.part_number.trim();
    const partName = row.part_name.trim();
    const qty = row.quantity_ordered;
    const unitRaw = row.unit;
    const unit =
      typeof unitRaw === "string" && unitRaw.trim() !== ""
        ? unitRaw.trim()
        : "pcs";

    if (!partNumber || !partName) {
      return {
        ok: false,
        status: 400,
        message: `Baris ${i + 1}: nomor part dan nama part wajib diisi.`,
      };
    }
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      return {
        ok: false,
        status: 400,
        message: `Baris ${i + 1}: qty harus bilangan bulat positif.`,
      };
    }
    normalizedItems.push({
      part_number: partNumber,
      part_name: partName,
      quantity_ordered: qty,
      unit,
    });
  }

  const { data: vendorOk, error: vendorErr } = await vendorProfileExistsForCode(
    supabase,
    vendorCode,
  );
  if (vendorErr) {
    throw vendorErr;
  }
  if (!vendorOk) {
    return {
      ok: false,
      status: 400,
      message:
        "Vendor code tidak cocok dengan akun vendor manapun. Buat atau perbarui pengguna vendor terlebih dahulu.",
    };
  }

  const { data: existing, error: existingErr } = await getHeaderByPoNumber(
    supabase,
    poNumber,
  );
  if (existingErr) {
    throw existingErr;
  }
  if (existing) {
    return {
      ok: false,
      status: 409,
      message: `Nomor PO "${poNumber}" sudah ada.`,
    };
  }

  const { error: headerError } = await supabase.from("erp_po_headers").insert({
    po_number: poNumber,
    vendor_code: vendorCode,
  });

  if (headerError) {
    if (headerError.code === "23505") {
      return {
        ok: false,
        status: 409,
        message: `Nomor PO "${poNumber}" sudah ada.`,
      };
    }
    return {
      ok: false,
      status: 400,
      message: headerError.message,
    };
  }

  const itemRows = normalizedItems.map((it) => ({
    po_number: poNumber,
    part_number: it.part_number,
    part_name: it.part_name,
    quantity_ordered: it.quantity_ordered,
    unit: it.unit,
  }));

  const { error: itemsError } = await supabase.from("erp_po_items").insert(itemRows);

  if (itemsError) {
    await supabase.from("erp_po_headers").delete().eq("po_number", poNumber);
    return {
      ok: false,
      status: 400,
      message: itemsError.message,
    };
  }

  const { error: auditError } = await insertAuditLog(supabase, {
    user_id: admin.profile.id,
    action: "superadmin_create_po",
    target_table: "erp_po_headers",
    payload: {
      po_number: poNumber,
      vendor_code: vendorCode,
      item_count: normalizedItems.length,
      actor_name: admin.profile.full_name,
    },
  });

  if (auditError) {
    throw auditError;
  }

  return {
    ok: true,
    data: {
      po_number: poNumber,
      vendor_code: vendorCode,
      item_count: normalizedItems.length,
    },
  };
}
