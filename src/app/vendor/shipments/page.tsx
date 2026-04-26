import { createClient } from "@/lib/supabase/server";
import { SmartBackLink } from "@/components/navigation/SmartBackLink";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { VendorShipmentsList } from "@/components/shipments/VendorShipmentsList";
import { listVendorShipments } from "@/lib/services/shipment";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";
import { VENDOR_SHIPMENT_STATUS_FILTERS } from "@/lib/utils/vendor-shipment-visibility";

function normalizeShipmentListFilter(
  status: string | undefined,
): { filterKey: string; queryToService: string } {
  const t = status?.trim() ?? "";
  if (t === "" || t === "all") {
    return { filterKey: "all", queryToService: "all" };
  }
  const valid = VENDOR_SHIPMENT_STATUS_FILTERS.some((f) => f.value === t);
  if (!valid) {
    return { filterKey: "all", queryToService: "all" };
  }
  return { filterKey: t, queryToService: t };
}

export default async function VendorShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: raw } = await searchParams;
  const supabase = await createClient();
  const { filterKey, queryToService } = normalizeShipmentListFilter(raw);

  let result: Awaited<ReturnType<typeof listVendorShipments>>;
  try {
    result = await listVendorShipments(supabase, { status: queryToService });
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(
      e,
      "Gagal memuat daftar shipment.",
    );
    return (
      <div className="ds-page-operational gap-4">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink
          variant="default"
          fallbackHref="/vendor/purchase-orders"
        />
      </div>
    );
  }

  if (!result.ok) {
    const { message, detailHint } = userFacingErrorText(result.message);
    return (
      <div className="ds-page-operational gap-4">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink
          variant="default"
          fallbackHref="/vendor/purchase-orders"
        />
      </div>
    );
  }

  return (
    <div className="ds-page-operational">
      <header className="border-b border-[var(--border-default)] pb-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="ds-section-label mb-0">Vendor</p>
          <SmartBackLink variant="nav" fallbackHref="/vendor/purchase-orders" />
        </div>
        <h1 className="ds-h1">Shipment Anda</h1>
        <p className="ds-lead max-w-3xl">
          Lacak progres, status alur, dan referensi PO per baris. Buka detail untuk box,
          label, dan kondisi bermasalah. Saring daftar lewat tab status di bawah.
        </p>
      </header>
      <VendorShipmentsList rows={result.data} currentFilter={filterKey} />
    </div>
  );
}
