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
      </div>
    </aside>
  );
}
