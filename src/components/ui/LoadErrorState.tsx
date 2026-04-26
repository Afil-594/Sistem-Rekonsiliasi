"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type ActionKind = "reload" | "retry";

const ACTION_LABEL: Record<ActionKind, string> = {
  reload: "Muat ulang",
  retry: "Coba lagi",
};

type Props = {
  message: string;
  /** Secondary line, e.g. for timeout / connection context */
  detailHint?: string;
  /** "Muat ulang" for full page refresh (default); "Coba lagi" for in-flow retries */
  action?: ActionKind;
  className?: string;
};

/**
 * Reusable error callout with router.refresh for server-rendered pages.
 * Keep business/API messages in `message` as returned by the server; use
 * `load-failure` helpers there for transport errors.
 */
export function LoadErrorState({
  message,
  detailHint,
  action = "reload",
  className,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={[
        "ds-alert ds-alert-error flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="alert"
    >
      <div className="min-w-0 flex-1">
        <p className="m-0 font-medium leading-snug">{message}</p>
        {detailHint ? (
          <p className="m-0 mt-1.5 text-sm text-[var(--text-secondary)]">
            {detailHint}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="ds-btn ds-btn-secondary w-full shrink-0 sm:mt-0.5 sm:w-auto"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {pending ? "Memuat…" : ACTION_LABEL[action]}
      </button>
    </div>
  );
}
