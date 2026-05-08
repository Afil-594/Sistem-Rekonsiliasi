import Link from "next/link";
import {
  Calendar,
  FileText,
  Inbox,
  Package,
  Tag,
} from "lucide-react";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { createClient } from "@/lib/supabase/server";
import { listPoReferencesShippedByVendorId } from "@/lib/queries/shipments";
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

function poDetailPath(poNumber: string) {
  return `/vendor/purchase-orders/${encodeURIComponent(poNumber)}`;
}

const shipmentCtaBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--navy)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color-mix(in_srgb,var(--navy)_88%,#000000)]";

const metricIconWrap =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--info)_12%,#ffffff)] text-[var(--info)]";

function nextStepBlurbs(listContext: "vendor" | "lookup"): { title: string; body: string } {
  if (listContext === "vendor") {
    return {
      title: "Langkah selanjutnya",
      body: "",
    };
  }
  return {
    title: "Langkah selanjutnya",
    body: "Buka PO untuk melihat line item dan data referensi dari ERP.",
  };
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
  const blurbs = nextStepBlurbs(listContext);

  if (rows.length === 0) {
    if (poQueryActive && hadRowsBeforeFilter) {
      return (
        <div className="ds-empty px-4 py-10" role="status">
          <div className="mb-3 flex justify-center" aria-hidden>
            <Inbox className="h-10 w-10 text-[var(--navy)]/35" strokeWidth={1.25} />
          </div>
          <p className="ds-empty-title">Tidak ada PO yang cocok</p>
          <p className="ds-empty-hint max-w-sm mx-auto">
            Ubah kata kunci nomor PO atau kosongkan pencarian untuk melihat daftar PO Anda
            {listContext === "vendor"
              ? " yang belum punya shipment"
              : " untuk vendor ini"}.
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
            ? "Belum ada PO yang perlu diproses"
            : "Tidak ada PO untuk kode vendor ini"}
        </p>
        <p className="ds-empty-hint mx-auto mb-0 max-w-sm">
          {listContext === "vendor"
            ? "Kelola PO yang sudah diproses melalui halaman Shipment. Jika seharusnya ada PO yang belum diproses, hubungi tim terkait untuk sinkronisasi data."
            : "Periksa ejaan vendor code, atau pastikan data PO sudah tersinkron. Muat ulang jika kode diperbarui."}
        </p>
        {listContext === "vendor" ? (
          <p className="mt-5 mb-0 text-center text-xs text-[var(--text-secondary)] sm:text-sm">
            <Link href="/vendor/shipments" className="font-semibold text-[var(--info)] underline underline-offset-2 hover:text-[var(--navy)]">
              Ke halaman Shipments
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  const sectionHeading =
    listContext === "vendor" ? "PO siap dibuat shipment" : "Purchase order untuk vendor ini";

  return (
    <section aria-labelledby="vendor-po-list-heading">
      <h2
        id="vendor-po-list-heading"
        className="ds-h2 mb-3 text-base font-semibold text-[var(--navy)] sm:text-lg"
      >
        {sectionHeading}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-4 p-0" aria-label="Daftar purchase order">
        {rows.map((row) => (
          <li key={row.po_number} className="min-w-0">
            <article className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--shadow-sm)] border-l-4 border-l-[var(--epson-yellow)]">
              <div className="flex flex-col lg:flex-row">
                <div className="min-w-0 flex-1 p-4 sm:p-5">
                  <div className="flex gap-3 sm:items-center sm:gap-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--epson-yellow-muted)_85%,#ffffff)] text-amber-800"
                      aria-hidden
                    >
                      <FileText className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={poDetailPath(row.po_number)}
                        className="block break-all font-mono text-lg font-bold leading-tight tracking-tight text-[var(--navy)] underline-offset-2 hover:bg-[color-mix(in_srgb,var(--navy)_4%,#ffffff)] hover:underline sm:text-xl"
                      >
                        {row.po_number}
                      </Link>
                    </div>
                  </div>

                  <div
                    className="my-4 h-px w-full bg-[var(--border-default)]"
                    aria-hidden
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    <div className="flex gap-3">
                      <div className={metricIconWrap} aria-hidden>
                        <Tag className="h-4 w-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--text-muted)]">Kode vendor</p>
                        <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                          {row.vendor_code}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className={metricIconWrap} aria-hidden>
                        <Calendar className="h-4 w-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--text-muted)]">Dibuat</p>
                        <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                          <time dateTime={row.created_at}>
                            {formatWhenShort(row.created_at)}
                          </time>
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mb-0 mt-4 text-[0.7rem] leading-relaxed text-[var(--text-secondary)] sm:mt-5 sm:text-xs">
                  Konfirmasi shipment PO ini untuk melihat daftar part, kuantitas, dan menyiapkan shipment
                    {listContext === "vendor" ? " pertama untuk nomor ini" : ""}.
                  </p>
                </div>

                <aside className="flex flex-col justify-center border-t border-[var(--border-default)] bg-[color-mix(in_srgb,var(--navy)_2.5%,#ffffff)] p-4 sm:p-5 lg:w-[min(100%,19rem)] lg:border-l lg:border-t-0">
                  <p className="m-0 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    {blurbs.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {blurbs.body}
                  </p>
                  <div className="mt-4">
                    <Link href={poDetailPath(row.po_number)} className={shipmentCtaBtn}>
                      <Package className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                      Buat Shipment
                    </Link>
                  </div>
                </aside>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Props = {
  vendorCode: string;
  /** When set, filters loaded rows by substring match on `po_number` (case-insensitive). */
  poQuery?: string;
  listContext: "vendor" | "lookup";
  /**
   * Untuk akun vendor: user id (`profiles.id`). PO yang sudah punya shipment untuk user ini disembunyikan.
   */
  vendorProfileUserId?: string | null;
};

export async function VendorPoListSection({
  vendorCode,
  poQuery = "",
  listContext,
  vendorProfileUserId = null,
}: Props) {
  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof listPurchaseOrdersByVendor>>;
  let shippedPoRefs: Set<string> = new Set();

  try {
    const shouldHideShipped =
      listContext === "vendor" &&
      typeof vendorProfileUserId === "string" &&
      vendorProfileUserId.trim() !== "";

    const [poResult, shippedResult] = await Promise.all([
      listPurchaseOrdersByVendor(supabase, vendorCode),
      shouldHideShipped
        ? listPoReferencesShippedByVendorId(supabase, vendorProfileUserId!.trim())
        : Promise.resolve({ data: [] as string[], error: null as Error | null }),
    ]);

    result = poResult;

    if (shouldHideShipped) {
      if (shippedResult.error) {
        throw shippedResult.error;
      }
      shippedPoRefs = new Set(shippedResult.data);
    }
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

  const hideShippedPos =
    listContext === "vendor" &&
    typeof vendorProfileUserId === "string" &&
    vendorProfileUserId.trim() !== "";

  const eligibleRows = hideShippedPos
    ? result.data.filter((r) => !shippedPoRefs.has(r.po_number))
    : result.data;
  const allRows = eligibleRows;
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
