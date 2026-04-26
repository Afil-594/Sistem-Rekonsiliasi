import { BrandLockup } from "@/components/public/BrandLockup";
import {
  ClipboardList,
  FileText,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";

const STEPS: {
  icon: typeof FileText;
  label: string;
  sub: string;
  iconWrap: string;
}[] = [
  {
    icon: FileText,
    label: "ASN & PO",
    sub: "Siapkan & kirim dokumen",
    iconWrap:
      "bg-[color-mix(in_srgb,var(--navy)_8%,#ffffff_92%)] text-[var(--navy)]",
  },
  {
    icon: ShieldCheck,
    label: "Gate check-in",
    sub: "Verifikasi kedatangan",
    iconWrap: "bg-emerald-500/10 text-emerald-700",
  },
  {
    icon: PackageSearch,
    label: "Inbound verify",
    sub: "Scan & cek fisik box",
    iconWrap: "bg-[color-mix(in_srgb,var(--epson-yellow)_16%,#ffffff_84%)] text-amber-800",
  },
  {
    icon: ClipboardList,
    label: "Rekonsiliasi",
    sub: "Selisih & tindak lanjut",
    iconWrap: "bg-rose-500/10 text-rose-700",
  },
];

/**
 * Left column for /login: light tinted “story” + workflow (not dark slab). Presentational only.
 */
export function LoginContextPanel() {
  return (
    <aside
      className={[
        "relative z-[1] order-2 flex min-h-0 flex-col justify-between overflow-hidden",
        "border-b border-[var(--border-default)] px-5 py-7 sm:px-7",
        "lg:order-1 lg:min-h-full lg:max-w-md lg:flex-1 lg:border-b-0 lg:border-r",
        "bg-[linear-gradient(165deg,color-mix(in_srgb,#ffffff_70%,#e8edf5)_0%,#eef1f6_40%,#f0f3f8_100%)]",
        "xl:max-w-lg",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: `
            linear-gradient(color-mix(in srgb, var(--navy) 2.5%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--navy) 2.5%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-1/4 h-64 w-64 rounded-full bg-sky-400/[0.12] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[color-mix(in_srgb,var(--navy)_6%,#ffffff_94%)] blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-[color-mix(in_srgb,var(--epson-yellow)_12%,#ffffff_88%)] blur-2xl"
        aria-hidden
      />

      <div className="relative z-[1] flex flex-col gap-8">
        <BrandLockup theme="light" />

        <div>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Alur kerja sistem
          </p>
          <ol className="mt-4 flex flex-col gap-0">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.label} className="flex flex-col">
                  <div className="flex items-start gap-3 rounded-[0.6rem] border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2.5 shadow-[var(--shadow-sm)] transition-shadow duration-200 hover:shadow-md">
                    <div
                      className={[
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                        step.iconWrap,
                      ].join(" ")}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-[0.7rem] leading-snug text-[var(--text-muted)]">
                        {step.sub}
                      </p>
                    </div>
                  </div>
                  {i < STEPS.length - 1 ? (
                    <div
                      className="ml-4 h-3 w-px shrink-0 bg-gradient-to-b from-[color-mix(in_srgb,var(--navy)_22%,transparent)] to-[color-mix(in_srgb,var(--navy)_6%,transparent)]"
                      aria-hidden
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="relative z-[1] mt-8 flex items-center gap-2 text-[0.7rem] text-[var(--text-secondary)] lg:mt-0">
        <span
          className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-sm"
          aria-hidden
        />
        Sistem operasional aktif
      </div>
    </aside>
  );
}
