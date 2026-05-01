import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { createClient } from "@/lib/supabase/server";
import { CheckerArrivalList } from "@/components/checker/CheckerArrivalList";
import { listCheckerShipments } from "@/lib/services/checker";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";
import { Info, Lightbulb } from "lucide-react";

function ArrivalFlowStepper() {
  const stepperCss = `
@keyframes arrival-lineFill1 {
  0% { transform: scaleX(0); }
  33.3333% { transform: scaleX(1); }
  99.999% { transform: scaleX(1); }
  100% { transform: scaleX(0); }
}
@keyframes arrival-lineFill2 {
  0%, 33.3333% { transform: scaleX(0); }
  66.6666% { transform: scaleX(1); }
  99.999% { transform: scaleX(1); }
  100% { transform: scaleX(0); }
}
@keyframes arrival-dot1 {
  0%, 32.999% {
    background: #185fa5;
    color: #fff;
    box-shadow: 0 0 0 0 rgba(24, 95, 165, 0.42);
  }
  4%, 12%, 20%, 28% {
    background: #185fa5;
    color: #fff;
    box-shadow: 0 0 0 7px rgba(24, 95, 165, 0);
  }
  8%, 16%, 24%, 32% {
    background: #185fa5;
    color: #fff;
    box-shadow: 0 0 0 0 rgba(24, 95, 165, 0.42);
  }
  33.3333%, 100% {
    background: #d3d1c7;
    color: #787774;
    box-shadow: none;
  }
}
@keyframes arrival-dot2 {
  0%, 33.3333% {
    background: #d3d1c7;
    color: #787774;
    box-shadow: none;
  }
  34%, 65.5% {
    background: #185fa5;
    color: #fff;
    box-shadow: 0 0 0 0 rgba(24, 95, 165, 0.42);
  }
  37%, 45%, 53%, 61% {
    background: #185fa5;
    color: #fff;
    box-shadow: 0 0 0 7px rgba(24, 95, 165, 0);
  }
  41%, 49%, 57%, 65% {
    background: #185fa5;
    color: #fff;
    box-shadow: 0 0 0 0 rgba(24, 95, 165, 0.42);
  }
  66.6666%, 100% {
    background: #d3d1c7;
    color: #787774;
    box-shadow: none;
  }
}
@keyframes arrival-dot3 {
  0%, 66.6666% {
    background: #d3d1c7;
    color: #787774;
    box-shadow: none;
  }
  67%, 99.5% {
    background: #185fa5;
    color: #fff;
    box-shadow: 0 0 0 0 rgba(24, 95, 165, 0.42);
  }
  71%, 79%, 87%, 94% {
    background: #185fa5;
    color: #fff;
    box-shadow: 0 0 0 7px rgba(24, 95, 165, 0);
  }
  75%, 83%, 91%, 98% {
    background: #185fa5;
    color: #fff;
    box-shadow: 0 0 0 0 rgba(24, 95, 165, 0.42);
  }
  100% {
    background: #d3d1c7;
    color: #787774;
    box-shadow: none;
  }
}
@keyframes arrival-title1 {
  0%, 33.332% { color: var(--color-text-primary); font-weight: 600; }
  33.3333%, 100% { color: var(--color-text-secondary); font-weight: 500; }
}
@keyframes arrival-title2 {
  0%, 33.3333% { color: var(--color-text-secondary); font-weight: 500; }
  33.334%, 66.665% { color: var(--color-text-primary); font-weight: 600; }
  66.6666%, 100% { color: var(--color-text-secondary); font-weight: 500; }
}
@keyframes arrival-title3 {
  0%, 66.6666% { color: var(--color-text-secondary); font-weight: 500; }
  66.667%, 99.998% { color: var(--color-text-primary); font-weight: 600; }
  100% { color: var(--color-text-secondary); font-weight: 500; }
}
@keyframes arrival-sub1 {
  0%, 33.332% { opacity: 1; }
  33.3333%, 100% { opacity: 0.72; }
}
@keyframes arrival-sub2 {
  0%, 33.3333% { opacity: 0.72; }
  33.334%, 66.665% { opacity: 1; }
  66.6666%, 100% { opacity: 0.72; }
}
@keyframes arrival-sub3 {
  0%, 66.6666% { opacity: 0.72; }
  66.667%, 99.998% { opacity: 1; }
  100% { opacity: 0.72; }
}
.arrival-vstepper-card {
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
}
.arrival-vstepper__dot--1 {
  animation: arrival-dot1 9s linear infinite;
}
.arrival-vstepper__dot--2 {
  animation: arrival-dot2 9s linear infinite;
}
.arrival-vstepper__dot--3 {
  animation: arrival-dot3 9s linear infinite;
}
.arrival-vstepper__line-fill--1 {
  animation: arrival-lineFill1 9s linear infinite;
  transform-origin: left center;
}
.arrival-vstepper__line-fill--2 {
  animation: arrival-lineFill2 9s linear infinite;
  transform-origin: left center;
}
.arrival-vstepper__title--1 { animation: arrival-title1 9s linear infinite; }
.arrival-vstepper__title--2 { animation: arrival-title2 9s linear infinite; }
.arrival-vstepper__title--3 { animation: arrival-title3 9s linear infinite; }
.arrival-vstepper__sub--1 { animation: arrival-sub1 9s linear infinite; }
.arrival-vstepper__sub--2 { animation: arrival-sub2 9s linear infinite; }
.arrival-vstepper__sub--3 { animation: arrival-sub3 9s linear infinite; }
`;

  return (
    <div className="arrival-vstepper-card ds-card ds-card-pad border-[var(--border-default)] bg-[var(--surface)]">
      <style dangerouslySetInnerHTML={{ __html: stepperCss }} />
      <p className="m-0 mb-5 text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">
        Tiga tahap ini adalah alur kerja checker untuk tiap shipment — pilih
        shipment di bawah sesuai tahapnya.
      </p>
      <nav aria-label="Alur verifikasi inbound">
        <div className="flex w-full min-w-0 flex-col gap-4">
          <div
            className="grid w-full grid-cols-[auto_minmax(1.25rem,1fr)_auto_minmax(1.25rem,1fr)_auto] items-center gap-x-2 sm:gap-x-3"
            aria-hidden
          >
            <div className="flex justify-self-center">
              <span className="arrival-vstepper__dot arrival-vstepper__dot--1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold">
                1
              </span>
            </div>
            <div className="arrival-vstepper__line-track relative h-0.5 min-h-px w-full rounded-full">
              <span
                className="arrival-vstepper__line-bg absolute inset-0 rounded-full bg-[#d3d1c7]"
                aria-hidden
              />
              <span
                className="arrival-vstepper__line-fill arrival-vstepper__line-fill--1 absolute inset-0 z-[1] rounded-full bg-[#185fa5]"
                aria-hidden
              />
            </div>
            <div className="flex justify-self-center">
              <span className="arrival-vstepper__dot arrival-vstepper__dot--2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold">
                2
              </span>
            </div>
            <div className="arrival-vstepper__line-track relative h-0.5 min-h-px w-full rounded-full">
              <span
                className="arrival-vstepper__line-bg absolute inset-0 rounded-full bg-[#d3d1c7]"
                aria-hidden
              />
              <span
                className="arrival-vstepper__line-fill arrival-vstepper__line-fill--2 absolute inset-0 z-[1] rounded-full bg-[#185fa5]"
                aria-hidden
              />
            </div>
            <div className="flex justify-self-center">
              <span className="arrival-vstepper__dot arrival-vstepper__dot--3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold">
                3
              </span>
            </div>
          </div>
          <div className="grid w-full grid-cols-[auto_minmax(1.25rem,1fr)_auto_minmax(1.25rem,1fr)_auto] items-start gap-x-2 text-center sm:gap-x-3">
            <div className="col-start-1 min-w-0 justify-self-center px-0.5">
              <p className="arrival-vstepper__title arrival-vstepper__title--1 m-0 max-w-[9rem] text-xs font-medium sm:max-w-none sm:text-sm">
                Scan Box
              </p>
              <p className="arrival-vstepper__sub arrival-vstepper__sub--1 m-0 mt-1 max-w-[9rem] text-[0.65rem] leading-snug text-[var(--text-secondary)] sm:max-w-none sm:text-xs">
                Scan box yang tiba
              </p>
            </div>
            <div className="col-start-3 min-w-0 justify-self-center px-0.5">
              <p className="arrival-vstepper__title arrival-vstepper__title--2 m-0 max-w-[9rem] text-xs font-medium sm:max-w-none sm:text-sm">
                QC
              </p>
              <p className="arrival-vstepper__sub arrival-vstepper__sub--2 m-0 mt-1 max-w-[9rem] text-[0.65rem] leading-snug text-[var(--text-secondary)] sm:max-w-none sm:text-xs">
                Periksa & cocokkan item
              </p>
            </div>
            <div className="col-start-5 min-w-0 justify-self-center px-0.5">
              <p className="arrival-vstepper__title arrival-vstepper__title--3 m-0 max-w-[9rem] text-xs font-medium sm:max-w-none sm:text-sm">
                Selesai
              </p>
              <p className="arrival-vstepper__sub arrival-vstepper__sub--3 m-0 mt-1 max-w-[9rem] text-[0.65rem] leading-snug text-[var(--text-secondary)] sm:max-w-none sm:text-xs">
                QC selesai
              </p>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

function InboundInfoBanner() {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--info)_35%,transparent)] bg-[color-mix(in_srgb,var(--info)_12%,#ffffff)] px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 pr-0 sm:flex-row sm:items-center sm:gap-6 sm:pr-36">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--info)_22%,#ffffff)] text-[var(--info)]"
          aria-hidden
        >
          <Info className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <p className="m-0 flex-1 text-sm leading-relaxed text-[var(--text-primary)] sm:text-[0.9375rem]">
          Shipment di bawah ini siap diproses. Silakan lakukan scan atau lanjutkan
          QC.
        </p>
      </div>
      <div
        className="pointer-events-none absolute bottom-1 right-2 hidden h-24 w-28 sm:block"
        aria-hidden
      >
        <svg viewBox="0 0 120 100" className="h-full w-full drop-shadow-md" fill="none">
          <path
            d="M12 38 L60 18 L108 38 L108 78 L60 96 L12 78 Z"
            fill="color-mix(in srgb, var(--info) 18%, #fff)"
            stroke="var(--info)"
            strokeWidth="1.5"
          />
          <path
            d="M12 38 L60 56 L108 38"
            stroke="var(--info)"
            strokeWidth="1.25"
            opacity="0.7"
          />
          <rect x="44" y="48" width="32" height="28" rx="3" fill="#fff" stroke="var(--info)" strokeWidth="1.2" />
          <path d="M52 52 h16 M52 58 h12" stroke="var(--info)" strokeWidth="1" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}

function ArrivalFooterTip() {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-amber-200/80 bg-[color-mix(in_srgb,#fef3c7_65%,#ffffff)] px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5 sm:py-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200/90 text-amber-800"
        aria-hidden
      >
        <Lightbulb className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold text-[var(--navy)]">
          Tidak menemukan shipment?
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-secondary)]">
          Pastikan shipment sudah dikonfirmasi dan tiba di lokasi.
        </p>
      </div>
      <form action="/checker/arrival" method="get" className="shrink-0">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-amber-500 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50 sm:w-auto"
        >
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          Refresh Data
        </button>
      </form>
    </div>
  );
}

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
      <header className="space-y-1 pb-2">
        <p className="ds-section-label mb-0">Checker · Inbound</p>
        <h1 className="ds-h1 text-[var(--navy)]">Verifikasi inbound</h1>
        <p className="ds-lead mt-1 max-w-3xl">
          Pilih shipment untuk scan box, rekonsiliasi, atau lanjutkan QC pada box
          yang sudah tiba.
        </p>
      </header>

      <ArrivalFlowStepper />
      <InboundInfoBanner />

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

      <ArrivalFooterTip />
    </div>
  );
}
