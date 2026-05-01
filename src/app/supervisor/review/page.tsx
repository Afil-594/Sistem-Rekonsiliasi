import { createClient } from "@/lib/supabase/server";
import { SupervisorReviewShipmentList } from "@/components/supervisor/SupervisorReviewShipmentList";
import { listIssueShipments } from "@/lib/services/supervisor";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  userFacingErrorText,
  userFacingLoadError,
} from "@/lib/utils/load-failure";

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

  const queue = result.data;

  return (
    <div className="ds-page-operational">
      <div className="ds-section-tint rounded-[var(--radius-lg)] border border-[var(--border-default)] border-l-[3px] border-l-[var(--navy)] bg-[var(--surface)] px-4 py-5 sm:px-6 sm:py-6">
        <header className="space-y-2">
          <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--navy)] opacity-95">
            Supervisor
          </p>
          <h1 className="ds-h1 m-0">Review discrepancy</h1>
          <p className="ds-lead m-0 max-w-2xl text-[var(--text-secondary)]">
            Shipment dengan kondisi bermasalah yang memerlukan keputusan
            supervisor.
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
        title="Antrian discrepancy"
        lead={
          queue.length === 0
            ? "Belum ada shipment dalam antrian. Item akan muncul bila ada yang perlu ditinjau."
            : "Filter, urutkan, dan buka shipment untuk mengambil keputusan per selisih."
        }
      >
        <SupervisorReviewShipmentList queue={queue} />
      </SectionCard>
    </div>
  );
}
