import { PrintAllLabelsButton } from "@/components/shipments/PrintAllLabelsButton";
import { SmartBackLink } from "@/components/navigation/SmartBackLink";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { createClient } from "@/lib/supabase/server";
import { getShipmentBoxLabelsForVendor } from "@/lib/services/shipment";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";
import { boxCodeToQrSvg } from "@/lib/utils/box-qr-svg";

export default async function ShipmentBoxLabelsPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;
  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof getShipmentBoxLabelsForVendor>>;

  try {
    result = await getShipmentBoxLabelsForVendor(supabase, shipmentId);
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(e, "Gagal memuat label");
    return (
      <div className="ds-page-operational print:p-0">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink
          className="mt-3 inline-block"
          fallbackHref={`/vendor/shipments/${shipmentId}`}
        />
      </div>
    );
  }

  if (!result.ok) {
    const { message, detailHint } = userFacingErrorText(result.message);
    return (
      <div className="ds-page-operational print:p-0">
        <LoadErrorState message={message} detailHint={detailHint} />
        <SmartBackLink
          className="mt-3 inline-block"
          fallbackHref={`/vendor/shipments/${shipmentId}`}
        />
      </div>
    );
  }

  const { shipment, boxes } = result.data;
  const labels = await Promise.all(
    boxes.map(async (box) => ({
      id: box.id,
      box_code: box.box_code,
      qrSvg: await boxCodeToQrSvg(box.box_code),
    })),
  );

  return (
    <div className="ds-page-operational print:max-w-none print:bg-white print:p-0">
      <div className="print:hidden mb-6">
        <div className="ds-card ds-card-pad">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <SmartBackLink fallbackHref={`/vendor/shipments/${shipment.id}`} />
              <h1 className="ds-h1 mt-2">Label box (QR)</h1>
              <p className="ds-lead mt-1">
                <span className="ds-inline-code">{shipment.shipment_code}</span>{" "}
                — satu halaman per box. QR hanya berisi kode box.
              </p>
            </div>
            <div className="shrink-0">
              <PrintAllLabelsButton />
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-[var(--text-muted)] sm:text-left">
          Di layar, area di bawah disiapkan agar rapi; saat print, gunakan
          potret/standar.
        </p>
      </div>

      {labels.length === 0 ? (
        <div className="ds-empty py-8 text-left print:hidden" role="status">
          <p className="ds-empty-title">Belum ada box</p>
          <p className="ds-empty-hint">
            Tambah box pada shipment terlebih dahulu — lalu kembali ke halaman ini untuk
            mencetak label QR.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col items-stretch print:block">
        {labels.map((row, index) => (
          <section
            key={row.id}
            aria-label={`Label for box ${row.box_code}`}
            className={`flex min-h-[72vh] flex-col items-center justify-center gap-6 py-10 print:min-h-0 print:gap-5 print:py-8 ${
              index < labels.length - 1 ? "print:break-after-page" : ""
            } ${
              index > 0
                ? "border-t border-[var(--border-default)] print:border-t-0"
                : ""
            }`}
          >
            <div
              className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-white p-6 shadow-[var(--shadow-sm)] print:rounded-none print:border-0 print:p-0 print:shadow-none [&_svg]:h-auto [&_svg]:max-w-[min(300px,85vw)] [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: row.qrSvg }}
            />
            <div className="w-full max-w-md text-center print:max-w-none">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] print:text-[10pt]">
                Kode box
              </p>
              <p className="mt-1 break-all font-mono text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl print:text-[18pt] print:leading-tight">
                {row.box_code}
              </p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
