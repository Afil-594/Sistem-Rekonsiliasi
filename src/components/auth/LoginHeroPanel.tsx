import Image from "next/image";

/**
 * Left column for /login: hero visual only. Presentational only.
 */
export function LoginHeroPanel() {
  return (
    <aside
      className={[
        "relative z-[1] order-1 flex w-full min-w-0 flex-col overflow-hidden",
        "border-b border-[var(--border-default)]",
        "bg-[var(--section-bg)]",
        "lg:order-1 lg:min-h-dvh lg:w-2/3 lg:shrink-0 lg:border-b-0 lg:border-r",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage: `
            linear-gradient(color-mix(in srgb, var(--navy) 2.2%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--navy) 2.2%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-sky-300/[0.12] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[color-mix(in_srgb,var(--epson-yellow)_8%,#ffffff_92%)] blur-2xl"
        aria-hidden
      />

      <div
        className={[
          "relative z-[1] w-full min-h-0",
          "h-[min(40vh,20rem)] sm:h-[min(42vh,22rem)]",
          "lg:h-auto lg:min-h-0 lg:flex-1",
        ].join(" ")}
      >
        <div className="absolute inset-0">
          <Image
            src="/images/login/hero.png"
            alt="Ilustrasi operasional logistik Epson IJP"
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 1023px) 100vw, 66vw"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--navy)_18%,#f4f6f9_80%)] via-transparent to-[color-mix(in_srgb,#ffffff_30%,transparent)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,#ffffff_22%,transparent)] to-transparent"
          aria-hidden
        />
        {/* Subtle base gradient (bottom → top) for tagline legibility on bright images */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(52%,13rem)] bg-gradient-to-t from-[color-mix(in_srgb,var(--navy)_30%,#000_70%)]/[0.22] via-[color-mix(in_srgb,var(--navy)_12%,#000_88%)]/[0.07] to-transparent"
          aria-hidden
        />
        <div
          className="absolute bottom-0 left-0 z-[2] w-full max-w-[min(100%,20rem)] p-5 pb-6 pl-5 sm:max-w-md sm:p-7 sm:pb-7 lg:max-w-lg lg:px-9 lg:pb-9"
        >
          <p className="mb-2 text-[0.6rem] font-normal uppercase leading-tight tracking-[0.22em] text-white/50 sm:text-[0.65rem]">
            Sistem verifikasi pengiriman &amp; penerimaan barang
          </p>
          <p className="text-pretty text-base font-light leading-[1.45] text-white/90 sm:text-lg lg:text-[1.35rem] lg:leading-snug">
            Setiap langkah terverifikasi, setiap selisih terdokumentasi.
          </p>
        </div>
      </div>
    </aside>
  );
}
