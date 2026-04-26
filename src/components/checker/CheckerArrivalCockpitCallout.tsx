import { PipelineTrack } from "@/components/ui/PipelineTrack";
import {
  CHECKER_PIPELINE_STEPS,
  checkerPipelineActiveIndex,
  type CheckerArrivalCounts,
} from "./CheckerArrivalStagePanel";

type CockpitMode = "scan" | "qc" | "issue" | "done";

type Props = {
  status: string | null;
  counts: CheckerArrivalCounts;
  mode: CockpitMode;
  /** Sisa box yang butuh aksi QC (status arrived) */
  needsQcCount: number;
  pendingCount: number;
};

function primaryActionLine(mode: CockpitMode, needsQcCount: number): string {
  switch (mode) {
    case "scan":
      return "Scan setiap box yang tiba, lalu tutup tahap di panel kanan (finalize) untuk rekonsiliasi dan QC.";
    case "qc":
      if (needsQcCount > 0) {
        return `${needsQcCount} box menunggu QC — gunakan aksi "Mulai QC" pada setiap baris prioritas.`;
      }
      return "Selesaikan QC untuk setiap box yang belum 'Diterima' atau 'Bermasalah' di tabel di bawah.";
    case "issue":
      return "Selisih tercatat. Supervisor menindaklanjuti; Anda dapat merujuk daftar di bawah untuk detail.";
    case "done":
      return "Tidak ada tindakan operasional lanjut pada layar ini.";
    default:
      return "";
  }
}

function readinessLine(
  mode: CockpitMode,
  counts: CheckerArrivalCounts,
  pendingCount: number,
): string | null {
  if (mode === "done" || mode === "issue") {
    return null;
  }
  if (mode === "scan") {
    const scanned = counts.total - pendingCount;
    if (pendingCount > 0) {
      return `Progres scan: ${scanned} / ${counts.total} box. ${pendingCount} belum di-scan.`;
    }
    return `Progres scan: ${scanned} / ${counts.total} box (semua kode tercatat).`;
  }
  /* qc */
  if (counts.arrived > 0) {
    return `Kesiapan: ${counts.arrived} box masih "Tiba" — perlu keputusan QC.`;
  }
  return "Semua box sudah lewat keputusan QC (diterima / bermasalah).";
}

/**
 * Hero strip for checker arrival: stage, pipeline, primary action, and quick counts.
 * Presentation only — all figures come from the parent (server) page.
 */
export function CheckerArrivalCockpitCallout({
  status,
  counts,
  mode,
  needsQcCount,
  pendingCount,
}: Props) {
  const active = checkerPipelineActiveIndex(status);
  const stepLabel = CHECKER_PIPELINE_STEPS[active]?.label ?? "Tahap";
  const action = primaryActionLine(mode, needsQcCount);
  const ready = readinessLine(mode, counts, pendingCount);

  const tone =
    mode === "done"
      ? "from-emerald-50/80 to-[var(--surface)]"
      : mode === "issue"
        ? "from-red-50/70 to-[var(--surface)]"
        : mode === "scan"
          ? "from-slate-50/90 to-[var(--surface)]"
          : "from-amber-50/60 to-[var(--surface)]";

  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-gradient-to-b ${tone} p-4 shadow-[var(--shadow-sm)] sm:p-5`}
      role="region"
      aria-label="Ringkasan tahap operasional"
    >
      <div
        className="absolute left-0 top-0 h-full w-1.5 bg-[var(--navy)]"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, var(--navy) 0%, var(--navy) 40%, var(--epson-yellow) 100%)",
        }}
      />
      <div className="relative pl-4 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
              {stepLabel} · tahap {active + 1} dari {CHECKER_PIPELINE_STEPS.length}
            </p>
            <p className="mt-1.5 text-sm font-semibold leading-snug text-[var(--text-primary)]">
              {action}
            </p>
            {ready ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {ready}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Alur ringkas
          </p>
          <PipelineTrack
            aria-label="Tahap alur checker"
            activeIndex={active}
            steps={CHECKER_PIPELINE_STEPS.map((s) => ({ id: s.id, label: s.label }))}
          />
        </div>

        <div
          className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-default)]/80 pt-3"
          aria-label="Hitung cepat box"
        >
          <span className="ds-summary-strip gap-1.5 border-0 bg-[var(--surface)]/90 py-1.5 pl-0 pr-2.5 text-[0.7rem] shadow-none">
            <span className="text-[var(--text-muted)]">Belum scan</span>
            <span className="ds-count-chip text-[0.7rem]">{counts.pending}</span>
          </span>
          <span className="ds-summary-strip gap-1.5 border-0 bg-[var(--surface)]/90 py-1.5 pl-0 pr-2.5 text-[0.7rem] shadow-none">
            <span className="text-[var(--text-muted)]">Menunggu QC</span>
            <span className="ds-count-chip text-amber-900 dark:text-amber-100 text-[0.7rem]">
              {counts.arrived}
            </span>
          </span>
          <span className="ds-summary-strip gap-1.5 border-0 bg-[var(--surface)]/90 py-1.5 pl-0 pr-2.5 text-[0.7rem] shadow-none">
            <span className="text-[var(--text-muted)]">Diterima</span>
            <span className="ds-count-chip text-emerald-900 dark:text-emerald-100 text-[0.7rem]">
              {counts.accepted}
            </span>
          </span>
          <span className="ds-summary-strip gap-1.5 border-0 bg-[var(--surface)]/90 py-1.5 pl-0 pr-2.5 text-[0.7rem] shadow-none">
            <span className="text-[var(--text-muted)]">Bermasalah</span>
            <span className="ds-count-chip text-red-900 dark:text-red-100 text-[0.7rem]">
              {counts.rejected}
            </span>
          </span>
          <span className="ds-summary-strip gap-1.5 border-0 bg-[var(--surface)]/90 py-1.5 pl-0 pr-2.5 text-[0.7rem] shadow-none">
            <span className="text-[var(--text-muted)]">Total</span>
            <span className="ds-count-chip font-semibold text-[0.7rem]">{counts.total}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
