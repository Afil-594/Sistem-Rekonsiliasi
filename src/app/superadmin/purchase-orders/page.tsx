import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreatePurchaseOrderForm } from "@/components/superadmin/CreatePurchaseOrderForm";
import type { VendorCodeHint } from "@/components/superadmin/CreatePurchaseOrderForm";
import { listProfiles } from "@/lib/queries/profiles";

export default async function SuperadminPurchaseOrdersPage() {
  const supabase = await createClient();
  const { data: profiles, error } = await listProfiles(supabase);

  const vendorHints: VendorCodeHint[] = error
    ? []
    : (profiles ?? [])
        .filter((p) => p.role === "vendor")
        .map((p) => {
          const code = typeof p.vendor_code === "string" ? p.vendor_code.trim() : "";
          if (!code) return null;
          const name = p.full_name?.trim() ?? "";
          return {
            code,
            label: name ? `${code} — ${name}` : code,
          } satisfies VendorCodeHint;
        })
        .filter((h): h is VendorCodeHint => h !== null)
        .sort((a, b) => a.code.localeCompare(b.code, "id"));

  return (
    <div className="ds-page-operational">
      <div className="ds-section-tint border-l-[3px] border-l-[var(--epson-yellow)]">
        <p className="ds-section-label mb-1">Superadmin</p>
        <h1 className="ds-h1">Data purchase order</h1>
        <p className="ds-lead max-w-2xl">
          Buat header dan line item PO di database. Data ini dipakai vendor untuk memilih PO
          dan membuat shipment, sama seperti saat Anda mengisi lewat query Supabase.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="ds-summary-strip border-[var(--border-default)]">
            <ClipboardList className="h-4 w-4 text-[var(--navy)]" aria-hidden />
            <span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {vendorHints.length}
              </span>{" "}
              kode vendor terdaftar
            </span>
          </span>
        </div>
      </div>

      <div className="mt-8 max-w-4xl">
        <CreatePurchaseOrderForm vendorHints={vendorHints} />
      </div>
    </div>
  );
}
