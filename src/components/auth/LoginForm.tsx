"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { replaceThenRefresh } from "@/lib/safeClientNavigation";

type Props = {
  redirectTo: string;
};

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid email or password")) {
    return "Email atau kata sandi salah.";
  }
  if (m.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Periksa kotak masuk Anda.";
  }
  return message;
}

/** Pragmatic check: local@domain.tld (bukan pengganti validasi server). */
function isValidEmailFormat(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function LoginForm({ redirectTo }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setEmailError("");
    setPasswordError("");
    setIsSubmitting(true);

    const trimmedEmail = email.trim();
    let hasFieldError = false;

    if (!trimmedEmail) {
      setEmailError("Masukkan email Anda.");
      hasFieldError = true;
    } else if (!isValidEmailFormat(trimmedEmail)) {
      setEmailError("Format email tidak valid. Contoh: nama@perusahaan.com");
      hasFieldError = true;
    }

    if (!password) {
      setPasswordError("Masukkan kata sandi Anda.");
      hasFieldError = true;
    }

    if (hasFieldError) {
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data: signData, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrorMessage(translateAuthError(error.message));
        return;
      }

      const userId = signData.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, vendor_code")
          .eq("id", userId)
          .maybeSingle();

        const code =
          typeof profile?.vendor_code === "string" ? profile.vendor_code.trim() : "";
        if (profile?.role === "vendor" && code !== "") {
          replaceThenRefresh(router, "/vendor/purchase-orders");
          return;
        }
        if (profile?.role === "checker") {
          replaceThenRefresh(router, "/checker/arrival");
          return;
        }
        if (profile?.role === "superadmin") {
          replaceThenRefresh(router, "/superadmin/audit-trail");
          return;
        }
        if (profile?.role === "supervisor") {
          replaceThenRefresh(router, "/supervisor");
          return;
        }
      }

      replaceThenRefresh(router, redirectTo);
    } catch {
      setErrorMessage("Gagal masuk. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const emailInvalid = Boolean(emailError || errorMessage);
  const passwordInvalid = Boolean(passwordError || errorMessage);
  const inputErrorClass =
    "border-[var(--danger)] shadow-[0_0_0_1px_var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]";

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="ds-form-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError("");
            setErrorMessage("");
          }}
          className={`ds-input ${emailInvalid ? inputErrorClass : ""}`}
          aria-invalid={emailInvalid}
          aria-describedby={emailError ? "login-email-error" : undefined}
        />
        {emailError ? (
          <p id="login-email-error" className="text-sm text-[var(--danger)]" role="status">
            {emailError}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="ds-form-label">
          Kata sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError("");
            setErrorMessage("");
          }}
          className={`ds-input ${passwordInvalid ? inputErrorClass : ""}`}
          aria-invalid={passwordInvalid}
          aria-describedby={passwordError ? "login-password-error" : undefined}
        />
        {passwordError ? (
          <p id="login-password-error" className="text-sm text-[var(--danger)]" role="status">
            {passwordError}
          </p>
        ) : null}
      </div>
      {errorMessage ? (
        <p className="ds-alert ds-alert-error" role="alert">
          {errorMessage}
        </p>
      ) : !emailError && !passwordError ? (
        <p className="ds-helptext -mt-1">
          Anda akan diarahkan ke halaman yang sesuai dengan peran Anda
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="ds-btn ds-btn-primary mt-0.5 inline-flex w-full items-center justify-center gap-2"
      >
        {isSubmitting ? (
          "Memproses…"
        ) : (
          <>
            <LogIn className="h-4 w-4 shrink-0" strokeWidth={2.1} aria-hidden />
            Masuk
          </>
        )}
      </button>
    </form>
  );
}
