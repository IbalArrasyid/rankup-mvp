import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, LockKeyhole, ReceiptText } from "lucide-react";
import { getOrderProgress } from "@/domain/order-progress";
import { getRankTierForStar } from "@/domain/rank";
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from "@/domain/status";
import { formatRupiah } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { hasOrderAccess } from "@/server/order-access";
import { getCustomerOrder } from "@/server/orders";

export const metadata: Metadata = { title: "Pesanan", robots: { index: false, follow: false } };

type OrderPageProps = { params: Promise<{ publicId: string }> };
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { publicId } = await params;
  if (!(await hasOrderAccess(publicId))) redirect("/track");
  const order = await getCustomerOrder(publicId);
  if (!order) notFound();

  const progress = getOrderProgress(order.initialAbsoluteStar, order.progressAbsoluteStar, order.targetAbsoluteStar);
  const status = ORDER_STATUS_META[order.status];
  const payment = PAYMENT_STATUS_META[order.paymentStatus];
  const currentTier = getRankTierForStar(order.progressAbsoluteStar);
  const targetTier = getRankTierForStar(order.targetAbsoluteStar);

  return <div className="min-h-screen bg-[#090b13] text-slate-100"><SiteHeader /><main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14"><Link href="/track" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft size={16}/> Lacak pesanan lain</Link><div className="mt-7 rounded-3xl border border-white/10 bg-[#121522] p-5 shadow-2xl shadow-black/20 sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="eyebrow">PESANAN KAMU</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{order.publicId}</h1><p className="mt-2 text-sm text-slate-400">Dibuat {formatDate(order.createdAt)}</p></div><div className="flex flex-wrap gap-2"><span className={`status-badge status-${status.tone}`}>{status.label}</span><span className={`status-badge status-${payment.tone}`}>{payment.label}</span></div></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="stat-card"><p>Progress</p><strong>{progress.completedStars} / {progress.totalStars}</strong><span>bintang selesai</span></div><div className="stat-card"><p>Saat ini</p><strong>{currentTier?.label}</strong><span>{order.progressAbsoluteStar} bintang</span></div><div className="stat-card"><p>Target</p><strong>{targetTier?.label}</strong><span>{order.targetAbsoluteStar} bintang</span></div></div>
        <div className="mt-4"><div className="flex justify-between text-sm text-slate-400"><span>Progress pengerjaan</span><span>{progress.percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progress.percent}%` }} /></div></div>
        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-950/40 p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-white">Pembayaran</h2><p className="mt-1 text-sm text-slate-400">Provider manual — instruksi pembayaran akan dikonfirmasi secara terpisah.</p></div><ReceiptText className="shrink-0 text-amber-300" /></div><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-sm text-slate-400">Total pesanan</span><strong className="text-xl text-amber-300">{formatRupiah(order.total)}</strong></div></section>
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-white">Data login</h2><p className="mt-1 text-sm text-slate-400">{order.credentials ? "Data login sudah diterima. Secret tidak ditampilkan kembali." : "Kirim data login setelah pesanan dibuat."}</p></div>{order.credentials ? <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300"><CheckCircle2 size={17}/> Diterima</span> : <Link href={`/order/${order.publicId}/credentials`} className="primary-button"> <LockKeyhole size={17}/> Isi Data Login</Link>}</div></section>
        <section className="mt-8"><h2 className="font-semibold text-white">Timeline</h2><ol className="mt-4 space-y-4 border-l border-white/10 pl-5">{order.events.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full border-2 border-[#121522] bg-amber-300"/><p className="text-sm text-slate-200">{event.publicMessage}</p><time className="mt-1 block text-xs text-slate-500">{formatDate(event.createdAt)}</time></li>)}</ol></section>
      </div></main></div>;
}
