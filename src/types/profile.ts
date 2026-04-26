/** Matches `public.profiles` in docs/database/schema.sql */
export type Profile = {
  id: string;
  full_name: string | null;
  role: "vendor" | "checker" | "supervisor" | "superadmin" | null;
  vendor_code: string | null;
  created_at: string | null;
};
