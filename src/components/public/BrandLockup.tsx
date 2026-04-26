import { Package } from "lucide-react";

type Props = {
  className?: string;
  /** "light" = app surfaces; "dark" = public / & login */
  theme?: "light" | "dark";
};

/**
 * System + org lockup; shared by internal landing and login context panel.
 */
export function BrandLockup({ className, theme = "light" }: Props) {
  const isDark = theme === "dark";
  return (
    <div className={["flex items-center gap-2.5", className].filter(Boolean).join(" ")}>
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
          "bg-[linear-gradient(135deg,var(--navy)_0%,color-mix(in_srgb,var(--navy)_82%,var(--epson-yellow)_18%)_100%)]",
        ].join(" ")}
        aria-hidden
      >
        <Package className="h-4 w-4" strokeWidth={2.1} />
      </div>
      <div className="min-w-0 text-left">
        <p
          className={[
            "truncate text-sm font-semibold leading-tight tracking-tight",
            isDark ? "text-white" : "text-[var(--text-primary)]",
          ].join(" ")}
        >
          Epson
        </p>
        <p
          className={[
            "truncate text-[0.7rem] leading-tight",
            isDark ? "text-sky-200/80" : "text-[var(--text-muted)]",
          ].join(" ")}
        >
          PT Indonesia Epson Industry
        </p>
      </div>
    </div>
  );
}
