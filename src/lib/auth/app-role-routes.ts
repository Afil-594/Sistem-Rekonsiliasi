import type { Profile } from "@/types/profile";

export type AppRole = NonNullable<Profile["role"]>;

/** Default landing route after login and when redirecting away from another role's area. */
export const ROLE_HOME: Record<AppRole, string> = {
  vendor: "/vendor/purchase-orders",
  checker: "/checker/arrival",
  supervisor: "/supervisor",
  superadmin: "/superadmin/audit-trail",
};

/** Top-level app segments that require auth and match a single `profiles.role`. */
export const APP_ROUTE_PREFIXES = [
  "/vendor",
  "/checker",
  "/supervisor",
  "/superadmin",
] as const;

/** `/vendor/...` → `vendor`, etc. */
export function roleForProtectedPrefix(pathname: string): AppRole | null {
  for (const prefix of APP_ROUTE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return prefix.slice(1) as AppRole;
    }
  }
  return null;
}

export function isProtectedAppPath(pathname: string): boolean {
  return roleForProtectedPrefix(pathname) !== null;
}
