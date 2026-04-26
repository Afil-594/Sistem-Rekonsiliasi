import Link from "next/link";
import type { ErpPoDetail } from "@/types/erp-po";
import type { Shipment } from "@/types/shipment";
import { CreateShipmentDraftForm } from "@/components/shipments/CreateShipmentDraftForm";
import { DetailPageLayout } from "@/components/layout/DetailPageLayout";
import { SmartBackLink } from "@/components/navigation/SmartBackLink";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getVendorShipmentStatusLabel } from "@/lib/utils/vendor-shipment-visibility";

type Props = {
  detail: ErpPoDetail;
  existingShipment: Shipment | null;
};

function ShipmentStatusSection({ shipment }: { shipment: Shipment }) {
  const isPending = shipment.status === "pending";
  const shipmentHref = `/vendor/shipments/${encodeURIComponent(shipment.id)}`;
  const s = getVendorShipmentStatusLabel(shipment.status);

  return (
    <section
      aria-labelledby="shipment-status-heading"
      className="ds-section-card overflow-hidden"
    >
      <div className="ds-section-card__header">
        <h2 id="shipment-status-heading" className="ds-h2">
          {isPending ? "Draft shipment berjalan" : "Shipment sudah dibuat"}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {isPending
            ? "PO ini sudah punya draft shipment. Lanjutkan packing plan."
            : "Satu PO hanya satu shipment. Buka halaman shipment untuk progres, box, dan tindak lanjut bermasalah."}
        </p>
      </div>
      <div className="ds-section-card__body gap-4">
        <div className="ds-summary-strip flex-col items-stretch sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Kode shipment
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--text-primary)]">
              {shipment.shipment_code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">Status</span>
            {shipment.status ? (
              <StatusBadge status={shipment.status} label={s.shortLabel} />
            ) : (
              <span className="ds-muted">—</span>
            )}
          </div>
        </div>
        <p className="m-0 text-sm text-[var(--text-secondary)]">{s.description}</p>
        <div className="border-t border-[var(--border-default)] pt-1">
          <Link href={shipmentHref} className="ds-btn ds-btn-primary w-full sm:w-auto">
            {isPending ? "Lanjutkan draft" : "Lihat shipment & progres"}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function VendorPoDetailView({
  detail,
  existingShipment,
}: Props) {
  const { header, items } = detail;
  const created = new Date(header.created_at);
  const createdLabel = Number.isNaN(created.getTime())
    ? header.created_at
    : created.toLocaleString();

  const listBack = "/vendor/purchase-orders";

  return (
    <div className="ds-page-operational">
      <DetailPageLayout
        sideBeforeMainOnNarrow
        intro={
          <SmartBackLink variant="nav" fallbackHref={listBack} />
        }
        main={
          <>
            {existingShipment ? (
              <ShipmentStatusSection shipment={existingShipment} />
            ) : (
              <CreateShipmentDraftForm poNumber={header.po_number} />
            )}

            <section aria-labelledby="line-items-heading" className="flex flex-col gap-2">
              <h2 id="line-items-heading" className="ds-h2">
                Detail PO
              </h2>
              <p className="ds-muted m-0 text-xs sm:text-sm">
                Referensi item. Detail packing dan box diatur di shipment.
              </p>
              <div className="ds-table-wrap">
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr className="ds-thead">
                      <th className="ds-tcell">Part</th>
                      <th className="ds-tcell">Deskripsi</th>
                      <th className="ds-tcell text-right">Qty</th>
                      <th className="ds-tcell">Satuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr className="ds-trow">
                        <td colSpan={4} className="ds-tcell text-[var(--text-muted)]">
                          Tidak ada Detail PO
                        </td>
                      </tr>
                    ) : (
                      items.map((row) => (
                        <tr className="ds-trow" key={row.id}>
                          <td className="ds-tcell ds-tcell--mono max-w-[10rem]">
                            {row.part_number}
                          </td>
                          <td className="ds-tcell max-w-md">{row.part_name}</td>
                          <td className="ds-tcell text-right tabular-nums text-[var(--text-primary)]">
                            {row.quantity_ordered}
                          </td>
                          <td className="ds-tcell text-[var(--text-secondary)]">
                            {row.unit ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        }
        aside={
          <div className="ds-card overflow-hidden">
            <div className="ds-card-header">
              <p className="ds-section-label">Purchase order</p>
              <h1 className="ds-h1 break-all sm:break-normal">
                <span className="ds-inline-code text-base font-semibold sm:text-2xl">
                  {header.po_number}
                </span>
              </h1>
            </div>
            <dl className="ds-card-pad grid grid-cols-1 gap-3.5 text-sm">
              <div>
                <dt className="text-xs font-medium text-[var(--text-muted)]">Vendor</dt>
                <dd className="mt-0.5 font-mono text-sm font-medium text-[var(--text-primary)]">
                  {header.vendor_code}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--text-muted)]">Dibuat</dt>
                <dd className="mt-0.5 text-sm text-[var(--text-primary)]">
                  {createdLabel}
                </dd>
              </div>
            </dl>
          </div>
        }
      />
    </div>
  );
}
