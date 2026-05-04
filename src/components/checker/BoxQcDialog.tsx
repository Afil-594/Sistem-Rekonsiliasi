"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Box } from "@/types/box";
import type { DiscrepancyType } from "@/types/discrepancy";

type Props = {
  shipmentId: string;
  box: Box;
  onClose: () => void;
  onSuccess: (box: Box) => void;
};

type Step = "decision" | "discrepancy" | "camera";

const DISCREPANCY_TYPES: ReadonlyArray<{
  value: DiscrepancyType;
  label: string;
}> = [
  { value: "defect", label: "Cacat" },
  { value: "other", label: "Lainnya" },
];

export function BoxQcDialog({ shipmentId, box, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("decision");
  const [discrepancyType, setDiscrepancyType] =
    useState<DiscrepancyType>("defect");
  const [description, setDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const filePickerRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) {
        if (step === "camera") {
          stopCamera();
          setStep("discrepancy");
          return;
        }
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting, step, stopCamera]);

  async function openCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setStep("camera");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setCameraError(
        "Tidak dapat mengakses kamera. Periksa izin browser atau gunakan Pilih gambar.",
      );
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.drawImage(video, 0, 0);
    stopCamera();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File(
            [blob],
            `evidence-${Date.now()}.jpg`,
            { type: "image/jpeg" },
          );
          setEvidenceFile(file);
        }
        setStep("discrepancy");
      },
      "image/jpeg",
      0.85,
    );
  }

  function cancelCamera() {
    stopCamera();
    setStep("discrepancy");
  }

  async function submit(
    body:
      | { decision: "accepted" }
      | {
          decision: "rejected";
          discrepancy_type: DiscrepancyType;
          description: string;
          evidence: File | null;
        },
  ) {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const formData = new FormData();
      formData.set("shipment_id", shipmentId);
      formData.set("box_id", box.id);
      formData.set("decision", body.decision);

      if (body.decision === "rejected") {
        formData.set("discrepancy_type", body.discrepancy_type);
        formData.set("description", body.description);
        if (body.evidence) {
          formData.set("evidence", body.evidence);
        }
      }

      const response = await fetch("/api/boxes/qc", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        data?: { box: Box };
        error?: string;
      };

      if (!response.ok || !payload.data) {
        setErrorMessage(payload.error ?? "Gagal memperbarui box");
        return;
      }

      onSuccess(payload.data.box);
    } catch {
      setErrorMessage("Gagal memperbarui box");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccept() {
    await submit({ decision: "accepted" });
  }

  async function handleRejectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!discrepancyType) {
      setErrorMessage("Jenis selisih wajib dipilih");
      return;
    }
    if (description.trim().length === 0) {
      setErrorMessage("Deskripsi wajib diisi");
      return;
    }
    await submit({
      decision: "rejected",
      discrepancy_type: discrepancyType,
      description: description.trim(),
      evidence: evidenceFile,
    });
  }

  function handleEvidenceChange(file: File | null) {
    setEvidenceFile(file);
    setErrorMessage("");
  }

  return (
    <div
      className="ds-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qc-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="ds-dialog-panel w-full max-w-lg overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
        <div
          className="h-1 w-full"
          style={{
            background: "linear-gradient(90deg, var(--navy) 0%, var(--epson-yellow) 100%)",
          }}
          aria-hidden
        />
        <div className="border-b border-[var(--border-default)] bg-[var(--section-bg)] px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--navy)]">
                  Pemeriksaan QC
                </p>
              </div>
              <h2
                id="qc-dialog-title"
                className="mt-1.5 break-words text-base font-semibold leading-snug text-[var(--text-primary)] sm:text-lg"
              >
                <span className="font-mono tracking-tight">{box.box_code}</span>
              </h2>
              <div className="mt-2 flex flex-col gap-0.5 text-sm text-[var(--text-secondary)]">
                <span>Part: <b>{box.part_number}</b></span>
                <span>Qty: <b>{box.qty_per_box}</b></span>
                <span>Lot: <b>{box.lot_number}</b></span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="ds-btn ds-btn-ghost -mr-1 disabled:opacity-60"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[min(70vh,36rem)] overflow-y-auto px-4 py-4 sm:px-5">
          {step === "decision" ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Bandingkan barang fisik dengan kode, part, dan qty, lalu pilih
                <strong> satu</strong> opsi dibawah.
              </p>
              {errorMessage ? (
                <p className="ds-alert ds-alert-error font-medium" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={submitting}
                  className="ds-card group flex min-h-[7.5rem] flex-col items-start border-2 border-emerald-300/90 bg-gradient-to-b from-emerald-50/95 to-emerald-50/50 p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md disabled:translate-y-0 disabled:opacity-60 dark:from-emerald-950/40 dark:to-emerald-950/15 dark:border-emerald-800"
                >
                  <span className="rounded bg-emerald-700/90 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white">
                    A — Sesuai
                  </span>
                  <span className="mt-2 text-sm font-bold text-emerald-950 dark:text-emerald-100">
                    Diterima
                  </span>
                  <span className="mt-1.5 text-xs leading-snug text-emerald-900/90 dark:text-emerald-200/90">
                    Tidak bermasalah — lanjut ke box berikutnya.
                  </span>
                  <span className="mt-auto pt-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {submitting ? "Memproses…" : "Klik untuk menerima →"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage("");
                    setStep("discrepancy");
                  }}
                  disabled={submitting}
                  className="ds-card group flex min-h-[7.5rem] flex-col items-start border-2 border-red-300/90 bg-gradient-to-b from-red-50/90 to-red-50/50 p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-red-500 hover:shadow-md disabled:translate-y-0 disabled:opacity-60 dark:from-red-950/40 dark:to-red-950/15 dark:border-red-900/80"
                >
                  <span className="rounded bg-red-700/90 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white">
                    B — Bermasalah
                  </span>
                  <span className="mt-2 text-sm font-bold text-red-900 dark:text-red-100">
                    Tolak (ada selisih)
                  </span>
                  <span className="mt-1.5 text-xs leading-snug text-red-900/90 dark:text-red-200/90">
                    Catat alasan, jenis, dan bukti bila tersedia.
                  </span>
                  <span className="mt-auto pt-3 text-xs font-semibold text-red-800 dark:text-red-300">
                    Lanjut ke form detail →
                  </span>
                </button>
              </div>
            </div>
          ) : step === "discrepancy" ? (
            <form
              onSubmit={handleRejectSubmit}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="m-0 text-sm font-medium text-[var(--text-primary)]">
                  Catat kondisi bermasalah
                </p>
                <span className="text-xs text-[var(--text-muted)]">Deskripsi wajib</span>
              </div>
              {errorMessage ? (
                <p className="ds-alert ds-alert-error font-medium" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <p className="text-sm text-[var(--text-secondary)]">
                Deskripsi yang jelas akan membantu supervisor untuk memahami permasalahan.
              </p>
              <div
                className="ds-subpanel"
                style={{
                  borderColor: "color-mix(in srgb, var(--navy) 12%, var(--border-default))",
                }}
              >
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Detail kondisi
                </h3>
                <div className="mt-2 flex flex-col gap-1">
                  <label
                    htmlFor="qc-discrepancy-type"
                    className="ds-form-label"
                  >
                    Jenis selisih
                  </label>
                  <select
                    id="qc-discrepancy-type"
                    value={discrepancyType}
                    onChange={(e) =>
                      setDiscrepancyType(e.target.value as DiscrepancyType)
                    }
                    disabled={submitting}
                    required
                    className="ds-select"
                  >
                    {DISCREPANCY_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 flex flex-col gap-1">
                  <label htmlFor="qc-description" className="ds-form-label">
                    Deskripsi
                  </label>
                  <textarea
                    id="qc-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    required
                    disabled={submitting}
                    placeholder="Jelaskan kondisi secara spesifik"
                    className="ds-input min-h-[5rem] resize-y"
                  />
                </div>
              </div>

              <div className="ds-subpanel">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Bukti (opsional)
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Foto pendukung — dari kamera atau unggah file.
                </p>
                <input
                  id="qc-evidence"
                  ref={filePickerRef}
                  type="file"
                  accept="image/*"
                  disabled={submitting}
                  onChange={(e) =>
                    handleEvidenceChange(e.target.files?.[0] ?? null)
                  }
                  className="sr-only"
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={openCamera}
                    className="ds-btn ds-btn-secondary"
                  >
                    Buka kamera
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => filePickerRef.current?.click()}
                    className="ds-btn ds-btn-secondary"
                  >
                    Pilih gambar
                  </button>
                  {evidenceFile ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleEvidenceChange(null)}
                      className="ds-btn ds-btn-ghost"
                    >
                      Hapus file
                    </button>
                  ) : null}
                </div>
                {evidenceFile ? (
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Terpilih:{" "}
                    <span className="font-mono text-[var(--text-primary)]">
                      {evidenceFile.name}
                    </span>
                  </p>
                ) : null}
                {cameraError ? (
                  <p className="mt-1 text-xs text-red-600" role="status">
                    {cameraError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage("");
                    setEvidenceFile(null);
                    setStep("decision");
                  }}
                  disabled={submitting}
                  className="ds-btn ds-btn-secondary"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ds-btn ds-btn-danger"
                >
                  {submitting ? "Memproses…" : "Kirim laporan"}
                </button>
              </div>
            </form>
          ) : null}

          {step === "camera" ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[var(--text-secondary)]">
                Arahkan kamera ke bukti dan ambil satu foto.
              </p>
              {errorMessage ? (
                <p className="ds-alert ds-alert-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-[var(--radius-md)] bg-black"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="ds-btn ds-btn-primary flex-1"
                >
                  Ambil foto
                </button>
                <button
                  type="button"
                  onClick={cancelCamera}
                  className="ds-btn ds-btn-secondary"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
