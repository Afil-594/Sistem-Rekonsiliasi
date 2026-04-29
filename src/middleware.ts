import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isProtectedAppPath,
  ROLE_HOME,
  roleForProtectedPrefix,
} from "@/lib/auth/app-role-routes";
import type { Profile } from "@/types/profile";

/** Same rules as login page `safeRedirectPath`: internal path only. */
function loginNextParam(pathname: string, search: string): string {
  const full = `${pathname}${search || ""}`;
  if (!full.startsWith("/") || full.startsWith("//")) {
    return "/";
  }
  return full;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
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

  if (isProtectedAppPath(pathname) && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", loginNextParam(pathname, search));
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user && isProtectedAppPath(pathname)) {
    const requiredRole = roleForProtectedPrefix(pathname);
    if (!requiredRole) {
      return supabaseResponse;
    }

    const { data: row, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return supabaseResponse;
    }

    const actualRole = (row as { role: Profile["role"] } | null)?.role ?? null;

    if (actualRole === null) {
      const redirectResponse = NextResponse.redirect(new URL("/", request.url));
      copyCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }

    if (actualRole === requiredRole) {
      return supabaseResponse;
    }

    const destination = ROLE_HOME[actualRole] ?? "/";
    if (destination === pathname) {
      return supabaseResponse;
    }

    const redirectResponse = NextResponse.redirect(
      new URL(destination, request.url),
    );
    copyCookies(supabaseResponse, redirectResponse);
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
