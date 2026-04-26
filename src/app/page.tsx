import { BrandLockup } from "@/components/public/BrandLockup";
import { LogIn } from "lucide-react";
import Link from "next/link";

const ROLES: { id: string; label: string; dot: string }[] = [
  { id: "vendor", label: "Vendor", dot: "bg-slate-400" },
  { id: "checker", label: "Checker", dot: "bg-amber-500" },
  { id: "supervisor", label: "Supervisor", dot: "bg-emerald-500" },
];

export default function Home() {
  return (
    <div className="relative flex min-h-dvh min-h-full flex-1 flex-col overflow-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
      {/* Grid lebih terlihat + glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-85"
        style={{
          backgroundImage: `
            linear-gradient(color-mix(in srgb, var(--navy) 9%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--navy) 9%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-28 top-0 h-96 w-96 rounded-full bg-sky-500/[0.1] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--navy)_7%,#ffffff_93%)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-1/3 top-1/3 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--epson-yellow)_9%,#ffffff_91%)] blur-3xl"
        aria-hidden
      />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[color-mix(in_srgb,#ffffff_92%,var(--page-bg)_8%)] px-4 py-3.5 shadow-[var(--shadow-sm)] backdrop-blur-md sm:px-8 lg:px-10">
        <BrandLockup />
         
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
        <div className="reveal-children w-full max-w-2xl text-center sm:max-w-3xl">
          <h1 className="text-balance text-3xl font-bold leading-[1.12] tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl md:leading-[1.1]">
            Sistem verifikasi pengiriman
            <br className="sm:hidden" />
            <span className="text-[var(--navy)]"> &amp;  penerimaan barang</span>
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-[var(--text-secondary)] sm:mt-6 sm:mx-auto sm:text-lg sm:leading-relaxed">
            Portal terpusat untuk memonitor kedatangan barang, verifikasi inbound, dan rekonsiliasi
            operasional — khusus lingkungan internal{" "}
            <span className="font-medium text-[var(--text-primary)]">PT Indonesia Epson Industry</span>.
          </p>

          <div className="mt-9 flex flex-col items-center gap-2.5 sm:mt-10">
            <Link
              prefetch={false}
              className="ds-btn ds-btn-primary inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium transition hover:-translate-y-px sm:px-9 sm:py-3.5 sm:text-[1.05rem]"
              href="/login"
            >
              <LogIn className="h-5 w-5" strokeWidth={2.1} aria-hidden />
              Akses Sistem
            </Link>
            <p className="text-sm text-[var(--text-muted)] sm:text-base">
              Gunakan akun yang diberikan oleh admin.
            </p>
          </div>

          <div className="reveal-stagger mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {ROLES.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3.5 py-1.5 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-sm)] sm:px-4 sm:py-2 sm:text-base"
              >
                <span
                  className={["h-2 w-2 shrink-0 rounded-full", r.dot].join(" ")}
                  aria-hidden
                />
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-[var(--border-default)] bg-[var(--surface)]/90 px-4 py-3.5 text-sm text-[var(--text-muted)] backdrop-blur-sm sm:px-8 sm:text-base lg:px-10">
        <p className="text-balance text-center sm:text-left">
          © {new Date().getFullYear()} PT Indonesia Epson Industry — hanya untuk penggunaan internal.
        </p>
      </footer>
    </div>
  );
}
