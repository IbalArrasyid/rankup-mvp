import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, SearchCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { TrackForm } from "@/components/track-form";

export const metadata: Metadata = { title: "Lacak Pesanan", robots: { index: false, follow: false } };

export default function TrackPage() {
  return <div className="min-h-screen bg-[#090b13] text-slate-100"><SiteHeader /><main className="mx-auto max-w-lg px-5 py-10 sm:px-8 sm:py-16"><Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft size={16}/> Kembali ke beranda</Link><div className="mt-7 rounded-3xl border border-white/10 bg-[#121522] p-5 shadow-2xl shadow-black/20 sm:p-8"><span className="grid size-11 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><SearchCheck size={21}/></span><h1 className="mt-5 text-3xl font-bold tracking-tight text-white">Lacak pesanan</h1><p className="mt-3 text-sm leading-6 text-slate-400">Untuk menjaga privasi, masukkan nomor pesanan dan WhatsApp yang digunakan ketika memesan.</p><div className="mt-8"><TrackForm /></div></div></main></div>;
}
