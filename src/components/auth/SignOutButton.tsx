"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { replaceThenRefresh } from "@/lib/safeClientNavigation";

type Props = {
  /** Dark navy sidebar: contrast + icon affordance. */
  variant?: "default" | "shellDark";
  className?: string;
};

export function SignOutButton({
  variant = "default",
  className = "",
}: Props) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isDark = variant === "shellDark";

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      replaceThenRefresh(router, "/");
    } finally {
      setIsSigningOut(false);
    }
  }

  const base =
    "ds-btn-ghost w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  const baseFocus = isDark
    ? "focus-visible:outline-[#f87171]"
    : "focus-visible:outline-[var(--navy)]";
  const defaultSkin =
    "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] lg:w-auto";
  const darkSkin =
    "shell-signout--dark border px-2.5 py-2.5 font-medium lg:w-auto";

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={[
        base,
        baseFocus,
        isDark ? darkSkin : defaultSkin,
        isDark ? "shell-signout" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <LogOut
        className={`shell-signout__icon ${
          isDark ? "hidden lg:inline" : "hidden"
        }`}
        strokeWidth={2}
        aria-hidden
      />
      <span className="shell-signout__text">
        {isSigningOut ? "Keluar…" : "Keluar"}
      </span>
    </button>
  );
}
