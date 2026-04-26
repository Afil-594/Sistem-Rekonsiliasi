import type { ReactNode } from "react";
import type { Discrepancy } from "@/types/discrepancy";
import {
  DISCREPANCY_LAYER_LABELS,
  DISCREPANCY_STATUS_LABELS,
  DISCREPANCY_TYPE_LABELS,
} from "@/types/discrepancy";

type Props = {
  discrepancies: Discrepancy[];
  boxCodeById: Record<string, string>;
  evidenceUrlByDiscrepancyId: Record<string, string | null>;
};

function LayerBadge({ layer }: { layer: Discrepancy["discrepancy_layer"] }) {
  if (!layer) {
    return <span className="text-[var(--text-muted)]">—</span>;
  }
  return (
    <span className="ds-badge ds-badge-layer">{DISCREPANCY_LAYER_LABELS[layer]}</span>
  );
}

function statusBadgeClass(status: Discrepancy["status"]): string {
  if (status === "open") {
    return "ds-badge-warn";
  }
  if (status === "reviewed") {
    return "ds-badge-info";
  }
  if (status === "resolved") {
    return "ds-badge-success";
  }
  return "ds-badge-neutral";
}

function isQcLayer(layer: Discrepancy["discrepancy_layer"]) {
  return layer === "qc";
}

type CardProps = {
  discrepancy: Discrepancy;
  boxCodeById: Record<string, string>;
  evidenceUrl: string | null | undefined;
  variant: "reconciliation" | "qc";
};

function DiscrepancyRowCard({
  discrepancy,
  boxCodeById,
  evidenceUrl,
  variant,
}: CardProps) {
  const isQc = variant === "qc";
  const borderClass = isQc
    ? "border-l-rose-500"
    : "border-l-slate-600 dark:border-l-slate-400";

  return (
    <article
      className={`ds-card ds-card-pad border border-[var(--border-default)] border-l-4 ${borderClass} bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-shadow duration-150 hover:shadow-md`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
        <LayerBadge layer={discrepancy.discrepancy_layer} />
        <span className={`ds-badge ${statusBadgeClass(discrepancy.status)}`}>
          {DISCREPANCY_STATUS_LABELS[discrepancy.status]}
        </span>
        <span className="rounded border border-[var(--border-default)] bg-[var(--section-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--text-primary)]">
          {DISCREPANCY_TYPE_LABELS[discrepancy.discrepancy_type]}
        </span>
        {isQc ? (
          <span className="ml-auto text-[0.65rem] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-200">
            Inspeksi QC
          </span>
        ) : (
          <span className="ml-auto text-[0.65rem] font-bold uppercase tracking-wider text-[var(--navy)]">
            Rekonsiliasi
          </span>
        )}
      </div>
      <p className="mt-2.5 text-sm font-medium leading-relaxed text-[var(--text-primary)]">
        {discrepancy.description}
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-x-6">
        <div className="min-w-0">
          <dt className="text-xs font-medium text-[var(--text-muted)]">Referensi box</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-[var(--text-primary)]">
            {discrepancy.box_id
              ? (boxCodeById[discrepancy.box_id] ?? discrepancy.box_id)
              : "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium text-[var(--text-muted)]">Qty aktual</dt>
          <dd className="mt-0.5 tabular-nums text-sm font-semibold text-[var(--text-primary)]">
            {discrepancy.actual_qty ?? "—"}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-default)] pt-3">
        {discrepancy.evidence_path ? (
          evidenceUrl ? (
            <a
              href={evidenceUrl}
              target="_blank"
              rel="noreferrer"
              className="ds-link text-sm font-medium"
            >
              Buka bukti (gambar)
            </a>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">Bukti terunggah</span>
          )
        ) : (
          <span className="text-sm text-[var(--text-muted)]">Tanpa bukti</span>
        )}
      </div>
    </article>
  );
}

function GroupBlock({
  title,
  lead,
  tone,
  children,
}: {
  title: string;
  lead: string;
  tone: "navy" | "rose";
  children: ReactNode;
}) {
  const bar =
    tone === "navy"
      ? "from-[var(--navy)] to-slate-400"
      : "from-rose-500 to-amber-400";
  return (
    <div className="min-w-0">
      <div
        className={`mb-2 flex items-center gap-2 border-b border-[var(--border-default)] pb-2`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r ${bar}`}
          aria-hidden
        />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        {lead}
      </p>
      {children}
    </div>
  );
}

export function ShipmentDiscrepancyList({
  discrepancies,
  boxCodeById,
  evidenceUrlByDiscrepancyId,
}: Props) {
  if (discrepancies.length === 0) {
    return (
      <div className="ds-empty">
        Belum ada selisih yang tercatat — rekonsiliasi belum menemukan
        perbedaan, atau data belum tersinkron.
      </div>
    );
  }

  const reconciliation = discrepancies.filter((d) => !isQcLayer(d.discrepancy_layer));
  const qcOnly = discrepancies.filter((d) => isQcLayer(d.discrepancy_layer));

  const renderList = (items: Discrepancy[], variant: "reconciliation" | "qc") => (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {items.map((discrepancy) => {
        const evidenceUrl = evidenceUrlByDiscrepancyId[discrepancy.id];
        return (
          <li key={discrepancy.id}>
            <DiscrepancyRowCard
              discrepancy={discrepancy}
              boxCodeById={boxCodeById}
              evidenceUrl={evidenceUrl}
              variant={variant}
            />
          </li>
        );
      })}
    </ul>
  );

  if (reconciliation.length > 0 && qcOnly.length > 0) {
    return (
      <div className="flex flex-col gap-8" aria-label="Daftar selisih terkelompok">
        <GroupBlock
          title="Dari rekonsiliasi (PO, kedatangan, scan)"
          lead="Perbedaan kuantitas atau administrasi sebelum / pada saat penerimaan & rekonsiliasi — bukan hasil genggam inspeksi QC di lokasi."
          tone="navy"
        >
          {renderList(reconciliation, "reconciliation")}
        </GroupBlock>
        <GroupBlock
          title="Dari inspeksi QC lokasi"
          lead="Kondisi bermasalah pada saat pengecekan fisik / isi terhadap box yang tiba; biasanya memerlukan bukti di lapangan."
          tone="rose"
        >
          {renderList(qcOnly, "qc")}
        </GroupBlock>
      </div>
    );
  }

  if (reconciliation.length > 0) {
    return (
      <div className="flex flex-col gap-3" aria-label="Daftar selisih">
        <GroupBlock
          title="Dari rekonsiliasi (PO, kedatangan, scan)"
          lead="Rekonsiliasi shipment — sumber lapisan tercatat di badge tiap entri."
          tone="navy"
        >
          {renderList(reconciliation, "reconciliation")}
        </GroupBlock>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" aria-label="Daftar QC bermasalah">
      <GroupBlock
        title="Dari inspeksi QC lokasi"
        lead="Semua entri berasal dari proses inspeksi QC; bandingkan dengan kode & qty pada box terkait."
        tone="rose"
      >
        {renderList(qcOnly, "qc")}
      </GroupBlock>
    </div>
  );
}
