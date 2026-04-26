"use client";

import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";

type Props = {
  /** When browser history is empty or a direct/refresh open, navigate here */
  fallbackHref: string;
  /**
   * `default` — underlined, navy (detail / error callouts);
   * `nav` — muted text, for compact header row links
   */
  variant?: "default" | "nav";
  className?: string;
  children?: ReactNode;
};

/**
 * Tries `router.back()` when the session history likely has a previous in-app
 * entry; otherwise `router.push(fallbackHref)`. Renders a real `href` for
 * no-JS, new-tab, and long-press behavior.
 */
export function SmartBackLink({
  fallbackHref,
  variant = "default",
  className: classNameProp,
  children,
}: Props) {
  const router = useRouter();

  const base =
    variant === "nav" ? "ds-smart-back ds-smart-back--nav" : "ds-smart-back ds-smart-back--default";

  const className = [base, classNameProp].filter(Boolean).join(" ");

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  const content = children ?? (
    <>
      <span className="ds-smart-back__arrow" aria-hidden>
        ←
      </span>{" "}
      Kembali
    </>
  );

  return (
    <a href={fallbackHref} onClick={handleClick} className={className}>
      {content}
    </a>
  );
}
