import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Role app routes: direct URL access without a session redirects to login. */
const PROTECTED_PREFIXES = [
  "/vendor",
  "/checker",
  "/supervisor",
  "/superadmin",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Same rules as login page `safeRedirectPath`: internal path only. */
function loginNextParam(pathname: string, search: string): string {
  const full = `${pathname}${search || ""}`;
  if (!full.startsWith("/") || full.startsWith("//")) {
    return "/";
  }
  return full;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  if (isProtectedPath(pathname) && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", loginNextParam(pathname, search));
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and image optimization.
     * See https://supabase.com/docs/guides/auth/server-side/nextjs
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
