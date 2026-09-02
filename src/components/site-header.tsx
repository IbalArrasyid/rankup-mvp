import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { BUSINESS } from "@/config/business";

export function SiteHeader() {
  return (
    <header className="border-b border-white/8 bg-[#090b13]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-white" aria-label={`${BUSINESS.brandName} beranda`}>
          <span className="grid size-8 place-items-center rounded-lg bg-amber-400 text-slate-950"><Gamepad2 size={18} /></span>
          <span>{BUSINESS.brandName}</span>
        </Link>
        <nav aria-label="Navigasi utama" className="flex items-center gap-4 text-sm font-medium text-slate-300">
          <Link href="/#kalkulator" className="hidden transition hover:text-white sm:block">Cek harga</Link>
          <Link href="/track" className="rounded-full border border-white/15 px-4 py-2 transition hover:border-amber-300 hover:text-amber-200">Lacak pesanan</Link>
        </nav>
      </div>
    </header>
  );
}
