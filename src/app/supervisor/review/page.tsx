import { createClient } from "@/lib/supabase/server";
import { SupervisorReviewShipmentList } from "@/components/supervisor/SupervisorReviewShipmentList";
import { listIssueShipments } from "@/lib/services/supervisor";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";

export default async function SupervisorReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ reviewed?: string }>;
}) {
  const { reviewed } = await searchParams;
  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof listIssueShipments>>;

  try {
    result = await listIssueShipments(supabase);
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(
      e,
      "Gagal memuat daftar shipment",
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
      <div className="ds-section-tint border-l-[3px] border-l-[var(--navy)]">
        <header className="space-y-2">
          <p className="ds-section-label mb-1">Supervisor</p>
          <h1 className="ds-h1">Tinjau selisih</h1>
          <p className="ds-lead max-w-2xl">
            Shipment dengan kondisi bermasalah yang memerlukan keputusan supervisor (termasuk
            retur).
          </p>
        </header>
      </div>

      {reviewed ? (
        <p className="ds-alert ds-alert-success" role="status">
          Semua selisih untuk shipment{" "}
          <span className="ds-inline-code">{reviewed}</span> sudah ditinjau.
        </p>
      ) : null}

      <SectionCard
        title="Antrian tinjauan"
        lead={
          shipments.length === 0
            ? "Belum ada shipment dalam antrean. Item akan tampil di sini bila perlu tindakan."
            : "Klik sebuah kartu untuk membuka review per box. Urutan mengikuti daftar issue dari sistem."
        }
      >
        {shipments.length === 0 ? (
          <div className="ds-empty">
            Tidak ada shipment yang memerlukan tinjauan saat ini.
          </div>
        ) : (
          <SupervisorReviewShipmentList shipments={shipments} />
        )}
      </SectionCard>
    </div>
  );
}
