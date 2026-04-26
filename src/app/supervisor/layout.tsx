import { AppRoleShell, type ShellNavItem } from "@/components/shell/AppRoleShell";

const navItems: ShellNavItem[] = [
  { href: "/supervisor", label: "Ringkasan", icon: "layoutDashboard", match: "exact" },
  { href: "/supervisor/review", label: "Review discrepancy", icon: "clipboardList", match: "prefix" },
  { href: "/supervisor/activities", label: "History shipment", icon: "activity", match: "exact" },
];

export default function SupervisorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppRoleShell roleLabel="Supervisor" items={navItems}>
      {children}
    </AppRoleShell>
  );
}
