import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Verifikasi Shipment & QC",
  description: "Sistem verifikasi pengiriman dan penerimaan barang"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased selection:bg-[color-mix(in_srgb,#1a3050_14%,#ffffff_86%)] selection:text-[var(--text-primary)]`}
    >
      <body className="min-h-full min-w-0 flex flex-col font-sans antialiased text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
