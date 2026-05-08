import { Inbox, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VendorCodeForm } from "@/components/erp-po/VendorCodeForm";
import { VendorPoListSection } from "@/components/erp-po/VendorPoListSection";
import { getProfileById } from "@/lib/queries/profiles";
import { createClient } from "@/lib/supabase/server";

/** Awalan badan hukum yang tidak dipakai untuk inisial avatar. */
const VENDOR_LEGAL_PREFIXES = new Set(["pt", "cv"]);

function stripVendorLegalPrefixes(words: string[]): string[] {
  const rest = [...words];
  while (rest.length > 0) {
    const norm = rest[0]!.replace(/\./g, "").toLowerCase();
    if (VENDOR_LEGAL_PREFIXES.has(norm)) {
      rest.shift();
    } else {
      break;
    }
  }
  return rest;
}

function vendorDisplayInitials(
  fullName: string | null | undefined,
  fallbackCode: string,
): string {
  const t = fullName?.trim() ?? "";
  if (t) {
    const parts = stripVendorLegalPrefixes(t.split(/\s+/).filter(Boolean));
    if (parts.length >= 2) {
      const a = parts[0]!.charAt(0);
      const b = parts[parts.length - 1]!.charAt(0);
      return `${a}${b}`.toUpperCase();
    }
    if (parts.length === 1) {
      const w = parts[0]!;
      if (w.length >= 2) {
        return w.slice(0, 2).toUpperCase();
      }
      return `${w}${w}`.toUpperCase();
    }
  }
  const c = fallbackCode.replace(/\s/g, "");
  if (c.length >= 2) {
    return c.slice(0, 2).toUpperCase();
  }
  return c ? c.slice(0, 1).toUpperCase() + "·" : "?";
}

