import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { createClient } from "@/lib/supabase/server";
import { CheckerArrivalList } from "@/components/checker/CheckerArrivalList";
import { listCheckerShipments } from "@/lib/services/checker";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";

export default async function CheckerArrivalPage({
  searchParams,
}: {
  searchParams: Promise<{ finalized?: string }>;
}) {
  const { finalized } = await searchParams;
  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof listCheckerShipments>>;

  try {
    result = await listCheckerShipments(supabase);
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(
      e,
      "Gagal memuat daftar shipment.",
    );
    return (
      <div className="ds-page-operational">
        <LoadErrorState message={message} detailHint={detailHint} />
      </div>
    );
  }

  if (!result.ok) {
    const { message, detailHint } = userFacingErrorText(result.message);
    return (
      <div className="ds-page-operational">
        <LoadErrorState message={message} detailHint={detailHint} />
      </div>
    );
  }

  const shipments = result.data;

  return (
    <div className="ds-page-operational">
      <header className="border-b border-[var(--border-default)] pb-6">
        <p className="ds-section-label mb-1">Checker · Inbound</p>
        <h1 className="ds-h1">Verifikasi inbound</h1>
        <p className="ds-lead">
          Pilih shipment untuk scan box, rekonsiliasi, atau lanjutkan QC pada box
          yang sudah tiba.
        </p>
      </header>

      {finalized ? (
        <p className="ds-alert ds-alert-success" role="status">
          Shipment{" "}
          <span className="ds-inline-code">{finalized}</span> sudah diselesaikan
          (finalize scan).
        </p>
      ) : null}

      {shipments.length === 0 ? (
        <div className="ds-empty">
          Tidak ada shipment yang memerlukan scan atau QC saat ini.
        </div>
      ) : (
        <CheckerArrivalList shipments={shipments} />
      )}
    </div>
  );
}
