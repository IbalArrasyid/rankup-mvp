import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getRankTierForStar } from "@/domain/rank";
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from "@/domain/status";
import { formatRupiah } from "@/lib/money";
import { getAdminDashboard } from "@/server/admin/orders";
import { requireAdminSession } from "@/server/admin/session";

export const metadata: Metadata = { title: "Dashboard Admin", robots: { index: false, follow: false } };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function rankLabel(star: number): string {
  return `${getRankTierForStar(star)?.label ?? "Rank"} ${star} ⭐`;
}

export default async function AdminDashboardPage() {
  await requireAdminSession();
  const dashboard = await getAdminDashboard();
  const cards = [
    ["Total Pesanan", dashboard.total],
    ["Menunggu Pembayaran", dashboard.counts.AWAITING_PAYMENT],
    ["Pembayaran Diterima", dashboard.counts.PAID],
    ["Mencari Joki", dashboard.counts.WAITING_JOKI],
    ["Sedang Dikerjakan", dashboard.counts.IN_PROGRESS],
    ["QC", dashboard.counts.QC],
    ["Selesai", dashboard.counts.COMPLETED],
  ] as const;

  return <AdminShell><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">OPERATIONS OVERVIEW</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Dashboard</h1><p className="mt-2 text-sm text-slate-400">Ringkasan pesanan langsung dari database.</p></div><Link href="/admin/orders" className="secondary-button"><ClipboardList size={17} />Lihat semua pesanan</Link></div><section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <div className="stat-card" key={label}><p>{label}</p><strong className="text-2xl">{value}</strong><span>pesanan</span></div>)}</section><section className="mt-9 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-white">Pesanan terbaru</h2><p className="mt-1 text-sm text-slate-400">Delapan pesanan terbaru yang masuk.</p></div><Link href="/admin/orders" className="hidden items-center gap-2 text-sm font-medium text-amber-200 hover:text-amber-100 sm:inline-flex">Semua pesanan <ArrowRight size={16} /></Link></div>{dashboard.latestOrders.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Belum ada pesanan.</p> : <div className="mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3 pr-5 font-medium">Order ID</th><th className="pb-3 pr-5 font-medium">Pelanggan</th><th className="pb-3 pr-5 font-medium">Rank</th><th className="pb-3 pr-5 font-medium">Total</th><th className="pb-3 pr-5 font-medium">Pembayaran</th><th className="pb-3 pr-5 font-medium">Status</th><th className="pb-3 font-medium">Dibuat</th></tr></thead><tbody>{dashboard.latestOrders.map((order) => { const status = ORDER_STATUS_META[order.status]; const payment = PAYMENT_STATUS_META[order.paymentStatus]; return <tr className="border-b border-white/5 last:border-0" key={order.publicId}><td className="py-4 pr-5 font-mono text-xs text-amber-200"><Link className="hover:text-amber-100" href={`/admin/orders/${order.publicId}`}>{order.publicId}</Link></td><td className="py-4 pr-5 text-slate-200">{order.customerName}</td><td className="py-4 pr-5 text-slate-300">{rankLabel(order.initialAbsoluteStar)} → {rankLabel(order.targetAbsoluteStar)}</td><td className="py-4 pr-5 font-medium text-white">{formatRupiah(order.total)}</td><td className="py-4 pr-5"><span className={`status-badge status-${payment.tone}`}>{payment.label}</span></td><td className="py-4 pr-5"><span className={`status-badge status-${status.tone}`}>{status.label}</span></td><td className="py-4 text-xs text-slate-400">{formatDate(order.createdAt)}</td></tr>; })}</tbody></table></div>}</section></AdminShell>;
}
