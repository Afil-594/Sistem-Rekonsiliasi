import { AppRoleShell, type ShellNavItem } from "@/components/shell/AppRoleShell";

const navItems: ShellNavItem[] = [
  {
    href: "/checker/arrival",
    label: "Verifikasi kedatangan",
    icon: "scanLine",
    match: "prefix",
  },
  {
    href: "/checker/activity",
    label: "Aktivitas box",
    icon: "activity",
    match: "exact",
  },
];

export default function CheckerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppRoleShell roleLabel="Kedatangan" items={navItems}>
      {children}
    </AppRoleShell>
  );
}
