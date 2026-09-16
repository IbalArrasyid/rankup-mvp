import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { logoutAdminAction } from "@/app/admin/actions";
import { BUSINESS } from "@/config/business";

export function AdminHeader() {
  return (
    <header className="border-b border-white/8 bg-[#090b13]/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Link href="/admin" className="flex items-center gap-2 font-bold tracking-tight text-white">
          <span className="grid size-8 place-items-center rounded-lg bg-amber-400 text-slate-950"><Gamepad2 size={18} /></span>
          <span>{BUSINESS.brandName} <span className="text-amber-300">Ops</span></span>
        </Link>
        <nav aria-label="Navigasi admin" className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-300">
          <Link href="/admin" className="rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white">Dashboard</Link>
          <Link href="/admin/orders" className="rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white">Pesanan</Link>
          <Link href="/admin/jobs" className="rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white">Jobs</Link>
          <Link href="/admin/joki" className="rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white">Joki</Link>
          <Link href="/" className="rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white">Situs Pelanggan</Link>
          <form action={logoutAdminAction}><button className="rounded-lg border border-white/15 px-3 py-2 text-slate-200 transition hover:border-rose-300 hover:text-rose-200" type="submit">Keluar</button></form>
        </nav>
      </div>
    </header>
  );
}
