"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode";
import { userFacingLoadError } from "@/lib/utils/load-failure";
import type { Box } from "@/types/box";

type Props = {
  shipmentId: string;
};

type LastResult =
  | { kind: "success"; box: Box }
  | { kind: "error"; message: string };

type ScannerState = "idle" | "starting" | "scanning" | "submitting" | "paused";

type Html5QrcodeCtor = new (elementId: string) => Html5QrcodeType;

declare global {
  interface Window {
    Html5Qrcode?: Html5QrcodeCtor;
  }
}

const SCANNER_DIV_ID = "arrival-scanner";
const SAME_CODE_DEBOUNCE_MS = 3000;
const SCANNER_SCRIPT_SRC = "/vendor/html5-qrcode.min.js";

let scannerLoadPromise: Promise<Html5QrcodeCtor> | null = null;

/**
 * Load html5-qrcode as a UMD bundle from /public. We avoid bundler-level
 * dynamic import because html5-qrcode's ESM build pulls in a sub-UMD dep
 * (`third_party/zxing-js.umd`) that Turbopack cannot chunk reliably.
 */
function loadHtml5Qrcode(): Promise<Html5QrcodeCtor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Scanner must run in the browser"));
  }
  if (window.Html5Qrcode) {
    return Promise.resolve(window.Html5Qrcode);
  }
  if (scannerLoadPromise) {
    return scannerLoadPromise;
  }

  scannerLoadPromise = new Promise<Html5QrcodeCtor>((resolve, reject) => {
    const onReady = () => {
      if (window.Html5Qrcode) {
        resolve(window.Html5Qrcode);
      } else {
        reject(new Error("Scanner library did not register"));
      }
    };
    const onError = () => reject(new Error("Could not load scanner library"));

    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-html5-qrcode="true"]`,
    );
    if (existing) {
      if (window.Html5Qrcode) {
        onReady();
        return;
      }
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SCANNER_SCRIPT_SRC;
    script.async = true;
    script.dataset.html5Qrcode = "true";
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  }).catch((err) => {
    scannerLoadPromise = null;
    throw err;
  });

  return scannerLoadPromise;
}

export function ArrivalScanForm({ shipmentId }: Props) {
  const router = useRouter();

  const [state, setState] = useState<ScannerState>("idle");
  const [startError, setStartError] = useState("");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);

  const qrRef = useRef<Html5QrcodeType | null>(null);
  const lastDecodeRef = useRef<{ code: string; ts: number } | null>(null);
  const submittingRef = useRef(false);

  const [boxCode, setBoxCode] = useState("");
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  const stopScanner = useCallback(async () => {
    const qr = qrRef.current;
    qrRef.current = null;
    if (!qr) {
      return;
    }
    try {
      if (qr.isScanning) {
        await qr.stop();
      }
    } catch {
      // ignore stop errors
    }
    try {
      qr.clear();
    } catch {
      // ignore clear errors
    }
  }, []);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  async function submitBoxCode(
    code: string,
    source: "scan" | "manual",
  ): Promise<boolean> {
    if (source === "scan") {
      submittingRef.current = true;
      setState("submitting");
    } else {
      setIsManualSubmitting(true);
    }
    setLastResult(null);

    try {
      const response = await fetch("/api/boxes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipment_id: shipmentId,
          box_code: code,
        }),
      });
      const payload = (await response.json()) as {
        data?: Box;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        setLastResult({
          kind: "error",
          message: payload.error ?? "Gagal memproses scan box",
        });
        return false;
      }

      setLastResult({ kind: "success", box: payload.data });
      router.refresh();
      return true;
    } catch {
      setLastResult({ kind: "error", message: "Gagal memproses scan box" });
      return false;
    } finally {
      if (source === "scan") {
        submittingRef.current = false;
      } else {
        setIsManualSubmitting(false);
      }
    }
  }

  async function handleDecoded(decodedText: string) {
    const code = decodedText.trim();
    if (!code) {
      return;
    }
    if (submittingRef.current) {
      return;
    }

    const now = Date.now();
    const last = lastDecodeRef.current;
    if (last && last.code === code && now - last.ts < SAME_CODE_DEBOUNCE_MS) {
      return;
    }
    lastDecodeRef.current = { code, ts: now };

    const ok = await submitBoxCode(code, "scan");
    if (ok) {
      if (qrRef.current) {
        setState("scanning");
      }
    } else {
      await stopScanner();
      setState("paused");
    }
  }

  async function startScanner() {
    setStartError("");
    setLastResult(null);
    setState("starting");
    lastDecodeRef.current = null;
    try {
      const Html5Qrcode = await loadHtml5Qrcode();
      const instance = new Html5Qrcode(SCANNER_DIV_ID);
      qrRef.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          void handleDecoded(decodedText);
        },
        () => {
          // per-frame "not found" errors are noisy; ignore
        },
      );
      setState("scanning");
    } catch (e) {
      const { message } = userFacingLoadError(e, "Gagal menyalakan kamera");
      setStartError(message);
      qrRef.current = null;
      setState("idle");
    }
  }

  async function handleStopClick() {
    await stopScanner();
    setState("idle");
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = boxCode.trim();
    if (code === "") {
      setLastResult({ kind: "error", message: "Masukkan kode box" });
      return;
    }
    const ok = await submitBoxCode(code, "manual");
    if (ok) {
      setBoxCode("");
    }
  }

  const statusLabel =
    state === "idle"
      ? "Siap"
      : state === "starting"
        ? "Menyalakan kamera…"
        : state === "scanning"
          ? "Memindai…"
          : state === "submitting"
            ? "Memproses…"
            : "Dijeda";

  const scannerVisible = state !== "idle";
  const showStartButton = state === "idle" || state === "paused";

  return (
    <div
      className="ds-card flex flex-col gap-4 border-2 p-4 shadow-[var(--shadow-md)]"
      style={{
        borderColor: "color-mix(in srgb, var(--navy) 22%, var(--border-default))",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--navy) 3%, #fff) 0%, var(--surface) 12%)",
      }}
    >
      <div className="flex flex-col gap-1 border-b border-[var(--border-default)] pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--navy)]">
          Input scan
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Prioritaskan kamera; gunakan input manual bila QR tidak terbaca.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-medium text-[var(--text-primary)]">
              Scanner kamera
            </span>
            <span className="ml-2 text-[var(--text-muted)]">{statusLabel}</span>
          </div>
          <div className="flex gap-2">
            {showStartButton ? (
              <button
                type="button"
                onClick={startScanner}
                className="ds-btn ds-btn-primary px-3 py-1.5"
              >
                {state === "paused" ? "Lanjut scan" : "Mulai scanner"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopClick}
                disabled={state === "starting"}
                className="ds-btn ds-btn-secondary py-1.5 disabled:cursor-not-allowed"
              >
                Hentikan scanner
              </button>
            )}
          </div>
        </div>

        <div
          id={SCANNER_DIV_ID}
          className={
            scannerVisible
              ? "w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)]"
              : "hidden"
          }
        />

        {startError ? (
          <p
            className="ds-alert ds-alert-error"
            role="alert"
          >
            {startError}
          </p>
        ) : null}

        {lastResult?.kind === "success" ? (
          <p className="ds-alert ds-alert-success" role="status">
            Box <span className="ds-inline-code">{lastResult.box.box_code}</span>{" "}
            ditandai tiba (arrived).
          </p>
        ) : null}

        {lastResult?.kind === "error" ? (
          <p
            className="ds-alert ds-alert-error"
            role="alert"
          >
            {lastResult.message}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={handleManualSubmit}
        className="flex flex-col gap-2 border-t border-[var(--border-default)] pt-4"
      >
        <label htmlFor="box_code" className="ds-form-label">
          QR tidak terbaca? Ketik kode box
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            id="box_code"
            name="box_code"
            type="text"
            autoComplete="off"
            value={boxCode}
            onChange={(e) => setBoxCode(e.target.value)}
            placeholder="Kode box"
            className="ds-input flex-1 font-mono"
          />
          <button
            type="submit"
            disabled={isManualSubmitting}
            className="ds-btn ds-btn-primary shrink-0"
          >
            {isManualSubmitting ? "Memproses…" : "Tandai tiba"}
          </button>
        </div>
      </form>
    </div>
  );
}
