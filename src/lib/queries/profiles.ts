import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/profile";

export async function getProfileById(
  supabase: SupabaseClient,
  profileId: string,
): Promise<{ data: Profile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, vendor_code, created_at")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: (data as Profile | null) ?? null, error: null };
}

export async function listProfiles(
  supabase: SupabaseClient,
): Promise<{ data: Profile[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, vendor_code, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: (data as Profile[]) ?? [], error: null };
}

export async function insertProfile(
  supabase: SupabaseClient,
  input: {
    id: string;
    full_name: string;
    role: Profile["role"];
    vendor_code: string | null;
  },
): Promise<{ data: Profile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: input.id,
      full_name: input.full_name,
      role: input.role,
      vendor_code: input.vendor_code,
    })
    .select("id, full_name, role, vendor_code, created_at")
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Profile, error: null };
}
