import { createClient } from "@/lib/supabase/server";
import { SmartBackLink } from "@/components/navigation/SmartBackLink";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { ShipmentDetailView } from "@/components/shipments/ShipmentDetailView";
import { getShipmentDetailForVendor } from "@/lib/services/shipment";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";

export default async function VendorShipmentDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;
  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof getShipmentDetailForVendor>>;

  try {
    result = await getShipmentDetailForVendor(supabase, shipmentId);
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(e, "Gagal memuat shipment");
    return (
      <div className="ds-page-operational-tight flex flex-col gap-3">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink fallbackHref="/vendor/shipments" />
      </div>
    );
  }

  if (!result.ok) {
    const { message, detailHint } = userFacingErrorText(result.message);
    return (
      <div className="ds-page-operational-tight flex flex-col gap-3">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink fallbackHref="/vendor/shipments" />
      </div>
    );
  }

  return <ShipmentDetailView detail={result.data} />;
}
