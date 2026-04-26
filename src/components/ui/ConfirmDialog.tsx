"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  variant?: "default" | "danger";
  confirmDisabled?: boolean;
  id?: string;
};

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  onConfirm,
  loading = false,
  variant = "default",
  confirmDisabled = false,
  id: idProp,
}: Props) {
  const generatedId = useId();
  const titleId = idProp ?? `confirm-dialog-title-${generatedId}`;
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const t = requestAnimationFrame(() => {
      confirmRef.current?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [open]);

  if (!open) {
    return null;
  }

  const confirmClassName =
    variant === "danger"
      ? "ds-btn ds-btn-danger"
      : "ds-btn ds-btn-primary";

  return (
    <div
      className="ds-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        tabIndex={-1}
        className="ds-dialog-panel w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--shadow-md)]"
      >
        <div
          className="h-0.5 w-full"
          style={{
            background:
              variant === "danger"
                ? "linear-gradient(90deg, rgb(185 28 28 / 0.9) 0%, rgb(220 38 38 / 0.75) 100%)"
                : "linear-gradient(90deg, var(--navy) 0%, var(--epson-yellow) 100%)",
          }}
          aria-hidden
        />
        <div className="border-b border-[var(--border-default)] bg-[var(--section-bg)] px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <h2
              id={titleId}
              className="m-0 text-base font-semibold leading-snug text-[var(--text-primary)]"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="ds-btn ds-btn-ghost -mr-1 shrink-0 disabled:opacity-60"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <div className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {description}
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="ds-btn ds-btn-secondary w-full sm:w-auto"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => {
                void onConfirm();
              }}
              disabled={loading || confirmDisabled}
              className={`${confirmClassName} w-full min-w-[7rem] sm:w-auto`}
            >
              {loading ? "Memproses…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
