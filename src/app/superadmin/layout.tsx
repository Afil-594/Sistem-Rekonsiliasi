import { AppRoleShell, type ShellNavItem } from "@/components/shell/AppRoleShell";

const navItems: ShellNavItem[] = [
  { href: "/superadmin/users", label: "Pengguna", icon: "users", match: "prefix" },
  { href: "/superadmin/audit-trail", label: "Jejak audit", icon: "scrollText", match: "prefix" },
];

export default function SuperadminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppRoleShell roleLabel="Superadmin" items={navItems}>
      {children}
    </AppRoleShell>
  );
}
