import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDollarSign, Clock3, LockKeyhole, PencilLine } from "lucide-react";
import {
  changeOrderStatusAction,
  markOrderPaidAction,
  updateOrderProgressAction,
} from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { CredentialReveal } from "@/components/admin/credential-reveal";
import { getOrderProgress } from "@/domain/order-progress";
import { getRankTierForStar } from "@/domain/rank";
import { canMoveOrderToStatus, getAllowedOrderStatusTransitions } from "@/domain/status-transitions";
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from "@/domain/status";
import { formatRupiah } from "@/lib/money";
import { getAdminOrder } from "@/server/admin/orders";
import { requireAdminSession } from "@/server/admin/session";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Detail Pesanan Admin", robots: { index: false, follow: false } };

type AdminOrderDetailProps = {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function rankLabel(star: number): string {
  return `${getRankTierForStar(star)?.label ?? "Rank"} ${star} ⭐`;
}

function auditLabel(action: string): string {
  const labels: Record<string, string> = {
    PAYMENT_MARKED_PAID: "Pembayaran ditandai lunas",
    ORDER_STATUS_CHANGED: "Status pesanan diperbarui",
    ORDER_PROGRESS_UPDATED: "Progress pesanan diperbarui",
    CREDENTIAL_REVEALED: "Data login dibuka",
  };
  return labels[action] ?? "Aktivitas admin";
}

export default async function AdminOrderDetailPage({ params, searchParams }: AdminOrderDetailProps) {
  await requireAdminSession();
  const { publicId } = await params;
  const order = await getAdminOrder(publicId);
  if (!order) notFound();
  const { notice, error } = await searchParams;
  const progress = getOrderProgress(order.initialAbsoluteStar, order.progressAbsoluteStar, order.targetAbsoluteStar);
  const allowedStatuses = getAllowedOrderStatusTransitions(order.status).filter((nextStatus) =>
    canMoveOrderToStatus(order.status, order.paymentStatus, nextStatus),
  );
  const status = ORDER_STATUS_META[order.status];
  const payment = PAYMENT_STATUS_META[order.paymentStatus];

  return <AdminShell><Link className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white" href="/admin/orders"><ArrowLeft size={16} />Kembali ke pesanan</Link><div className="mt-6 flex flex-col justify-between gap-5 rounded-3xl border border-white/10 bg-[#121522] p-5 shadow-2xl shadow-black/20 sm:flex-row sm:items-start sm:p-7"><div><p className="eyebrow">ORDER OPERATIONS</p><h1 className="mt-2 font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">{order.publicId}</h1><p className="mt-2 text-sm text-slate-400">Dibuat {formatDate(order.createdAt)}</p></div><div className="flex flex-wrap gap-2"><span className={`status-badge status-${payment.tone}`}>{payment.label}</span><span className={`status-badge status-${status.tone}`}>{status.label}</span></div></div>{notice && <p className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p>}{error && <p role="alert" className="form-error mt-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3">{error}</p>}<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.8fr)]"><div className="space-y-6"><section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="font-semibold text-white">Pelanggan</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wide text-slate-500">Nama</dt><dd className="mt-1 text-sm text-slate-100">{order.customerName}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">WhatsApp</dt><dd className="mt-1 font-mono text-sm text-slate-100">{order.whatsapp}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt><dd className="mt-1 text-sm text-slate-100">{order.email || "—"}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">Catatan pelanggan</dt><dd className="mt-1 text-sm leading-6 text-slate-100">{order.customerNotes || "—"}</dd></div></dl></section><section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-white">Rank & progress</h2><p className="mt-1 text-sm text-slate-400">{rankLabel(order.initialAbsoluteStar)} → {rankLabel(order.targetAbsoluteStar)}</p></div><span className="text-lg font-bold text-amber-300">{progress.percent}%</span></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="stat-card"><p>Bintang awal</p><strong>{order.initialAbsoluteStar}</strong><span>{getRankTierForStar(order.initialAbsoluteStar)?.label}</span></div><div className="stat-card"><p>Progress saat ini</p><strong>{order.progressAbsoluteStar}</strong><span>{progress.completedStars} dari {progress.totalStars} selesai</span></div><div className="stat-card"><p>Target</p><strong>{order.targetAbsoluteStar}</strong><span>{getRankTierForStar(order.targetAbsoluteStar)?.label}</span></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300" style={{ width: `${progress.percent}%` }} /></div>{order.progressAbsoluteStar === order.targetAbsoluteStar && order.status === "IN_PROGRESS" && <p className="mt-4 flex items-center gap-2 text-sm text-amber-200"><CheckCircle2 size={16} />Target tercapai — lanjut ke QC.</p>}</section>{order.credentials ? <CredentialReveal publicId={order.publicId} /> : <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"><h2 className="flex items-center gap-2 font-semibold text-white"><LockKeyhole className="text-slate-400" size={17} />Data login: Belum tersedia</h2><p className="mt-1 text-sm text-slate-400">Pelanggan belum mengirim data login terenkripsi.</p></section>}<section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="flex items-center gap-2 font-semibold text-white"><Clock3 size={18} className="text-amber-300" />Timeline pesanan</h2><ol className="mt-5 space-y-4 border-l border-white/10 pl-5">{order.events.map((event) => <li className="relative" key={event.id}><span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full border-2 border-[#121522] bg-amber-300" /><p className="text-sm text-slate-200">{event.publicMessage}</p><time className="mt-1 block text-xs text-slate-500">{formatDate(event.createdAt)}</time></li>)}</ol></section></div><aside className="space-y-6"><section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="flex items-center gap-2 font-semibold text-white"><CircleDollarSign className="text-amber-300" size={18} />Harga & pembayaran</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-400">Subtotal</dt><dd>{formatRupiah(order.subtotal)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-400">Diskon</dt><dd>{formatRupiah(order.discount)}</dd></div><div className="flex justify-between gap-4 border-t border-white/10 pt-3 font-semibold text-white"><dt>Total</dt><dd className="text-amber-300">{formatRupiah(order.total)}</dd></div></dl>{order.paymentStatus !== "PAID" ? <form action={markOrderPaidAction} className="mt-5"><input name="publicId" type="hidden" value={order.publicId} /><button className="primary-button w-full" type="submit">Tandai Sudah Dibayar</button></form> : <p className="mt-5 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={17} />Pembayaran telah dikonfirmasi.</p>}</section><section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="flex items-center gap-2 font-semibold text-white"><PencilLine className="text-amber-300" size={17} />Aksi operasional</h2><form action={changeOrderStatusAction} className="mt-5"><input name="publicId" type="hidden" value={order.publicId} /><label className="form-label">Ubah status<select className="field-control mt-2" defaultValue="" disabled={allowedStatuses.length === 0} name="status"><option disabled value="">Pilih status berikutnya</option>{allowedStatuses.map((value) => <option key={value} value={value}>{ORDER_STATUS_META[value].label}</option>)}</select></label><button className="secondary-button mt-3 w-full" disabled={allowedStatuses.length === 0} type="submit">Simpan status</button></form><form action={updateOrderProgressAction} className="mt-6 border-t border-white/10 pt-5"><input name="publicId" type="hidden" value={order.publicId} /><label className="form-label">Update Progress <span className="font-normal text-slate-500">(bintang absolut)</span><input className="field-control mt-2" defaultValue={order.progressAbsoluteStar} max={order.targetAbsoluteStar} min={order.initialAbsoluteStar} name="progressAbsoluteStar" step="1" type="number" /></label><p className="mt-2 text-xs leading-5 text-slate-500">Rentang valid: {order.initialAbsoluteStar}–{order.targetAbsoluteStar}. Progress tidak dapat mundur.</p><button className="secondary-button mt-3 w-full" type="submit">Update Progress</button></form></section>{order.auditLogs.length > 0 && <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"><h2 className="font-semibold text-white">Aktivitas admin terbaru</h2><ol className="mt-4 space-y-3">{order.auditLogs.map((audit) => <li className="border-l border-white/10 pl-3" key={audit.id}><p className="text-sm text-slate-300">{auditLabel(audit.action)}</p><time className="mt-1 block text-xs text-slate-500">{formatDate(audit.createdAt)}</time></li>)}</ol></section>}</aside></div></AdminShell>;
}
