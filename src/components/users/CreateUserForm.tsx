"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

const ROLES = ["vendor", "checker", "supervisor", "superadmin"] as const;

const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  vendor: "Vendor",
  checker: "Checker",
  supervisor: "Supervisor",
  superadmin: "Superadmin",
};

export function CreateUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>("checker");
  const [vendorCode, setVendorCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const showVendorCode = role === "vendor";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const body: Record<string, string> = {
        email,
        password,
        full_name: fullName,
        role,
      };
      if (showVendorCode) {
        body.vendor_code = vendorCode;
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as { data?: unknown; error?: string };

      if (!res.ok) {
        setErrorMessage(json.error ?? "Gagal membuat pengguna");
        return;
      }

      setSuccessMessage(`Pengguna "${fullName}" berhasil dibuat.`);
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("checker");
      setVendorCode("");
      router.refresh();
    } catch {
      setErrorMessage("Gagal membuat pengguna. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ds-section-card overflow-hidden">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="ds-section-card__header border-b border-[var(--border-default)] bg-[var(--section-bg)]/80">
          <div className="flex items-center gap-2">
            <UserPlus
              className="h-4 w-4 text-[var(--navy)]"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Formulir baru</p>
          </div>
        </div>
        <div className="ds-section-card__body gap-4">
          <div className="grid gap-4 sm:grid-cols-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cu-email" className="ds-form-label">
                  Email
                </label>
                <input
                  id="cu-email"
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ds-input"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cu-password" className="ds-form-label">
                  Kata sandi
                </label>
                <input
                  id="cu-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ds-input"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="cu-name" className="ds-form-label">
                  Nama lengkap
                </label>
                <input
                  id="cu-name"
                  type="text"
                  required
                  autoComplete="off"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="ds-input"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cu-role" className="ds-form-label">
                  Peran
                </label>
                <select
                  id="cu-role"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="ds-select"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              {showVendorCode && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cu-vendor" className="ds-form-label">
                    Vendor code
                  </label>
                  <input
                    id="cu-vendor"
                    type="text"
                    required
                    autoComplete="off"
                    value={vendorCode}
                    onChange={(e) => setVendorCode(e.target.value)}
                    className="ds-input font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <p className="ds-alert ds-alert-error" role="alert">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="ds-alert ds-alert-success" role="status">
              {successMessage}
            </p>
          )}

          <div className="border-t border-[var(--border-default)] pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn ds-btn-primary px-5"
            >
              {isSubmitting ? "Membuat…" : "Buat pengguna"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
