import { UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateUserForm } from "@/components/users/CreateUserForm";
import { UserRoleBadge } from "@/components/users/UserRoleBadge";
import { listUsers } from "@/lib/services/user-management";
import { userFacingErrorText, userFacingLoadError } from "@/lib/utils/load-failure";
import { LoadErrorState } from "@/components/ui/LoadErrorState";
import type { Profile } from "@/types/profile";

function formatTimestamp(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function UserRow({ user }: { user: Profile }) {
  return (
    <tr className="ds-trow ds-trow--interactive">
      <td className="ds-tcell pl-4 text-[var(--text-primary)]">
        <span className="font-medium">{user.full_name ?? "—"}</span>
      </td>
      <td className="ds-tcell">
        <UserRoleBadge role={user.role} />
      </td>
      <td className="ds-tcell">
        <span
          className="inline-block rounded-md border border-[var(--border-default)] bg-[var(--surface-elevated)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]"
          title="Vendor code"
        >
          {user.vendor_code ?? "—"}
        </span>
      </td>
      <td className="ds-tcell pr-4 text-xs text-[var(--text-muted)]">
        {formatTimestamp(user.created_at)}
      </td>
    </tr>
  );
}

export default async function UsersPage() {
  const supabase = await createClient();

  const result = await listUsers(supabase).catch((e: unknown) => {
    const { message, detailHint } = userFacingLoadError(
      e,
      "Gagal memuat daftar pengguna",
    );
    return {
      ok: false as const,
      status: 500 as const,
      message,
      detailHint,
    };
  });

  if (!result.ok) {
    if (result.status === 500) {
      const r = result as { message: string; detailHint?: string };
      return (
        <div className="ds-page-operational">
          <LoadErrorState message={r.message} detailHint={r.detailHint} />
        </div>
      );
    }
    const { message, detailHint } = userFacingErrorText(result.message);
    return (
      <div className="ds-page-operational">
        <LoadErrorState message={message} detailHint={detailHint} />
      </div>
    );
  }

  const users = result.data;
  const roleCount = (role: string) => users.filter((u) => u.role === role).length;

  return (
    <div className="ds-page-operational">
      <div className="ds-section-tint border-l-[3px] border-l-[var(--epson-yellow)]">
        <p className="ds-section-label mb-1">Superadmin</p>
        <h1 className="ds-h1">Pengelolaan pengguna</h1>
        <p className="ds-lead max-w-2xl">
          Buat akun, tetapkan peran, dan pantau kode vendor dari satu tampilan panel.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="ds-summary-strip border-[var(--border-default)]">
            <Users className="h-4 w-4 text-[var(--navy)]" aria-hidden />
            <span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {users.length}
              </span>{" "}
              akun
            </span>
          </span>
          <span className="ds-count-chip" title="Superadmin">
            SA {roleCount("superadmin")}
          </span>
          <span className="ds-count-chip" title="Supervisor">
            SV {roleCount("supervisor")}
          </span>
          <span className="ds-count-chip" title="Checker">
            CH {roleCount("checker")}
          </span>
          <span className="ds-count-chip" title="Vendor">
            VN {roleCount("vendor")}
          </span>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-5 xl:items-start">
        <div className="xl:col-span-2">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--navy-muted)] text-[var(--navy)]">
              <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Buat pengguna</h2>
          </div>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Kata sandi minimal 6 karakter. Untuk vendor, kode wajib diisi.
          </p>
          <CreateUserForm />
        </div>

        <div className="min-w-0 xl:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--border-default)] pb-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Daftar pengguna</h2>
            <span className="text-xs text-[var(--text-muted)]">Diurutkan oleh layanan (server)</span>
          </div>
          {users.length === 0 ? (
            <p className="ds-empty">Tidak ada pengguna.</p>
          ) : (
            <div className="ds-table-wrap">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="ds-thead">
                    <th className="ds-tcell pl-4">Nama</th>
                    <th className="ds-tcell">Peran</th>
                    <th className="ds-tcell">Vendor code</th>
                    <th className="ds-tcell pr-4">Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
