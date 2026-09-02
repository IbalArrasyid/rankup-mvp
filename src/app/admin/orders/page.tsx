import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { type OrderStatus, type PaymentStatus } from "@/generated/prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { getOrderProgress } from "@/domain/order-progress";
import { getRankTierForStar } from "@/domain/rank";
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from "@/domain/status";
import { formatRupiah } from "@/lib/money";
import { getAdminOrders } from "@/server/admin/orders";
import { requireAdminSession } from "@/server/admin/session";

export const metadata: Metadata = { title: "Pesanan Admin", robots: { index: false, follow: false } };

type OrdersPageProps = { searchParams: Promise<{ page?: string; search?: string; status?: string; payment?: string }> };

function optionalString(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function asOrderStatus(value: string | undefined): OrderStatus | undefined {
  return value && value in ORDER_STATUS_META ? value as OrderStatus : undefined;
}

function asPaymentStatus(value: string | undefined): PaymentStatus | undefined {
  return value && value in PAYMENT_STATUS_META ? value as PaymentStatus : undefined;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatRank(star: number): string {
  return `${getRankTierForStar(star)?.label ?? "Rank"} ${star} ⭐`;
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  await requireAdminSession();
  const params = await searchParams;
  const filters = {
    page: Number(params.page) || 1,
    search: optionalString(params.search),
    status: asOrderStatus(params.status),
    paymentStatus: asPaymentStatus(params.payment),
  };
  const result = await getAdminOrders(filters);
  const hrefForPage = (page: number) => {
    const next = new URLSearchParams();
    if (filters.search) next.set("search", filters.search);
    if (filters.status) next.set("status", filters.status);
    if (filters.paymentStatus) next.set("payment", filters.paymentStatus);
    next.set("page", String(page));
    return `/admin/orders?${next.toString()}`;
  };

  return <AdminShell><div><p className="eyebrow">ORDER OPERATIONS</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Pesanan</h1><p className="mt-2 text-sm text-slate-400">Cari dan kelola pesanan pelanggan tanpa memuat data login.</p></div><form className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]"><label className="sr-only" htmlFor="search">Cari pesanan</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className="field-control pl-10" defaultValue={filters.search} id="search" name="search" placeholder="Order ID, nama, atau WhatsApp" /></div><select className="field-control" defaultValue={filters.status ?? ""} name="status"><option value="">Semua status</option>{Object.entries(ORDER_STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select><select className="field-control" defaultValue={filters.paymentStatus ?? ""} name="payment"><option value="">Semua pembayaran</option>{Object.entries(PAYMENT_STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select><button className="primary-button" type="submit">Terapkan</button></form><section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4"><p className="text-sm text-slate-400"><span className="font-medium text-white">{result.total}</span> pesanan ditemukan</p><p className="text-xs text-slate-500">Halaman {result.page} dari {result.totalPages}</p></div>{result.orders.length === 0 ? <p className="m-5 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Tidak ada pesanan yang sesuai.</p> : <div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-sm"><thead className="border-b border-white/10 bg-slate-950/25 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Order ID</th><th className="px-5 py-3 font-medium">Pelanggan</th><th className="px-5 py-3 font-medium">WhatsApp</th><th className="px-5 py-3 font-medium">Saat ini → target</th><th className="px-5 py-3 font-medium">Progress</th><th className="px-5 py-3 font-medium">Total</th><th className="px-5 py-3 font-medium">Pembayaran</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Dibuat</th></tr></thead><tbody>{result.orders.map((order) => { const progress = getOrderProgress(order.initialAbsoluteStar, order.progressAbsoluteStar, order.targetAbsoluteStar); const status = ORDER_STATUS_META[order.status]; const payment = PAYMENT_STATUS_META[order.paymentStatus]; return <tr className="border-b border-white/5 align-top last:border-0" key={order.publicId}><td className="px-5 py-4 font-mono text-xs text-amber-200"><Link className="hover:text-amber-100" href={`/admin/orders/${order.publicId}`}>{order.publicId}</Link></td><td className="px-5 py-4 text-slate-200">{order.customerName}</td><td className="px-5 py-4 font-mono text-xs text-slate-300">{order.whatsapp}</td><td className="px-5 py-4 text-xs leading-5 text-slate-300">{formatRank(order.initialAbsoluteStar)}<br />→ {formatRank(order.targetAbsoluteStar)}</td><td className="px-5 py-4"><div className="min-w-28"><div className="flex justify-between text-xs text-slate-400"><span>{progress.completedStars}/{progress.totalStars}</span><span>{progress.percent}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300" style={{ width: `${progress.percent}%` }} /></div></div></td><td className="px-5 py-4 font-medium text-white">{formatRupiah(order.total)}</td><td className="px-5 py-4"><span className={`status-badge status-${payment.tone}`}>{payment.label}</span></td><td className="px-5 py-4"><span className={`status-badge status-${status.tone}`}>{status.label}</span></td><td className="px-5 py-4 text-xs text-slate-400">{formatDate(order.createdAt)}</td></tr>; })}</tbody></table></div>}<div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-4"><Link aria-disabled={result.page <= 1} className={`secondary-button ${result.page <= 1 ? "pointer-events-none opacity-40" : ""}`} href={hrefForPage(Math.max(1, result.page - 1))}><ChevronLeft size={16} />Sebelumnya</Link><Link aria-disabled={result.page >= result.totalPages} className={`secondary-button ${result.page >= result.totalPages ? "pointer-events-none opacity-40" : ""}`} href={hrefForPage(Math.min(result.totalPages, result.page + 1))}>Berikutnya<ChevronRight size={16} /></Link></div></section></AdminShell>;
}
