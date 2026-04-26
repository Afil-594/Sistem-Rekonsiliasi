import { BarChart2, ListTree } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  DiscrepancyActivityTable,
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
  const feed = m.discrepancyFeed;
  const latestLabel =
    feed.length > 0 && feed[0].createdAt
      ? formatDiscrepancyWhen(feed[0].createdAt)
      : null;

  return (
    <div className="ds-page-operational">
      <div className="ds-section-tint border-l-[3px] border-l-[var(--navy)]">
        <header className="space-y-2">
          <p className="ds-section-label mb-1">Supervisor</p>
          <h1 className="ds-h1">History shipmnet</h1>
          <p className="ds-lead max-w-2xl">
            Feed pemantauan: entri diurut menurut waktu tercatat, dengan referensi shipment, lapisan,
            jenis, status, serta vendor dan part bila tersedia — disusun untuk pemindaian cepat.
          </p>
        </header>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="ds-summary-strip max-w-md text-xs">
            <ListTree className="h-3.5 w-3.5 text-[var(--navy)]" aria-hidden />
            <span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {feed.length}
              </span>{" "}
              entri dalam feed ringkasan
              {latestLabel ? (
                <>
                  {" "}
                  · entri paling baru: <span className="font-mono">{latestLabel}</span>
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
        title="Daftar aktivitas"
        lead="Urutan waktu terbaru di atas. Kode shipment tertaut ke review jika status masih issue."
      >
        <DiscrepancyActivityTable rows={feed} />
      </SectionCard>
    </div>
  );
}
