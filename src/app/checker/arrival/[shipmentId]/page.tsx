import { ArrivalBoxList } from "@/components/checker/ArrivalBoxList";
import { SmartBackLink } from "@/components/navigation/SmartBackLink";
import { ArrivalScanForm } from "@/components/checker/ArrivalScanForm";
import {
  CheckerArrivalPageHeading,
  CheckerArrivalProgressBlock,
} from "@/components/checker/CheckerArrivalStagePanel";
import { CheckerShipmentSummaryCard } from "@/components/checker/CheckerShipmentSummaryCard";
import { FinalizeScanButton } from "@/components/checker/FinalizeInboundButton";
import { ShipmentDiscrepancyList } from "@/components/checker/ShipmentDiscrepancyList";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import {
  getDiscrepancyEvidenceUrlMap,
  getShipmentForChecker,
} from "@/lib/services/checker";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";
import { createClient } from "@/lib/supabase/server";

export default async function CheckerArrivalShipmentPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;
  const supabase = await createClient();

  let result: Awaited<ReturnType<typeof getShipmentForChecker>>;
  try {
    result = await getShipmentForChecker(supabase, shipmentId);
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(e, "Gagal memuat shipment");
    return (
      <div className="ds-page-operational">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink
          className="mt-3 inline-block"
          fallbackHref="/checker/arrival"
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
          fallbackHref="/checker/arrival"
        />
      </div>
    );
  }

  const { shipment, boxes, discrepancies } = result.data;

  const arrivedCount = boxes.filter((box) => box.status === "arrived").length;
  const pendingCount = boxes.filter((box) => box.status === "pending").length;
  const acceptedCount = boxes.filter((box) => box.status === "accepted").length;
  const rejectedCount = boxes.filter((box) => box.status === "rejected").length;

  const isScanStage = shipment.status === "in_transit";
  const isArrivedStage = shipment.status === "arrived";
  const isDone = shipment.status === "done";
  const isIssue = shipment.status === "issue";
  const showQc = !isScanStage;

  const boxCodeById = Object.fromEntries(
    boxes.map((box) => [box.id, box.box_code]),
  );
  const evidenceUrlByDiscrepancyId = await getDiscrepancyEvidenceUrlMap(
    supabase,
    discrepancies,
  );

  const pageTitle = isScanStage
    ? "Scan kedatangan"
    : isDone
      ? "Shipment selesai"
      : isIssue
        ? "QC selesai — ada yang bermasalah"
        : isArrivedStage
          ? "Scan selesai — menunggu QC"
          : "Lanjutan QC";

  const pageLead = isScanStage ? (
    <p>Verifikasi kedatangan fisik — scan box di bawah, lalu finalisasi tahap saat siap.</p>
  ) : isDone ? (
    <p className="ds-alert ds-alert-success border-0" role="status">
      Scan, rekonsiliasi, dan QC sudah selesai tanpa selisih tertunda.
    </p>
  ) : isIssue ? (
    <p className="ds-alert ds-alert-error" role="status">
      QC selesai. Ada selisih yang perlu ditinjau Supervisor.
    </p>
  ) : isArrivedStage ? (
    <p>Rekonsiliasi selesai — lanjut QC pada daftar box.</p>
  ) : (
    <p className="ds-alert ds-alert-warn" role="status">
      Masih ada box yang menunggu QC. Selesaikan QC untuk box tersisa di bawah.
    </p>
  );

  const counts = {
    pending: pendingCount,
    arrived: arrivedCount,
    accepted: acceptedCount,
    rejected: rejectedCount,
    total: boxes.length,
  };

  const boxSectionTitle =
    isScanStage
      ? "Box — isi shipment & status scan"
      : isDone
        ? "Box — hasil inspeksi"
        : isIssue
          ? "Box — hasil sebelum tindakan supervisor"
          : "Box — operasi QC";

  const boxSectionLead = showQc
    ? arrivedCount > 0
      ? "Baris disorot = menunggu keputusan QC. Aksi 'Mulai QC' tersedia per baris."
      : "Semua keputusan QC sudah tercatat. Tinjau baris untuk rujukan."
    : "Status scan per box. QC tersedia setelah scan diselesaikan (finalize).";

  const discSectionTitle = isIssue
    ? "Selisih & QC bermasalah (prioritas)"
    : "Rekonsiliasi & inspeksi";

  const discSectionLead = isIssue
    ? "Ringkasan selisih hasil rekonsiliasi vs QC bermasalah — untuk eskalasi supervisor."
    : isScanStage
      ? "Akan terisi setelah scan diselesaikan; gunakan untuk memverifikasi selisih."
      : "Bandingkan lapisan: rekonsiliasi (PO / kedatangan) vs inspeksi QC di lokasi.";

  const discSectionClass = isIssue
    ? "ds-section-tint border-red-200/60 shadow-md ring-1 ring-red-100/80 dark:ring-red-900/30"
    : isScanStage
      ? "ds-section-tint border-dashed border-[var(--border-default)]/90 bg-[var(--section-bg)]/80"
      : "ds-section-tint";

  const scanSection = isScanStage ? (
    <section
      className="relative overflow-hidden rounded-[var(--radius-lg)] border-2 border-[var(--border-default)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]"
      style={{
        borderColor: "color-mix(in srgb, var(--navy) 28%, var(--border-default))",
      }}
      aria-labelledby="scan-heading"
    >
      <div
        className="absolute right-0 top-0 h-10 w-32 rounded-bl-[var(--radius-md)] bg-gradient-to-br from-amber-200/40 to-transparent dark:from-amber-400/15"
        aria-hidden
      />
      <div className="relative p-4 sm:p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="scan-heading" className="ds-h1 text-lg sm:text-xl">
            Scan box
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Area kerja lantai — kamera atau input manual untuk kode box.
        </p>
        <div className="mt-4">
          <ArrivalScanForm shipmentId={shipment.id} />
        </div>
      </div>
    </section>
  ) : null;

  const boxSection = (
    <section
      className={
        showQc && arrivedCount > 0
          ? "ds-section relative"
          : "ds-section"
      }
      aria-labelledby="boxes-heading"
    >
      <div
        className={
          showQc && arrivedCount > 0
            ? "rounded-[var(--radius-lg)] border border-amber-200/70 bg-amber-50/25 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-5"
            : "flex flex-col gap-3"
        }
      >
        <div className={showQc && arrivedCount > 0 ? "min-w-0" : "flex flex-col gap-1"}>
          {showQc && arrivedCount > 0 ? (
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-amber-900 dark:text-amber-100">
              Fokus operasional
            </p>
          ) : null}
          <h2 id="boxes-heading" className="ds-h2 text-[1.05rem] sm:text-base">
            {boxSectionTitle}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">{boxSectionLead}</p>
        </div>
        <ArrivalBoxList
          shipmentId={shipment.id}
          boxes={boxes}
          showQc={showQc}
        />
      </div>
    </section>
  );

  const discBlockInner = (
    <ShipmentDiscrepancyList
      discrepancies={discrepancies}
      boxCodeById={boxCodeById}
      evidenceUrlByDiscrepancyId={evidenceUrlByDiscrepancyId}
    />
  );

  const discSection = (
    <section
      className={`${discSectionClass} flex flex-col gap-3`}
      aria-labelledby="disc-heading"
    >
      <h2 id="disc-heading" className="ds-h2 text-[1.05rem] sm:text-base">
        {discSectionTitle}
      </h2>
      <p className="text-sm text-[var(--text-secondary)]">{discSectionLead}</p>
      {discBlockInner}
    </section>
  );

  const finalizeScanSection = isScanStage ? (
    <div
      className="ds-card-pad border-t border-[var(--border-default)]"
      aria-label="Selesaikan scan (finalize)"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Selesaikan scan (finalize)
      </p>
      <FinalizeScanButton
        shipmentId={shipment.id}
        shipmentCode={shipment.shipment_code}
        pendingCount={pendingCount}
        totalCount={boxes.length}
      />
    </div>
  ) : null;

  const combinedShipmentControlCard = (
    <section
      className="ds-card"
      aria-label="Identitas shipment dan tahap operasional checker"
    >
      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2">
        <div className="ds-card-pad min-w-0 border-b border-[var(--border-default)] lg:border-b-0 lg:border-r lg:border-[var(--border-default)]">
          <CheckerShipmentSummaryCard
            variant="embedded"
            shipmentCode={shipment.shipment_code}
            status={shipment.status}
            poReference={shipment.po_reference}
            createdAt={shipment.created_at}
          />
        </div>
        <div
          className="ds-card-pad min-w-0 border-b border-[var(--border-default)] lg:border-b-0"
          aria-label="Tahap operasional dan ringkasan box"
        >
          <h2 className="ds-h2">Tahap operasional &amp; QC</h2>
          <div className="mt-3">
            <CheckerArrivalProgressBlock
              status={shipment.status}
              counts={counts}
              showSystemStatusCode={false}
            />
          </div>
        </div>
      </div>
      {finalizeScanSection}
    </section>
  );

  return (
    <div className="ds-page-operational">
      <div className="reveal-children">
        <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
          <div className="min-w-0 border-b border-[var(--border-default)] pb-6">
            <SmartBackLink className="text-sm" fallbackHref="/checker/arrival" />
            <CheckerArrivalPageHeading
              className="mt-2"
              showBottomBorder={false}
              pageTitle={pageTitle}
              pageLead={pageLead}
            />
          </div>

          {combinedShipmentControlCard}

          {isIssue ? (
            <>
              {discSection}
              {boxSection}
            </>
          ) : (
            <>
              {scanSection}
              {boxSection}
              {discSection}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
