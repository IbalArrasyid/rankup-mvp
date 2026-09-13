import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createJokiAction } from "@/app/admin/joki/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { JokiForm } from "@/components/admin/joki-form";
import { requireAdminSession } from "@/server/admin/session";

export const metadata: Metadata = { title: "Tambah Joki", robots: { index: false, follow: false } };

type NewJokiPageProps = { searchParams: Promise<{ error?: string }> };

export default async function NewJokiPage({ searchParams }: NewJokiPageProps) {
  await requireAdminSession();
  const { error } = await searchParams;
  return <AdminShell><Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white" href="/admin/joki"><ArrowLeft size={16} />Kembali ke joki</Link><section className="mt-6 max-w-3xl rounded-3xl border border-white/10 bg-[#121522] p-5 sm:p-7"><p className="eyebrow">TALENT PROFILE</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Tambah joki</h1><p className="mt-2 text-sm text-slate-400">Rank disimpan sebagai bintang absolut setelah divalidasi sesuai tier.</p>{error && <p role="alert" className="form-error mt-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3">{error}</p>}<div className="mt-7"><JokiForm action={createJokiAction} submitLabel="Simpan Joki" /></div></section></AdminShell>;
}
