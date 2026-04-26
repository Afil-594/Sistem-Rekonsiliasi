import { BoxListWithLimit } from "@/components/boxes/BoxListWithLimit";
import { BoxPackingForm } from "@/components/boxes/BoxPackingForm";
import { ConfirmShipmentButton } from "@/components/shipments/ConfirmShipmentButton";
import { VendorShipmentIdentityCard } from "@/components/shipments/VendorShipmentIdentityCard";
import { VendorShipmentProgressPanel } from "@/components/shipments/VendorShipmentProgressPanel";
import { SmartBackLink } from "@/components/navigation/SmartBackLink";
import type { ShipmentDetail } from "@/types/shipment";

type Props = {
  detail: ShipmentDetail;
};

export function ShipmentDetailView({ detail }: Props) {
  const { shipment, vendorDisplayName, poItems, boxes } = detail;
  const isPending = shipment.status === "pending";

  const packedQtyByPart = new Map<string, number>();
  for (const box of boxes) {
    packedQtyByPart.set(
      box.part_number,
      (packedQtyByPart.get(box.part_number) ?? 0) + box.qty_per_box,
    );
  }

  const packingRows = poItems.map((item) => {
    const packed = packedQtyByPart.get(item.part_number) ?? 0;
    const status: "match" | "short" | "over" | "unpacked" =
      packed === 0
        ? "unpacked"
        : packed === item.quantity_ordered
          ? "match"
          : packed < item.quantity_ordered
            ? "short"
            : "over";
    return {
      part_number: item.part_number,
      part_name: item.part_name,
      ordered: item.quantity_ordered,
      packed,
      status,
    };
  });

  const unpackedCount = packingRows.filter((r) => r.status === "unpacked").length;
  const mismatchCount = packingRows.filter(
    (r) => r.status === "short" || r.status === "over",
  ).length;
  const allPartsHaveBoxes =
    packingRows.length > 0 && unpackedCount === 0;
  const disabledReason = !allPartsHaveBoxes
    ? packingRows.length === 0
      ? "PO ini tidak memiliki part untuk di-pack."
      : `${unpackedCount} dari ${packingRows.length} part belum punya box.`
    : undefined;
  const warningMessage =
    allPartsHaveBoxes && mismatchCount > 0
      ? `${mismatchCount} part berbeda dengan qty PO — akan tercatat sebagai selisih.`
      : undefined;

  return (
    <div className="ds-page-operational">
      <div className="reveal-children">
        <div className="mb-2 min-w-0 border-b border-[var(--border-default)] pb-6 lg:mb-4">
          <SmartBackLink fallbackHref="/vendor/shipments" />
          <p className="ds-section-label mt-3">Vendor · shipment</p>
          <h1 className="ds-h1 mt-1">{isPending ? "Draft shipment" : "Shipment"}</h1>
          <p className="ds-lead">
            {isPending
              ? "Siapkan packing per part, pantau selisih terhadap PO, lalu konfirmasi ketika siap."
              : "Pantau progres penerimaan di lokasi — segarkan halaman untuk data terbaru."}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
          <section className="ds-card" aria-label="Detail dan progres shipment">
            <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2">
              <div className="ds-card-pad min-w-0 border-b border-[var(--border-default)] lg:border-b-0 lg:border-r lg:border-[var(--border-default)]">
                <VendorShipmentIdentityCard
                  variant="embedded"
                  shipment={shipment}
                  vendorDisplayName={vendorDisplayName}
                />
              </div>
              <div className="ds-card-pad min-w-0" aria-label="Progres dan ringkasan penerimaan">
                <VendorShipmentProgressPanel {...detail} />
              </div>
            </div>
          </section>

          <section
            aria-label="Packing dan daftar box"
            className="ds-section-tint flex flex-col gap-6"
          >
            <div>
              <h2 id="packing-heading" className="ds-h2">
                Tambah box
              </h2>
              {isPending ? (
                <div className="mt-3">
                  <BoxPackingForm
                    shipmentId={shipment.id}
                    poItems={poItems}
                    existingBoxes={boxes}
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Packing hanya bisa saat shipment masih berstatus draft (pending).
                </p>
              )}
            </div>

            <div className="border-t border-[var(--border-default)] pt-6">
              <h2 id="boxes-heading" className="ds-h2">
                Box dalam shipment
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Daftar kardus/label — status di bawah berasal dari proses di lokasi penerimaan.
              </p>
              <div className="mt-3">
                <BoxListWithLimit boxes={boxes} />
              </div>
            </div>
          </section>

          {isPending ? (
            <section
              aria-labelledby="confirm-heading"
              className="ds-section-tint flex flex-col gap-4"
            >
              <div>
                <h2 id="confirm-heading" className="ds-h2">
                  Konfirmasi shipment
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Membuat Snapshot PO + packing. Fitur packing akan nonaktif setelah konfirmasi.
                </p>
              </div>

              {packingRows.length > 0 ? (
                <>
                  <p
                    className="text-sm text-[var(--text-secondary)] flex flex-wrap items-center gap-x-2 gap-y-1.5"
                    role="status"
                  >
                    <span className="shrink-0">Ringkasan vs PO:</span>
                    <span className="text-xs text-[var(--text-muted)]">Sesuai</span>
                    <span className="ds-count-chip text-emerald-800">
                      {packingRows.filter((r) => r.status === "match").length}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">Belum</span>
                    <span className="ds-count-chip text-red-800">{unpackedCount}</span>
                    <span className="text-xs text-amber-800">Selisih qty</span>
                    <span className="ds-count-chip text-amber-900">
                      {mismatchCount} part
                    </span>
                  </p>
                  <div className="ds-table-wrap">
                    <table className="w-full min-w-[28rem] border-collapse text-sm">
                      <thead>
                        <tr className="ds-thead">
                          <th className="ds-tcell border-0 pl-3">Part</th>
                          <th className="ds-tcell border-0 text-right">Qty PO</th>
                          <th className="ds-tcell border-0 text-right">Ter-pack</th>
                          <th className="ds-tcell border-0 pr-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packingRows.map((row) => {
                          const statusLabel =
                            row.status === "match"
                              ? "Sesuai"
                              : row.status === "short"
                                ? `Kurang (−${row.ordered - row.packed})`
                                : row.status === "over"
                                  ? `Lebih (+${row.packed - row.ordered})`
                                  : "Belum ada box";
                          const statusColor =
                            row.status === "match"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : row.status === "unpacked"
                                ? "text-red-700 dark:text-red-400"
                                : "text-amber-700 dark:text-amber-300";
                          return (
                            <tr key={row.part_number} className="ds-trow">
                              <td className="ds-tcell pl-3 font-mono text-xs sm:text-sm">
                                {row.part_number}
                                <div className="text-xs text-slate-500">{row.part_name}</div>
                              </td>
                              <td className="ds-tcell text-right tabular-nums">{row.ordered}</td>
                              <td className="ds-tcell text-right tabular-nums">{row.packed}</td>
                              <td className={`ds-tcell pr-3 text-sm font-medium ${statusColor}`}>
                                {statusLabel}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}

              <ConfirmShipmentButton
                shipmentId={shipment.id}
                disabled={!allPartsHaveBoxes}
                disabledReason={disabledReason}
                warningMessage={warningMessage}
              />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
