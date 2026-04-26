import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfileById, listProfiles, insertProfile } from "@/lib/queries/profiles";
import { insertAuditLog } from "@/lib/queries/audit-logs";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/profile";

const VALID_ROLES: Profile["role"][] = ["vendor", "checker", "supervisor", "superadmin"];

async function requireSuperadminProfile(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; profile: Profile }
  | { ok: false; status: 401; message: string }
  | { ok: false; status: 403; message: string }
> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }
  if (!user) {
    return { ok: false, status: 401, message: "Silakan masuk terlebih dahulu." };
  }

  const { data: profile, error: profileError } = await getProfileById(
    supabase,
    user.id,
  );
  if (profileError) {
    throw profileError;
  }
  if (!profile || profile.role !== "superadmin") {
    return { ok: false, status: 403, message: "Hanya Superadmin yang dapat mengakses." };
  }

  return { ok: true, profile };
}

export async function listUsers(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; data: Profile[] }
  | { ok: false; status: 401 | 403; message: string }
> {
  const admin = await requireSuperadminProfile(supabase);
  if (!admin.ok) return admin;

  const { data, error } = await listProfiles(supabase);
  if (error) throw error;

  return { ok: true, data };
}

type CreateUserInput = {
  email: string;
  password: string;
  full_name: string;
  role: string;
  vendor_code?: string;
};

export async function createUser(
  supabase: SupabaseClient,
  input: CreateUserInput,
): Promise<
  | { ok: true; data: Profile }
  | { ok: false; status: 400 | 401 | 403 | 500; message: string }
> {
  const admin = await requireSuperadminProfile(supabase);
  if (!admin.ok) return admin;

  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const fullName = input.full_name.trim();
  const role = input.role as Profile["role"];
  const vendorCode = input.vendor_code?.trim() || null;

  if (!email) {
    return { ok: false, status: 400, message: "Email wajib diisi." };
  }
  if (!password || password.length < 6) {
    return {
      ok: false,
      status: 400,
      message: "Kata sandi minimal 6 karakter.",
    };
  }
  if (!fullName) {
    return { ok: false, status: 400, message: "Nama lengkap wajib diisi." };
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return { ok: false, status: 400, message: "Peran (role) tidak valid." };
  }
  if (role === "vendor" && !vendorCode) {
    return {
      ok: false,
      status: 400,
      message: "Vendor wajib memiliki vendor code.",
    };
  }

  const adminClient = createAdminClient();

  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return {
        ok: false,
        status: 400,
        message: "Email ini sudah terdaftar.",
      };
    }
    return { ok: false, status: 500, message: authError.message };
  }

  const userId = authData.user.id;

  const { data: profile, error: profileError } = await insertProfile(
    adminClient,
    {
      id: userId,
      full_name: fullName,
      role,
      vendor_code: role === "vendor" ? vendorCode : null,
    },
  );

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId);
    return { ok: false, status: 500, message: profileError.message };
  }

  await insertAuditLog(adminClient, {
    user_id: admin.profile.id,
    action: "create_user",
    target_table: "profiles",
    payload: {
      created_user_id: userId,
      email,
      full_name: fullName,
      role,
      vendor_code: role === "vendor" ? vendorCode : null,
      actor_name: admin.profile.full_name,
    },
  });

  return { ok: true, data: profile! };
}
