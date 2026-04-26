import { LoginHeroPanel } from "@/components/auth/LoginHeroPanel";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandLockup } from "@/components/public/BrandLockup";

function safeRedirectPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = safeRedirectPath(next);

  return (
    <div
      className="relative flex min-h-dvh min-h-full flex-1 flex-col bg-[var(--page-bg)] lg:min-h-0 lg:flex-row"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_100%_0%,color-mix(in_srgb,var(--navy)_5%,transparent),transparent_55%),radial-gradient(820px_440px_at_0%_100%,color-mix(in_srgb,var(--epson-yellow)_5%,#ffffff_95%)_0%,transparent_58%)]"
        aria-hidden
      />

      <LoginHeroPanel />

      <div
        className="relative z-[1] order-2 flex w-full min-w-0 flex-col justify-center bg-[color-mix(in_srgb,#ffffff_96%,var(--section-bg))] px-4 py-10 sm:px-8 sm:py-12 lg:order-2 lg:w-1/3 lg:shrink-0 lg:px-8 lg:py-12 xl:px-10"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.2] lg:opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(color-mix(in srgb, var(--navy) 2.5%, transparent) 1px, transparent 1px),
              linear-gradient(90deg, color-mix(in srgb, var(--navy) 2.5%, transparent) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
          aria-hidden
        />
        <div className="reveal-children relative z-[1] mx-auto flex w-full max-w-md flex-col items-center">
          <div className="mb-7 flex w-full justify-center">
            <BrandLockup theme="light" />
          </div>
          <header className="mb-8 w-full text-center">
            <h1 className="ds-h1">Login</h1>
            <p className="ds-lead text-pretty">
              Selamat datang! Gunakan email dan kata sandi yang terdaftar
            </p>
          </header>
          <div className="w-full">
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>
      </div>
    </div>
  );
}
