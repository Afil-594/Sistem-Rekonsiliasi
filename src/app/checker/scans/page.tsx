import { redirect } from "next/navigation";

/** Halaman ini dialihkan — riwayat digabung ke feed aktivitas box. */
export default function CheckerScansRedirectPage() {
  redirect("/checker/activity");
}
