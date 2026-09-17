import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { loginAdminAction } from "@/app/admin/actions";
import { hasAdminSession } from "@/server/admin/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Login Admin", robots: { index: false, follow: false } };

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  if (await hasAdminSession()) redirect("/admin");
  const { error } = await searchParams;

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#090b13] px-5 py-10 text-slate-100"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(245,158,11,.16),transparent_33%)]" /><section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#121522]/95 p-6 shadow-2xl shadow-black/30 sm:p-8"><div className="grid size-12 place-items-center rounded-2xl bg-amber-400 text-slate-950"><LockKeyhole size={23} /></div><p className="eyebrow mt-6">RANKUP OPERATIONS</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Masuk admin</h1><p className="mt-3 text-sm leading-6 text-slate-400">Panel operasional internal. Akses hanya untuk pemilik yang berwenang.</p><form action={loginAdminAction} className="mt-8 space-y-5"><label className="form-label">Username<input className="field-control mt-2" autoComplete="username" name="username" required /></label><label className="form-label">Password<input className="field-control mt-2" autoComplete="current-password" name="password" required type="password" /></label>{error === "invalid" && <p role="alert" className="form-error rounded-xl border border-rose-400/25 bg-rose-400/10 p-3">Username atau password tidak valid.</p>}<button className="primary-button w-full" type="submit">Masuk ke Dashboard</button></form></section></main>;
}
