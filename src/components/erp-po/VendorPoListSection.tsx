import Link from "next/link";
import { Calendar, ChevronRight, FileText, Inbox } from "lucide-react";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { createClient } from "@/lib/supabase/server";
import { listPurchaseOrdersByVendor } from "@/lib/services/erp-po";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";
import type { ErpPoHeader } from "@/types/erp-po";

function formatWhenShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PoList({
  rows,
  listContext,
  hadRowsBeforeFilter,
  poQueryActive,
}: {
  rows: ErpPoHeader[];
  listContext: "vendor" | "lookup";
  hadRowsBeforeFilter: boolean;
  poQueryActive: boolean;
}) {
  if (rows.length === 0) {
    if (poQueryActive && hadRowsBeforeFilter) {
      return (
        <div className="ds-empty px-4 py-10" role="status">
          <div className="mb-3 flex justify-center" aria-hidden>
            <Inbox className="h-10 w-10 text-[var(--navy)]/35" strokeWidth={1.25} />
          </div>
          <p className="ds-empty-title">Tidak ada PO yang cocok</p>
          <p className="ds-empty-hint max-w-sm mx-auto">
            Ubah kata kunci nomor PO atau kosongkan pencarian untuk melihat semua PO
            vendor Anda.
          </p>
        </div>
      );
    }
    return (
      <div className="ds-empty px-4 py-10" role="status">
        <div className="mb-3 flex justify-center" aria-hidden>
          <Inbox className="h-10 w-10 text-[var(--navy)]/35" strokeWidth={1.25} />
        </div>
        <p className="ds-empty-title">
          {listContext === "vendor"
            ? "Belum ada PO untuk vendor Anda"
            : "Tidak ada PO untuk kode vendor ini"}
        </p>
        <p className="ds-empty-hint max-w-sm mx-auto">
          {listContext === "vendor"
            ? "Jika seharusnya sudah ada data, pastikan sinkronisasi ERP berjalan atau hubungi tim terkait."
            : "Periksa ejaan vendor code, atau pastikan data PO sudah tersinkron. Muat ulang jika kode diperbarui."}
        </p>
      </div>
    );
  }
  return (
    <ul className="ds-card-grid m-0 list-none p-0" aria-label="Daftar purchase order">
      {rows.map((row) => (
        <li key={row.po_number} className="min-w-0">
          <Link
            className="ds-entity-tile group flex h-full flex-col border-l-[3px] border-l-[var(--epson-yellow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)]"
            href={`/vendor/purchase-orders/${encodeURIComponent(row.po_number)}`}
          >
            <div className="flex gap-3">
              <div
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--section-bg)] text-[var(--navy)]"
                aria-hidden
              >
                <FileText className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="m-0">
                      <span className="ds-inline-code break-all text-sm font-semibold leading-tight sm:text-base">
                        {row.po_number}
                      </span>
                    </h3>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] text-[var(--text-secondary)] sm:text-xs">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
                      <span>
                        Dibuat <time dateTime={row.created_at}>{formatWhenShort(row.created_at)}</time>
                      </span>
                    </p>
                  </div>
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-md border border-[var(--border-default)] bg-[var(--surface)] px-2 py-1 text-[0.65rem] font-semibold text-[var(--navy)] shadow-sm transition-colors group-hover:border-[color-mix(in_srgb,var(--navy)_18%,var(--border-default))] group-hover:bg-[var(--navy-muted)]/40 sm:text-xs">
                    Detail
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="ds-count-chip min-w-0 text-[0.7rem] sm:text-xs" title="Kode vendor (ERP)">
                    Vendor {row.vendor_code}
                  </span>
                </div>
                <p className="mb-0 mt-2.5 text-[0.65rem] leading-snug text-[var(--text-muted)] sm:text-xs">
                  Buka untuk baris item dan draft shipment (jika belum selesai).
                </p>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type Props = {
  vendorCode: string;
  /** When set, filters loaded rows by substring match on `po_number` (case-insensitive). */
  poQuery?: string;
  listContext: "vendor" | "lookup";
};

export async function VendorPoListSection({
  vendorCode,
  poQuery = "",
  listContext,
}: Props) {
  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof listPurchaseOrdersByVendor>>;
  try {
    result = await listPurchaseOrdersByVendor(supabase, vendorCode);
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(e, "Gagal memuat daftar PO");
    return <LoadErrorState message={message} detailHint={detailHint} />;
  }
  if (!result.ok) {
    const { message, detailHint } = userFacingErrorText(result.message);
    return <LoadErrorState message={message} detailHint={detailHint} />;
  }
  const q = poQuery.trim();
  const poQueryActive = q.length > 0;
  const allRows = result.data;
  const rows = poQueryActive
    ? allRows.filter((r) => r.po_number.toLowerCase().includes(q.toLowerCase()))
    : allRows;
  return (
    <PoList
      rows={rows}
      listContext={listContext}
      hadRowsBeforeFilter={allRows.length > 0}
      poQueryActive={poQueryActive}
    />
  );
}
