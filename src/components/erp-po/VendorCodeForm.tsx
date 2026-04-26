"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialVendorCode: string;
};

export function VendorCodeForm({ initialVendorCode }: Props) {
  const router = useRouter();
  const formId = useId();
  const [codeInput, setCodeInput] = useState(initialVendorCode);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = codeInput.trim();
        if (!v) {
          return;
        }
        router.push(`/vendor/purchase-orders?vendor_code=${encodeURIComponent(v)}`);
      }}
      className="ds-section-tint flex flex-wrap items-end gap-3 sm:gap-4"
      aria-label="Vendor code"
    >
      <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5 sm:min-w-[200px]">
        <label htmlFor={formId} className="ds-form-label">
          Vendor code
        </label>
        <input
          id={formId}
          className="ds-input"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder="e.g. V001"
          autoComplete="off"
        />
      </div>
      <button type="submit" className="ds-btn ds-btn-primary">
        Muat daftar
      </button>
    </form>
  );
}
