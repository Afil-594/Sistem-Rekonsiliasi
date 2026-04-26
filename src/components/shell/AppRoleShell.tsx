"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  ScanLine,
  ScrollText,
  Truck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/client";

const SHELL_ICONS = {
  users: Users,
  scrollText: ScrollText,
  clipboardList: ClipboardList,
  truck: Truck,
  layoutDashboard: LayoutDashboard,
  scanLine: ScanLine,
  activity: Activity,
} as const;

const SIDEBAR_STORAGE_KEY = "keps-shell-sidebar-collapsed";
const SIDEBAR_EVENT = "keps-shell-sidebar-changed";

function getSidebarFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeSidebarStore(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === SIDEBAR_STORAGE_KEY || e.key === null) onChange();
  };
  const onLocal = () => onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(SIDEBAR_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SIDEBAR_EVENT, onLocal);
  };
}

function setSidebarCollapsedInStorage(next: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  } catch {
    /* ignore */
  }
}

export type ShellNavItem = {
  href: string;
  label: string;
  icon: keyof typeof SHELL_ICONS;
  match?: "exact" | "prefix";
};

type Props = {
  roleLabel: string;
  items: ShellNavItem[];
  children: React.ReactNode;
};

function getActiveItem(
  pathname: string,
  items: ShellNavItem[]
): ShellNavItem | null {
  const exact = items.find(
    (i) => (i.match ?? "prefix") === "exact" && pathname === i.href
  );
  if (exact) return exact;

  const byLength = [...items].sort((a, b) => b.href.length - a.href.length);
  for (const i of byLength) {
    if ((i.match ?? "prefix") === "exact") continue;
    if (pathname === i.href || pathname.startsWith(`${i.href}/`)) {
      return i;
    }
  }
  return null;
}

export function AppRoleShell({ roleLabel, items, children }: Props) {
  const pathname = usePathname() ?? "";
  const active = getActiveItem(pathname, items);
  const [userLabel, setUserLabel] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          if (!cancelled) setUserLabel("Pengguna");
          return;
        }
        let resolved = user.email ?? "Pengguna";
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.full_name?.trim()) {
          resolved = profile.full_name.trim();
        }
        if (!cancelled) setUserLabel(resolved);
      } catch {
        if (!cancelled) setUserLabel("Pengguna");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebarStore,
    getSidebarFromStorage,
    () => false
  );
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedInStorage(!getSidebarFromStorage());
  }, []);

  return (
    <div
      className="app-shell"
      data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"}
      suppressHydrationWarning
    >
      <div className="flex min-h-full min-w-0 flex-1 text-[var(--text-primary)]">
        {/* Mobile: topbar + horizontal nav — light rail */}
        <div className="fixed inset-x-0 top-0 z-30 print:hidden lg:hidden">
          <div className="flex h-12 items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--shell-surface)]/95 px-3 shadow-sm backdrop-blur-sm backdrop-saturate-150 sm:px-4">
            <div className="shell-topbar__user">
              <User
                className="shell-topbar__user-icon"
                strokeWidth={2}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="shell-topbar__user-name" title={userLabel}>
                  {userLabel || "…"}
                </p>
              </div>
            </div>
            <SignOutButton />
          </div>
          <div className="shell-nav-mobile__section border-b border-[var(--border-default)] bg-[var(--shell-surface)]/95 px-3 py-2 shadow-sm sm:px-4">
            <p className="shell-nav-mobile__section-title">{roleLabel}</p>
          </div>
          <nav
            className="shell-nav-mobile flex gap-1 overflow-x-auto border-b border-[var(--border-default)] bg-[var(--shell-surface)]/95 px-2 py-2 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Navigasi"
          >
            {items.map((item) => {
              const Icon = SHELL_ICONS[item.icon] as LucideIcon;
              const isActive = active === item;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shell-nav-item shrink-0 whitespace-nowrap ${
                    isActive ? "shell-nav-item--active" : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className="shell-nav-icon"
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <aside
          className="shell-sidebar fixed inset-y-0 left-0 z-20 hidden w-[var(--app-sidebar-w)] min-w-0 flex-col border-r pt-4 transition-[width] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] print:hidden lg:flex"
          aria-label="Navigasi samping"
        >
          <div
            className={`shell-sidebar__brand shell-sidebar__brand--user flex px-2.5 pb-4 ${
              sidebarCollapsed ? "flex-col items-center" : "items-start"
            }`}
          >
            {sidebarCollapsed ? (
              <div
                className="shell-sidebar__user-puck"
                title={userLabel}
                aria-label={userLabel ? `Pengguna: ${userLabel}` : "Pengguna"}
              >
                <User className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
            ) : (
              <div className="shell-sidebar__user pl-0.5">
                <User
                  className="shell-sidebar__user-icon--lg"
                  strokeWidth={2}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="shell-sidebar__user-name"
                    title={userLabel}
                  >
                    {userLabel || "…"}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div
            className={`shell-sidebar__nav-section px-2 pb-2 pt-0 ${
              sidebarCollapsed ? "hidden" : ""
            }`}
          >
            <p className="shell-sidebar__nav-title">{roleLabel}</p>
          </div>
          <nav
            className="flex flex-1 flex-col gap-0.5 px-2 py-2 pt-0"
            aria-label={
              sidebarCollapsed ? `Menu ${roleLabel}` : "Navigasi samping"
            }
          >
            {items.map((item) => {
              const Icon = SHELL_ICONS[item.icon] as LucideIcon;
              const isActive = active === item;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shell-nav-item ${
                    isActive ? "shell-nav-item--active" : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-label={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon
                    className="shell-nav-icon"
                    strokeWidth={isActive ? 2.1 : 1.75}
                  />
                  <span className="shell-nav-item__label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col">
            <div className="shell-sidebar__footer-tools px-2 py-1.5">
              <button
                type="button"
                onClick={toggleSidebar}
                className={
                  sidebarCollapsed
                    ? "shell-sidebar__footer-action shell-sidebar__footer-action--compact"
                    : "shell-sidebar__footer-action"
                }
                aria-expanded={!sidebarCollapsed}
                title={
                  sidebarCollapsed
                    ? "Buka kembali menu samping"
                    : "Sembunyikan menu samping"
                }
                aria-label={
                  sidebarCollapsed
                    ? "Buka kembali menu samping"
                    : "Sembunyikan menu samping (collapse panel navigasi)"
                }
              >
                {sidebarCollapsed ? (
                  <ChevronRight
                    className="h-4 w-4"
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>Sembunyikan menu</span>
                  </>
                )}
              </button>
            </div>
            <div
              className="border-t p-2"
              style={{ borderColor: "var(--shell-sidebar-border)" }}
            >
              <SignOutButton variant="shellDark" />
            </div>
          </div>
        </aside>

        <div className="flex min-h-full min-w-0 flex-1 flex-col pl-0 transition-[padding] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] print:pl-0 lg:pl-[var(--app-sidebar-w)]">
          <main
            className="min-h-full min-w-0 flex-1 bg-[var(--page-bg)] pt-[9rem] lg:pt-0 print:pt-0"
            id="main"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
