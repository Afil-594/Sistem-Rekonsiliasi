import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Package, ScanLine } from "lucide-react";
import type { CheckerActivityItem } from "@/components/checker/checker-activity-items";

/** Filter pill: perlu tindakan vs selesai QC vs semua */
export type CheckerActivityFilterId = "all" | "needs_attention" | "done";

export function activityNeedsAttention(item: CheckerActivityItem): boolean {
  return item.action !== "qc_box_accepted";
}

export function matchesCheckerActivityFilter(
  item: CheckerActivityItem,
  f: CheckerActivityFilterId,
): boolean {
  if (f === "all") {
    return true;
  }
  if (f === "needs_attention") {
    return activityNeedsAttention(item);
  }
  return !activityNeedsAttention(item);
}

export type ActivityCardAccent = "success" | "attention";

export type ActivityCardPresentation = {
  accent: ActivityCardAccent;
  headerLabel: string;
  helperText: string;
  Icon: LucideIcon;
  showQcCta: boolean;
  detailLinkLabel: string;
};

/**
 * Label, helper copy, ikon,accent warna kartu, dan pola CTA untuk feed operasional.
 */
export function getActivityCardPresentation(
  item: CheckerActivityItem,
): ActivityCardPresentation {
  const a = item.action;
  if (a === "scan_box_arrival") {
    return {
      accent: "attention",
      headerLabel: "Scan tiba",
      helperText: "Selesai discan, menunggu proses QC.",
      Icon: ScanLine,
      showQcCta: true,
      detailLinkLabel: "Detail",
    };
  }
  if (a === "qc_box_rejected") {
    return {
      accent: "attention",
      headerLabel: "QC bermasalah",
      helperText: "QC bermasalah — tinjau selisih di shipment.",
      Icon: AlertCircle,
      showQcCta: true,
      detailLinkLabel: "Detail",
    };
  }
  if (a === "qc_box_accepted") {
    return {
      accent: "success",
      headerLabel: "QC sesuai",
      helperText: "QC sudah sesuai.",
      Icon: CheckCircle2,
      showQcCta: false,
      detailLinkLabel: "Lihat detail",
    };
  }
  return {
    accent: "attention",
    headerLabel: "Aktivitas",
    helperText: "Buka shipment untuk detail.",
    Icon: Package,
    showQcCta: false,
    detailLinkLabel: "Detail",
  };
}

/** URL halaman shipment checker; `qcBoxId` membuka dialog QC jika box masih menunggu QC. */
export function checkerShipmentHref(
  shipmentId: string | null | undefined,
  opts?: { qcBoxId?: string | null },
): string | null {
  if (!shipmentId?.trim()) {
    return null;
  }
  const base = `/checker/arrival/${shipmentId.trim()}`;
  const q = opts?.qcBoxId?.trim();
  if (q) {
    return `${base}?qcBox=${encodeURIComponent(q)}`;
  }
  return base;
}
