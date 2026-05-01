import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Radio,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DiscrepancyActivityPreview } from "@/components/supervisor/DiscrepancyActivityFeed";
import {
  RankedBarList,
  SupervisorDateTrendChart,
  SupervisorLayerDonut,
  SupervisorTypeDonut,
} from "@/components/supervisor/SupervisorDashboardVisuals";
import { getDashboardStats } from "@/lib/services/supervisor";
import type { DashboardStats } from "@/lib/services/supervisor";
import { SemicircleAnimatedMetric } from "@/components/supervisor/SemicircleGauge";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatMetricCard } from "@/components/ui/StatMetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TitledPanel } from "@/components/ui/TitledPanel";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? iso : value.toLocaleString();
}

function formatRatio(value: number | null, fractionDigits = 2): string {
  if (value === null) {
    return "—";
  }
  return value.toFixed(fractionDigits);
}

function ratioBarWidthPercent(value: number | null): number {
  if (value === null) {
    return 0;
  }
  return Math.min(100, Math.max(0, (value / 5) * 100));
}

const DISCREPANCY_PREVIEW_COUNT = 6;

function RecentShipmentsSection({
  shipments,
}: {
  shipments: DashboardStats["recentShipments"];
}) {
  if (shipments.length === 0) {
    return <p className="ds-muted py-2">Belum ada shipment.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {shipments.map((s) => (
        <li
          key={s.id}
          className="ds-list-row ds-list-row--h group justify-between gap-3 no-underline transition-shadow duration-200 hover:shadow-sm"
        >
          <div className="min-w-0">
            <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              {s.shipment_code}
            </span>
            <span className="ml-2 text-sm text-[var(--text-secondary)]">
              PO: {s.po_reference ?? "—"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge status={s.status} />
            <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">
              {formatWhen(s.created_at)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function SupervisorDashboardPage() {
  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof getDashboardStats>>;

  try {
    result = await getDashboardStats(supabase);
  } catch (e) {
    const { message, detailHint } = userFacingLoadError(e, "Gagal memuat ringkasan");
    return (
      <div className="ds-page-operational">
        <LoadErrorState message={message} detailHint={detailHint} />
      </div>
    );
  }

  if (!result.ok) {
    const { message, detailHint } = userFacingErrorText(result.message);
    return (
      <div className="ds-page-operational">
        <LoadErrorState message={message} detailHint={detailHint} />
      </div>
    );
  }

  const stats = result.data;
  const m = stats.monitoring;
  const twoWeekCount = m.byDate.reduce((s, d) => s + d.count, 0);

  return (
    <div className="ds-page-operational">
      <div className="ds-section-tint border-l-[3px] border-l-[var(--epson-yellow)]">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ds-section-label mb-1">Supervisor</p>
            <h1 className="ds-h1">Ringkasan operasional</h1>
            <p className="ds-lead max-w-2xl">
              Gambaran hasil shipment, agregat selisih, dan cuplikan aktivitas — diringkas untuk
              tinjauan cepat; detail feed dibuka di halaman khusus.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <Link
              className="ds-btn ds-btn-primary inline-flex shrink-0 items-center justify-center gap-2 shadow-sm"
              href="/supervisor/review"
            >
              <ClipboardList className="h-4 w-4" aria-hidden />
              Review discrepancy
            </Link>
            <Link
              className="ds-btn ds-btn-secondary inline-flex shrink-0 items-center justify-center gap-2"
              href="/supervisor/activities"
            >
              History shipment
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </header>
      </div>

      <section className="ds-section" aria-label="KPI operasional">
        <p className="ds-section-label">KPI utama</p>
        <div className="reveal-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatMetricCard
            label="Total shipment"
            value={stats.totalShipments}
            icon="package"
          />
          <StatMetricCard label="Total box" value={stats.totalBoxes} icon="boxes" />
          <StatMetricCard
            label="Selisih tercatat"
            value={stats.totalDiscrepancies}
            icon="barChart2"
          />
          <StatMetricCard
            label="Menunggu tinjauan supervisor"
            value={stats.issueShipments}
            tone="danger"
            icon="alertOctagon"
          />
          <StatMetricCard
            label="Shipment done bersih"
            value={stats.doneCleanShipments}
            tone="success"
            icon="checkCircle2"
          />
          <StatMetricCard
            label="Shipment done bermasalah"
            value={stats.doneProblemShipments}
            tone="neutral"
            icon="clipboardList"
          />
        </div>
      </section>

      <section className="ds-section-tint" aria-label="KPI rasio shipment selesai">
        <h2 className="ds-h2">Rasio shipment selesai</h2>
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          Hanya shipment berstatus <span className="font-mono">done</span> (alur gudang selesai).
          Dua porsi saling melengkapi: tanpa catatan selisih vs dengan selisih di{" "}
          <span className="font-mono">discrepancies</span>. Persentase memakai jumlah shipment{" "}
          <span className="font-mono">done</span> sebagai penyebut; jika belum ada yang{" "}
          <span className="font-mono">done</span>, tampil &quot;—&quot;.
        </p>
        <div className="reveal-stagger mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
            <div className="flex h-full min-h-0 min-w-0 flex-col items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)]/50 p-3">
              <SemicircleAnimatedMetric
                value={stats.kpis.shipmentDoneCleanRatePercent}
                variant="success"
                label="Porsi shipment done bersih"
                shortLabel="Porsi shipment done bersih"
              />
            </div>
            <div className="flex h-full min-h-0 min-w-0 flex-col items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)]/50 p-3">
              <SemicircleAnimatedMetric
                value={stats.kpis.shipmentDoneProblemRatePercent}
                variant="danger"
                label="Porsi shipment done bermasalah"
                shortLabel="Porsi shipment done bermasalah"
              />
            </div>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)]/50 p-3">
              <p className="shrink-0 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Rata-rata unit bermasalah
              </p>
              <div className="flex min-h-0 flex-1 items-center justify-center py-1">
                <p className="text-center text-[2rem] font-medium leading-tight tabular-nums text-[var(--text-primary)]">
                  {formatRatio(stats.kpis.avgProblemUnitsPerDoneShipment)}
                </p>
              </div>
              <p className="shrink-0 text-center text-xs text-[var(--text-muted)]">
                per shipment done dibagi semua shipment done
              </p>
              <div
                className="mt-3 h-1 w-full overflow-hidden rounded-full"
                style={{
                  background:
                    "color-mix(in srgb, var(--border-default) 55%, var(--surface) 45%)",
                }}
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-[var(--info)] transition-[width] duration-300 ease-out"
                  style={{
                    width: `${ratioBarWidthPercent(stats.kpis.avgProblemUnitsPerDoneShipment)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        title="Pemantauan selisih"
        lead="Agregat dari catatan selisih yang termuat di pemantauan. 14 hari terakhir memakai tanggal UTC; tren dan ringkatan membantu membedakan per lapisan, jenis, dan vendor."
        action={
          <div className="ds-summary-strip max-w-sm text-xs">
            <Radio className="h-3.5 w-3.5 text-[var(--navy)]" aria-hidden />
            <span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {twoWeekCount}
              </span>{" "}
              entri tercatat dalam 14 hari (UTC)
            </span>
          </div>
        }
      >
        <SupervisorDateTrendChart points={m.byDate} />

        <div className="grid gap-4 lg:grid-cols-2">
          <SupervisorLayerDonut
            items={m.byLayer.map((row) => ({
              key: row.key,
              label: row.label,
              count: row.count,
            }))}
          />
          <SupervisorTypeDonut
            items={m.byType.map((row) => ({
              key: row.key,
              label: row.label,
              count: row.count,
            }))}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="ds-subpanel min-h-0 p-0">
            <div className="border-b border-[var(--border-default)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Vendor teratas
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">Berdasarkan jumlah entri</p>
            </div>
            <div className="p-4">
              <RankedBarList
                emptyHint="Tidak ada data."
                rows={m.topVendors.map((row) => ({
                  id: row.vendorCode,
                  left: row.label,
                  right: row.vendorCode,
                  count: row.count,
                }))}
              />
            </div>
          </div>
          <div className="ds-subpanel min-h-0 p-0">
            <div className="border-b border-[var(--border-default)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Part paling sering
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">Dari box / teks pencatatan</p>
            </div>
            <div className="p-4">
              <RankedBarList
                emptyHint="Belum ada agregat per part."
                rows={m.topParts.map((row) => ({
                  id: row.partNumber,
                  left: row.partNumber,
                  right: "",
                  count: row.count,
                }))}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <TitledPanel className="lg:col-span-2" title="Harian (14 hari, UTC)">
            <p className="mb-2 text-xs text-[var(--text-muted)]">
              Tabel referensi; grafik tren ada di atas.
            </p>
            <div className="ds-table-embed max-h-52">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="ds-thead-embed">
                    <th className="px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Tanggal
                    </th>
                    <th className="px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Jumlah
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...m.byDate].reverse().map((row) => (
                    <tr key={row.date} className="ds-trow-embed">
                      <td className="px-2.5 py-1.5 font-mono text-xs text-[var(--text-primary)]">
                        {row.date}
                      </td>
                      <td className="px-2.5 py-1.5 font-mono text-xs tabular-nums text-[var(--text-primary)]">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TitledPanel>
          <div className="ds-subpanel flex flex-col justify-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Arah kerja</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Prioritaskan vendor dan part di peringkat atas, lalu cek tren 14 hari. Jika issue
              spike, buka modul <span className="font-mono">issue</span> di bawah.
            </p>
            <Link
              className="ds-btn ds-btn-secondary mt-1 inline-flex w-fit items-center gap-2 text-sm"
              href="/supervisor/review"
            >
              Buka antrian review
            </Link>
          </div>
        </div>
      </SectionCard>

      <section className="ds-section" aria-label="Issue terbaru">
        <div className="flex flex-col gap-1 border-b border-[var(--border-default)] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="ds-h2">Shipment issue terbaru</h2>
            <p className="ds-lead">
              Shipment berstatus <span className="ds-inline-code">issue</span> (menunggu tindak
              lanjut); kode diklik menuju review.
            </p>
          </div>
        </div>
        {m.recentIssueShipments.length === 0 ? (
          <p className="ds-empty mt-4">Tidak ada shipment berstatus issue.</p>
        ) : (
          <ul className="reveal-stagger mt-4 grid gap-3 sm:grid-cols-2">
            {m.recentIssueShipments.map(({ shipment, vendorLabel }) => (
              <li key={shipment.id}>
                <Link
                  className="group flex flex-col justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] no-underline transition-all duration-200 hover:border-[var(--border-hover)] hover:shadow-md"
                  href={`/supervisor/review/${shipment.id}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[#b91c1c]"
                      style={{
                        background: "color-mix(in srgb, var(--danger-muted) 55%, #ffffff 45%)",
                      }}
                    >
                      <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-base font-semibold text-[var(--navy)] group-hover:underline group-hover:decoration-[var(--border-hover)] group-hover:underline-offset-2">
                        {shipment.shipment_code}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        PO: {shipment.po_reference ?? "—"}
                      </p>
                      <p
                        className="mt-1 truncate text-sm text-[var(--text-secondary)]"
                        title={vendorLabel}
                      >
                        Vendor: {vendorLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--border-default)] pt-3 text-xs text-[var(--text-muted)]">
                    <span className="font-mono text-[0.7rem]">{formatWhen(shipment.created_at)}</span>
                    <span className="font-medium text-[var(--navy)]">Review →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ds-section border-t border-[var(--border-default)] pt-8">
        <h2 className="ds-h2">Shipment terbaru</h2>
        <p className="ds-lead">Semua status — urutan waktu tercatat.</p>
        <RecentShipmentsSection shipments={stats.recentShipments} />
      </section>

      <section className="ds-section border-t border-[var(--border-default)] pb-4 pt-8">
        <div className="flex flex-col gap-4 border-b border-[var(--border-default)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="ds-h2">History shipment</h2>
            <p className="ds-lead">
              {m.discrepancyFeed.length === 0
                ? "Belum ada entri dalam feed ringkasan saat ini."
                : `Cuplikan ${Math.min(DISCREPANCY_PREVIEW_COUNT, m.discrepancyFeed.length)} entri terbaru — tabel penuh dan ruang fokus ada di halaman aktivitas.`}
            </p>
          </div>
          <Link
            className="ds-btn ds-btn-secondary inline-flex shrink-0 items-center gap-2"
            href="/supervisor/activities"
          >
            Buka halaman History shipment
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-5">
          <DiscrepancyActivityPreview
            rows={m.discrepancyFeed}
            maxItems={DISCREPANCY_PREVIEW_COUNT}
          />
        </div>
        {m.discrepancyFeed.length > DISCREPANCY_PREVIEW_COUNT ? (
          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            +{m.discrepancyFeed.length - DISCREPANCY_PREVIEW_COUNT} entri lain di{" "}
            <Link
              className="font-medium text-[var(--navy)] underline decoration-[var(--border-hover)] underline-offset-2 hover:text-[var(--navy-hover)]"
              href="/supervisor/activities"
            >
              halaman History shipment
            </Link>
            .
          </p>
        ) : m.discrepancyFeed.length > 0 ? (
          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            Untuk tampilan tabel penuh dan ruang fokus, buka{" "}
            <Link
              className="font-medium text-[var(--navy)] underline decoration-[var(--border-hover)] underline-offset-2 hover:text-[var(--navy-hover)]"
              href="/supervisor/activities"
            >
              halaman History shipment
            </Link>
            .
          </p>
        ) : null}
      </section>
    </div>
  );
}
