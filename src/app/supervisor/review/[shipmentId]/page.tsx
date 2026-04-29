import { AlertCircle, CheckCircle2 } from "lucide-react";
import { DiscrepancyReviewCard } from "@/components/supervisor/DiscrepancyReviewCard";
import { SmartBackLink } from "@/components/navigation/SmartBackLink";
import { SupervisorReviewDetailSummary } from "@/components/supervisor/SupervisorReviewDetailSummary";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { getDiscrepancyEvidenceUrlMap } from "@/lib/services/checker";
import { getShipmentForSupervisor } from "@/lib/services/supervisor";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";
import { createClient } from "@/lib/supabase/server";

export default async function SupervisorShipmentDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;
  const supabase = await createClient();

  let result: Awaited<ReturnType<typeof getShipmentForSupervisor>>;
  try {
    result = await getShipmentForSupervisor(supabase, shipmentId);
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(e, "Gagal memuat shipment");
    return (
      <div className="ds-page-operational">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink
          className="mt-3 inline-block"
          fallbackHref="/supervisor/review"
        />
      </div>
    );
  }

  if (!result.ok) {
    const { message, detailHint } = userFacingErrorText(result.message);
    return (
      <div className="ds-page-operational">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink
          className="mt-3 inline-block"
          fallbackHref="/supervisor/review"
        />
      </div>
    );
  }

  const { shipment, boxes, discrepancies, vendorLabel } = result.data;
  const boxCodeById = Object.fromEntries(
    boxes.map((box) => [box.id, box.box_code]),
  );
  const evidenceUrlByDiscrepancyId = await getDiscrepancyEvidenceUrlMap(
    supabase,
    discrepancies,
  );

  const openCount = discrepancies.filter((d) => d.status === "open").length;
  const reviewedCount = discrepancies.filter(
    (d) => d.status === "reviewed",
  ).length;

  /** Tampilkan open lebih dulu agar fokus review sejalan dengan pekerjaan. */
  const displayDiscrepancies = [...discrepancies].sort((a, b) => {
    const openRank = (s: (typeof a)["status"]) =>
      s === "open" ? 0 : s === "reviewed" ? 1 : 2;
    const dr = openRank(a.status) - openRank(b.status);
    if (dr !== 0) {
      return dr;
    }
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="ds-page-operational">
      <div className="min-w-0">
        <SmartBackLink fallbackHref="/supervisor/review" />
      </div>

      <header className="min-w-0 border-b border-[var(--border-default)] pb-5">
        <p className="ds-section-label">Stasiun review · supervisor</p>
        <h1 className="mt-0.5 ds-h1">Keputusan selisih &amp; retur</h1>
        <p className="ds-lead max-w-3xl">
          Verifikasi setiap entri, tinjau bukti, lalu putuskan retur bila
          memenuhi kebijakan. Ringkasan shipment dan daftar di bawah disusun
          untuk alur keputusan yang jelas.
        </p>
      </header>

      {discrepancies.length > 0 ? (
        <div
          className="flex min-w-0 items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--section-bg)] px-3.5 py-3 text-sm sm:items-center sm:gap-3 sm:px-4"
          role="status"
        >
          {openCount > 0 ? (
            <>
              <AlertCircle
                className="mt-0.5 size-[1.1rem] shrink-0 text-amber-700 dark:text-amber-400"
                aria-hidden
              />
              <p className="m-0 min-w-0 leading-snug text-[var(--text-primary)]">
                {openCount === 1 ? (
                  <span>
                    <span className="font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                      Satu
                    </span>{" "}
                    <span className="text-[var(--text-secondary)]">
                      entri terbuka menunggu keputusan retur — selesaikan di
                      daftar bawah.
                    </span>
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                      {openCount} entri
                    </span>{" "}
                    <span className="text-[var(--text-secondary)]">
                      terbuka menunggu keputusan retur — selesaikan di daftar
                      bawah.
                    </span>
                  </span>
                )}
              </p>
            </>
          ) : (
            <>
              <CheckCircle2
                className="mt-0.5 size-[1.1rem] shrink-0 text-[var(--navy)]"
                aria-hidden
              />
              <p className="m-0 min-w-0 text-[var(--text-primary)]">
                <span className="font-medium">Semua entri di shipment ini</span>{" "}
                <span className="text-[var(--text-secondary)]">
                  sudah ditinjau. Anda dapat mencentang ulang detail atau
                  melanjutkan alur pekerjaan lain.
                </span>
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="min-w-0">
        <SupervisorReviewDetailSummary
          shipment={shipment}
          vendorLabel={vendorLabel}
          openCount={openCount}
          reviewedCount={reviewedCount}
          totalCount={discrepancies.length}
        >
          {discrepancies.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Belum ada selisih untuk shipment ini.
            </p>
          ) : (
            <ul
              className="ds-card-grid m-0 list-none p-0"
              aria-label="Selisih untuk ditinjau"
            >
              {displayDiscrepancies.map((discrepancy) => (
                <li key={discrepancy.id} className="min-w-0">
                  <DiscrepancyReviewCard
                    discrepancy={discrepancy}
                    boxCode={
                      discrepancy.box_id
                        ? (boxCodeById[discrepancy.box_id] ?? null)
                        : null
                    }
                    evidenceUrl={
                      evidenceUrlByDiscrepancyId[discrepancy.id] ?? null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </SupervisorReviewDetailSummary>
      </div>
    </div>
  );
}
