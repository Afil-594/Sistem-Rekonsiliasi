import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Shipment } from "@/types/shipment";
import { getVendorShipmentStatusLabel } from "@/lib/utils/vendor-shipment-visibility";

function formatWhen(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? iso : value.toLocaleString();
}

type Props = {
  shipment: Shipment;
  /** Dari profil vendor (`full_name`, fallback `vendor_code`). */
  vendorDisplayName: string;
  /**
   * `embedded` = tanpa card luar (untuk digabung di card lebar lain).
   * `standalone` = card penuh seperti sebelumnya.
   */
  variant?: "standalone" | "embedded";
};

/**
 * Blok identitas ringkas untuk detail shipment vendor.
 */
export function VendorShipmentIdentityCard({
  shipment,
  vendorDisplayName,
  variant = "standalone",
}: Props) {
  const statusForVendor = getVendorShipmentStatusLabel(shipment.status);
  const isEmbedded = variant === "embedded";

  const titleBlock = (
    <div>
      <h2 className="ds-h2">Detail shipment</h2>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        Identitas dan referensi — tidak diperlukan tindakan jika hanya memantau.
      </p>
    </div>
  );

  const fieldList = (
    <dl
      className={[
        "grid grid-cols-1 gap-3.5 text-sm lg:grid-cols-1",
        isEmbedded ? "mt-4" : "ds-card-pad",
      ].join(" ")}
    >
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Kode shipment
          </dt>
          <dd className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100">
            {shipment.shipment_code}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Status
          </dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {statusForVendor.shortLabel}
            </span>
            {shipment.status ? <StatusBadge status={shipment.status} /> : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Referensi PO
          </dt>
          <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
            {shipment.po_reference ? (
              <Link
                className="ds-link font-medium"
                href={`/vendor/purchase-orders/${encodeURIComponent(shipment.po_reference)}`}
              >
                {shipment.po_reference}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Nama vendor
          </dt>
          <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
            {vendorDisplayName}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Dibuat
          </dt>
          <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
            {formatWhen(shipment.created_at)}
          </dd>
        </div>
      </dl>
  );

  if (isEmbedded) {
    return (
      <div className="min-w-0" aria-label="Identitas shipment">
        {titleBlock}
        {fieldList}
      </div>
    );
  }

  return (
    <section className="ds-card" aria-label="Identitas shipment">
      <div className="ds-card-header">{titleBlock}</div>
      {fieldList}
    </section>
  );
}
