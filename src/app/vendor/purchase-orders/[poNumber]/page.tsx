import { redirect } from "next/navigation";
import { SmartBackLink } from "@/components/navigation/SmartBackLink";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { createClient } from "@/lib/supabase/server";
import { VendorPoDetailView } from "@/components/erp-po/VendorPoDetailView";
import { getProfileById } from "@/lib/queries/profiles";
import { getPurchaseOrderDetail } from "@/lib/services/erp-po";
import { getVendorShipmentForPo } from "@/lib/services/shipment";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";

export default async function VendorPurchaseOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ poNumber: string }>;
  searchParams: Promise<{ vendor_code?: string }>;
}) {
  const { poNumber } = await params;
  const { vendor_code: rawParam } = await searchParams;
  const vendorCodeParam = rawParam?.trim() ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? (await getProfileById(supabase, user.id)).data
    : null;

  const isVendor = profile?.role === "vendor";
  const vendorCodeFromProfile =
    typeof profile?.vendor_code === "string" ? profile.vendor_code.trim() : "";

  if (isVendor && vendorCodeParam !== "") {
    redirect(`/vendor/purchase-orders/${encodeURIComponent(poNumber)}`);
  }

  const vendorCode = isVendor
    ? vendorCodeFromProfile
    : vendorCodeParam;

  if (!vendorCode) {
    return (
      <div className="ds-page-operational flex flex-col gap-3">
        <div className="ds-alert ds-alert-warn" role="status">
          {isVendor
            ? "Akun vendor Anda belum memiliki kode vendor di profil, sehingga detail PO tidak dapat dimuat. Hubungi admin."
            : "Vendor code belum tersedia. Buka daftar PO dan isi kode terlebih dahulu."}
        </div>
        <SmartBackLink fallbackHref="/vendor/purchase-orders" />
      </div>
    );
  }

  let result: Awaited<ReturnType<typeof getPurchaseOrderDetail>>;
  try {
    result = await getPurchaseOrderDetail(supabase, poNumber, vendorCode);
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(e, "Gagal memuat purchase order");
    return (
      <div className="ds-page-operational flex flex-col gap-3">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink fallbackHref="/vendor/purchase-orders" />
      </div>
    );
  }

  if (!result.ok) {
    const { message, detailHint } = userFacingErrorText(result.message);
    return (
      <div className="ds-page-operational flex flex-col gap-3">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink fallbackHref="/vendor/purchase-orders" />
      </div>
    );
  }

  let vendorShipment: Awaited<
    ReturnType<typeof getVendorShipmentForPo>
  > | null = null;
  try {
    vendorShipment = await getVendorShipmentForPo(supabase, poNumber);
  } catch {
    vendorShipment = null;
  }
  const existingShipment =
    vendorShipment && vendorShipment.ok ? vendorShipment.data : null;

  return (
    <VendorPoDetailView
      detail={result.data}
      existingShipment={existingShipment}
    />
  );
}
