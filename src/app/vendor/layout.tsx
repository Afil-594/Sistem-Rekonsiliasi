import { AppRoleShell, type ShellNavItem } from "@/components/shell/AppRoleShell";

const navItems: ShellNavItem[] = [
  { href: "/vendor/purchase-orders", label: "Daftar PO", icon: "clipboardList", match: "prefix" },
  { href: "/vendor/shipments", label: "Shipment", icon: "truck", match: "prefix" },
];

export default function VendorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppRoleShell roleLabel="Vendor" items={navItems}>
      {children}
    </AppRoleShell>
  );
}
