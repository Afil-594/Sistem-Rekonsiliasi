/**
 * User-facing text for page loads and similar failures. Maps transport /
 * infrastructure error text (e.g. undici "fetch failed") to short Indonesian
 * copy; leaves normal business/validation messages unchanged.
 */

export type LoadFailureKind = "timeout" | "connection" | "fetch";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** True when the message looks like a network/transport problem, not app logic. */
function classifyInfrastructureKind(message: string): LoadFailureKind | null {
  const m = norm(message);

  if (
    m.includes("etimedout") ||
    m.includes("timed out") ||
    m.includes("timeout exceeded") ||
    m.includes("connect timeout") ||
    m.includes("connection timed out")
  ) {
    return "timeout";
  }
  if (
    m.includes("econnrefused") ||
    m.includes("econnreset") ||
    m.includes("enotfound") ||
    m.includes("enetunreach") ||
    m.includes("ehostunreach") ||
    m.includes("getaddrinfo eai_") ||
    m.includes("getaddrinfo") ||
    m.includes("socket hang up")
  ) {
    return "connection";
  }
  if (
    m === "fetch failed" ||
    m.includes("failed to fetch") ||
    m.includes("load failed") ||
    m.includes("networkerror when attempting to fetch") ||
    m.includes("network request failed") ||
    m.includes("und_err_") ||
    m.includes("other side closed") ||
    m.includes("fetch failed;") ||
    m.includes("typeerror: fetch")
  ) {
    return "fetch";
  }
  if (m.includes("fetch") && m.includes("fail")) {
    return "fetch";
  }
  return null;
}

function textForKind(kind: LoadFailureKind): {
  message: string;
  detailHint?: string;
} {
  switch (kind) {
    case "timeout":
      return {
        message: "Gagal memuat data. Permintaan memakan waktu terlalu lama.",
        detailHint: "Coba muat ulang, atau periksa koneksi bila masalah berlanjut.",
      };
    case "connection":
      return {
        message: "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.",
      };
    case "fetch":
    default:
      return {
        message: "Gagal memuat data. Periksa koneksi lalu coba lagi.",
      };
  }
}

function extractMessage(caught: unknown): string | null {
  if (typeof caught === "string") {
    return caught.trim() || null;
  }
  if (caught instanceof Error && typeof caught.message === "string") {
    return caught.message.trim() || null;
  }
  return null;
}

/**
 * Produces a message (and optional hint) for a thrown value from a load/catch
 * path. If the error looks like a transport failure, users see friendly
 * copy; otherwise the original message is kept.
 */
export function userFacingLoadError(
  caught: unknown,
  fallback: string
): { message: string; detailHint?: string } {
  const raw = extractMessage(caught);
  if (!raw) {
    return { message: fallback };
  }
  const kind = classifyInfrastructureKind(raw);
  if (kind) {
    return textForKind(kind);
  }
  return { message: raw };
}

/**
 * For API/service result errors (`!result.ok`) that might still be raw
 * transport strings. Business messages (e.g. "PO tidak ditemukan") are returned
 * unchanged.
 */
export function userFacingErrorText(technicalOrBusiness: string): {
  message: string;
  detailHint?: string;
} {
  const raw = technicalOrBusiness.trim();
  if (!raw) {
    return { message: "Terjadi kesalahan. Coba lagi." };
  }
  const kind = classifyInfrastructureKind(raw);
  if (kind) {
    return textForKind(kind);
  }
  return { message: raw };
}
