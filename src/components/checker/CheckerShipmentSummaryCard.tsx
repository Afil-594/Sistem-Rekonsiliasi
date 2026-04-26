import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";

function formatWhen(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? iso : value.toLocaleString();
}

type FieldProps = {
  shipmentCode: string;
  status: string | null;
  poReference: string | null;
  createdAt: string | null;
};

type Props = FieldProps & {
  /** Extra block under the summary (e.g. finalize CTA only in scan stage) — hanya `standalone`. */
  footer?: ReactNode;
  className?: string;
  /**
   * `embedded` = tanpa card luar (untuk setengah dari card lebar 2 kolom).
   * `standalone` = card penuh (blok tunggal).
   */
  variant?: "standalone" | "embedded";
};

function ShipmentFieldList({
  shipmentCode,
  status,
  poReference,
  createdAt,
  dlClassName,
}: FieldProps & { dlClassName: string }) {
  return (
    <dl className={dlClassName}>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Kode shipment
        </dt>
        <dd className="mt-0.5 font-mono font-semibold text-[var(--text-primary)]">
          {shipmentCode}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Status
        </dt>
        <dd className="mt-0.5 flex items-center gap-2">
          {status ? <StatusBadge status={status} /> : "—"}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Referensi PO
        </dt>
        <dd className="mt-0.5 font-medium text-[var(--text-primary)]">
          {poReference ?? "—"}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Dikonfirmasi
        </dt>
        <dd className="mt-0.5 text-[var(--text-primary)]">
          {formatWhen(createdAt)}
        </dd>
      </div>
    </dl>
  );
}

/**
 * Blok identitas + referensi ringkas untuk detail kedatangan checker.
 */
export function CheckerShipmentSummaryCard({
  shipmentCode,
  status,
  poReference,
  createdAt,
  footer,
  className,
  variant = "standalone",
}: Props) {
  const isEmbedded = variant === "embedded";

  const titleBlock = (
    <div>
      <h2 className="ds-h2">Shipment</h2>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        Referensi operasional — segarkan halaman jika data berubah di perangkat lain.
      </p>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="min-w-0" aria-label="Ringkasan shipment">
        {titleBlock}
        <ShipmentFieldList
          shipmentCode={shipmentCode}
          status={status}
          poReference={poReference}
          createdAt={createdAt}
          dlClassName="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2"
        />
      </div>
    );
  }

  return (
    <section
      className={["ds-card overflow-hidden", className ?? ""].filter(Boolean).join(" ")}
      aria-label="Ringkasan shipment"
    >
      <div className="ds-card-header">{titleBlock}</div>
      <ShipmentFieldList
        shipmentCode={shipmentCode}
        status={status}
        poReference={poReference}
        createdAt={createdAt}
        dlClassName="ds-card-pad grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-1"
      />
      {footer ? (
        <div className="border-t border-[var(--border-default)] px-4 py-4 sm:px-5 sm:py-5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
