"use client";

export function PrintAllLabelsButton() {
  return (
    <button
      type="button"
      className="ds-btn ds-btn-secondary"
      onClick={() => window.print()}
    >
      Cetak semua label
    </button>
  );
}
