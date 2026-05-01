import { BarChart2, ListTree } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  SupervisorShipmentActivityTable,
  formatDiscrepancyWhen,
} from "@/components/supervisor/DiscrepancyActivityFeed";
import { getDashboardStats } from "@/lib/services/supervisor";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";

export default async function SupervisorDiscrepancyActivitiesPage() {
  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof getDashboardStats>>;

  try {
    result = await getDashboardStats(supabase);
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(e, "Gagal memuat data");
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

  const stats = result.data;
  const m = stats.monitoring;
  const feed = m.shipmentActivityFeed;
  const latestLabel =
    feed.length > 0 && feed[0].lastActivityAt
      ? formatDiscrepancyWhen(feed[0].lastActivityAt)
      : null;

  return (
    <div className="ds-page-operational">
      <div className="ds-section-tint border-l-[3px] border-l-[var(--navy)]">
        <header className="space-y-2">
          <p className="ds-section-label mb-1">Supervisor</p>
          <h1 className="ds-h1">History shipment</h1>
          <p className="ds-lead max-w-2xl">
            Daftar shipment yang sedang dalam tinjauan supervisor (<span className="font-mono text-sm">issue</span>) atau
            sudah selesai (<span className="font-mono text-sm">done</span>). Satu baris per shipment — urutan mengikuti
            aktivitas terbaru pada catatan selisih atau pembuatan shipment.
          </p>
        </header>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="ds-summary-strip max-w-md text-xs">
            <ListTree className="h-3.5 w-3.5 text-[var(--navy)]" aria-hidden />
            <span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {feed.length}
              </span>{" "}
              shipment ditampilkan (maks. 50 urut aktivitas terbaru)
              {latestLabel ? (
                <>
                  {" "}
                  · aktivitas terbaru: <span className="font-mono">{latestLabel}</span>
                </>
              ) : null}
            </span>
          </div>
          <div className="ds-summary-strip max-w-md text-xs">
            <BarChart2 className="h-3.5 w-3.5 text-[var(--navy)]" aria-hidden />
            <span>
              Total selisih tercatat (sistem):{" "}
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {stats.totalDiscrepancies}
              </span>
            </span>
          </div>
        </div>
      </div>

      <SectionCard
        className="mt-6"
        title="Daftar shipment"
        lead="Gunakan tombol Aksi: Review untuk shipment Issue, atau Lihat detail untuk arsip shipment Done (baca hasil tinjauan)."
      >
        <SupervisorShipmentActivityTable rows={feed} />
      </SectionCard>
    </div>
  );
}
