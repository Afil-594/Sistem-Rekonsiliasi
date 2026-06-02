# Sistem Rekonsiliasi — Shipment Verification & QC Traceability System

Sistem Rekonsiliasi adalah aplikasi web internal yang digunakan untuk membantu proses verifikasi pengiriman dan penerimaan barang dari vendor ke warehouse PT Indonesia Epson Industry.

Sistem ini dirancang untuk memantau shipment, melakukan verifikasi kedatangan box, menjalankan proses QC, mencatat discrepancy/ketidaksesuaian, serta menyediakan jejak audit untuk mendukung proses rekonsiliasi operasional.

## Link Aplikasi

Demo/deployment aplikasi:

https://trackrecon.vercel.app/

## Deskripsi Singkat

Aplikasi ini berfungsi sebagai portal terpusat untuk memonitor proses pengiriman barang dari vendor sampai proses penerimaan dan pengecekan oleh pihak internal.

Alur utama sistem:

1. Vendor memilih data Purchase Order.
2. Vendor membuat shipment berdasarkan PO.
3. Vendor membuat data box dan final packing.
4. Vendor melakukan konfirmasi shipment.
5. Checker melakukan scan QR pada box yang datang.
6. Checker melakukan proses QC.
7. Jika ditemukan masalah, checker membuat discrepancy report.
8. Supervisor meninjau discrepancy dan menentukan tindak lanjut.
9. Superadmin dapat melihat data serta audit trail sistem.

## Fitur Utama

### Vendor

- Melihat data Purchase Order yang sesuai dengan vendor.
- Membuat shipment dari data PO.
- Membuat data box berdasarkan barang yang dikirim.
- Mengisi part number, quantity, dan lot number.
- Melakukan konfirmasi shipment.
- Mengunci data packing setelah shipment dikonfirmasi.

### Checker

- Melakukan verifikasi kedatangan box.
- Melakukan scan QR code pada box.
- Melakukan proses QC terhadap box/barang.
- Menandai box sebagai accepted atau rejected.
- Membuat catatan discrepancy jika ditemukan ketidaksesuaian.

### Supervisor

- Melihat daftar discrepancy.
- Melakukan review terhadap laporan discrepancy.
- Menentukan tindak lanjut terhadap barang bermasalah.
- Memberikan keputusan follow-up, seperti return.

### Superadmin

- Mengelola dan memantau data sistem.
- Melihat audit trail.
- Memiliki akses penuh terhadap data sistem.

## Role Pengguna

Sistem ini memiliki beberapa role utama:

| Role | Deskripsi |
|---|---|
| Vendor | Membuat shipment dan data box berdasarkan PO |
| Checker | Memverifikasi kedatangan barang dan melakukan QC |
| Supervisor | Meninjau discrepancy dan menentukan tindak lanjut |
| Superadmin | Mengelola data serta melihat audit trail |

## Teknologi yang Digunakan

Project ini dikembangkan menggunakan:

- Next.js
- TypeScript
- React
- Supabase
- Tailwind CSS
- QR Code
- HTML5 QR Code Scanner
- Vercel

## Struktur Folder

Struktur utama repository:

```txt
Sistem-Rekonsiliasi/
├── docs/
│   ├── database/
│   ├── ui-reference/
│   ├── code-structure.md
│   └── system-context.md
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── checker/
│   │   ├── login/
│   │   ├── superadmin/
│   │   ├── supervisor/
│   │   └── vendor/
│   ├── components/
│   ├── lib/
│   ├── styles/
│   ├── types/
│   └── middleware.ts
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