function VendorPoLookupBanner({ vendorCode }: { vendorCode: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-amber-200/80 bg-[color-mix(in_srgb,#fef3c7_55%,#ffffff)] px-4 py-3.5 sm:px-5 sm:py-4">
      <p className="m-0 text-sm leading-relaxed text-[var(--text-secondary)]">
        Menampilkan semua PO ERP untuk kode vendor{" "}
        <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-xs font-semibold text-[var(--navy)]">
          {vendorCode}
        </span>
        . Login sebagai vendor untuk hanya melihat PO yang masih bisa dibuat shipment pertama.
      </p>
    </div>
  );
}

export default async function VendorPurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor_code?: string; q?: string }>;
}) {
  const { vendor_code: rawVendorParam, q: rawQ } = await searchParams;
  const vendorCodeParam = rawVendorParam?.trim() ?? "";
  const poQuery = rawQ?.trim() ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? (await getProfileById(supabase, user.id)).data
    : null;

  const isVendor = profile?.role === "vendor";
  const vendorCodeFromProfile =
    typeof profile?.vendor_code === "string" ? profile.vendor_code.trim() : "";

  if (isVendor) {
    if (vendorCodeParam !== "") {
      redirect(
        `/vendor/purchase-orders${poQuery ? `?q=${encodeURIComponent(poQuery)}` : ""}`,
      );
    }

    return (
      <div className="ds-page-operational">
        <header className="border-b border-[var(--border-default)] pb-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="ds-section-label mb-0">Vendor</p>
          </div>
          <h1 className="ds-h1 text-[var(--navy)]">Daftar PO</h1>
          <p className="ds-lead mt-1 max-w-6xl">
            PO yang perlu dikonfirmasi untuk membuat shipment. Setelah anda mengkonfirmasi shipment (termasuk draft), kelola lebih lanjut pada halaman Shipment.
          </p>
        </header>
        <div className="flex flex-col gap-5">
          {vendorCodeFromProfile === "" ? (
            <div className="ds-alert ds-alert-warn" role="status">
              Akun vendor Anda belum memiliki kode vendor di profil. Hubungi admin agar
              kode vendor terisi — tanpa itu daftar PO tidak dapat dimuat.
            </div>
          ) : (
            <>
              <section
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
                aria-label="Konteks vendor dan pencarian PO"
              >
                <div className="bg-[var(--info-muted)] px-4 py-4 sm:px-5 sm:py-5">
                  <div className="flex gap-3 sm:gap-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums tracking-tight text-white shadow-[inset_0_1px_0_color-mix(in_srgb,#ffffff_22%,transparent)] sm:h-12 sm:w-12 sm:text-base"
                      style={{
                        background:
                          "linear-gradient(145deg, color-mix(in srgb, var(--navy) 88%, #ffffff 12%) 0%, color-mix(in srgb, var(--navy) 96%, #0f172a 4%) 100%)",
                      }}
                      aria-hidden
                    >
                      {vendorDisplayInitials(
                        profile?.full_name,
                        vendorCodeFromProfile,
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
                        <p className="m-0 text-base font-semibold leading-snug text-[var(--text-primary)] sm:text-lg">
                          {profile?.full_name?.trim() ||
                            user?.email ||
                            "Vendor"}
                        </p>
                        <span className="inline-flex max-w-full min-w-0 items-center rounded-full bg-[color-mix(in_srgb,var(--surface)_92%,var(--info)_8%)] px-3 py-1 font-mono text-[0.7rem] font-semibold tracking-tight text-[var(--info)] sm:text-xs">
                          Vendor {vendorCodeFromProfile}
                        </span>
                      </div>
                      <p className="mt-1.5 m-0 text-xs leading-snug text-[var(--text-secondary)] sm:text-sm">
                        Hanya PO yang belum punya shipment Anda di bawah ini
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  action="/vendor/purchase-orders"
                  method="get"
                  className="flex flex-wrap items-end gap-3 border-t border-[var(--border-default)] bg-[var(--section-bg)] px-4 py-4 sm:gap-4 sm:px-5 sm:py-5"
                  role="search"
                  aria-label="Cari nomor PO"
                >
                  <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5 sm:min-w-[200px]">
                    <label htmlFor="vendor-po-q" className="ds-form-label">
                      Cari nomor PO
                    </label>
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <input
                        id="vendor-po-q"
                        name="q"
                        className="ds-input bg-[var(--surface)] pl-9"
                        defaultValue={poQuery}
                        placeholder="Ketik sebagian atau seluruh nomor PO"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <button type="submit" className="ds-btn ds-btn-primary">
                    Terapkan
                  </button>
                </form>
              </section>

              <VendorPoListSection
                vendorCode={vendorCodeFromProfile}
                poQuery={poQuery}
                listContext="vendor"
                vendorProfileUserId={user?.id ?? null}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ds-page-operational">
      <header className="border-b border-[var(--border-default)] pb-6">
        <p className="ds-section-label mb-0">Vendor</p>
        <h1 className="ds-h1 text-[var(--navy)]">Daftar PO</h1>
        <p className="ds-lead mt-1 max-w-3xl">
          Masukkan vendor code untuk memuat purchase order yang tersedia.
        </p>
      </header>
      <div className="flex flex-col gap-5">
        <VendorCodeForm
          key={vendorCodeParam || "__no_vendor__"}
          initialVendorCode={vendorCodeParam}
        />
        {vendorCodeParam === "" ? (
          <div className="ds-empty py-9">
            <div className="mb-3 flex justify-center" aria-hidden>
              <Inbox className="h-10 w-10 text-[var(--navy)]/35" strokeWidth={1.25} />
            </div>
            <p className="ds-empty-title">Belum memuat data</p>
            <p className="ds-empty-hint max-w-sm mx-auto">
              Isi vendor code di atas, lalu pilih <span className="font-medium">Muat daftar</span>{" "}
              untuk menampilkan daftar PO.
            </p>
          </div>
        ) : (
          <>
            <VendorPoLookupBanner vendorCode={vendorCodeParam} />
            <VendorPoListSection vendorCode={vendorCodeParam} listContext="lookup" />
          </>
        )}
      </div>
    </div>
  );
}
