import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDollarSign, Clock3, LockKeyhole, PencilLine, UserRoundCheck } from "lucide-react";
import { assignJokiAction, cancelJobAction, changeOrderStatusAction, markOrderPaidAction, publishJobAction, resendJobNotificationAction, unassignJokiAction, updateOrderProgressAction } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { CredentialReveal } from "@/components/admin/credential-reveal";
import { RANK_TIERS } from "@/config/business";
import { getAdminAssignmentUiState, shouldFetchEligibleJokis } from "@/domain/admin-assignment-ui";
import { JOKI_AVAILABILITY_META, JOKI_ROLE_META } from "@/domain/joki";
import { getOrderProgress } from "@/domain/order-progress";
import { getRankTierForStar } from "@/domain/rank";
import { getAllowedGenericOrderStatusTransitions } from "@/domain/status-transitions";
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from "@/domain/status";
import { formatRupiah } from "@/lib/money";
import { getEligibleJokis } from "@/server/admin/joki";
import { getEligibleTelegramJokis } from "@/server/jobs/job-pool";
import { getAdminOrder } from "@/server/admin/orders";
import { requireAdminSession } from "@/server/admin/session";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Detail Pesanan Admin", robots: { index: false, follow: false } };

type Props = { params: Promise<{ publicId: string }>; searchParams: Promise<{ notice?: string; error?: string }> };

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date) : "—";
}

function rankLabel(star: number): string {
  return `${getRankTierForStar(star)?.label ?? "Rank"} ${star} ⭐`;
}

function auditLabel(action: string): string {
  const labels: Record<string, string> = {
    PAYMENT_MARKED_PAID: "Pembayaran ditandai lunas",
    PAYMENT_MARKED_PAID_MANUALLY: "Pembayaran dikonfirmasi manual oleh admin",
    ORDER_STATUS_CHANGED: "Status pesanan diperbarui",
    ORDER_PROGRESS_UPDATED: "Progress pesanan diperbarui",
    CREDENTIAL_REVEALED: "Data login dibuka",
    JOKI_ASSIGNED: "Joki ditugaskan",
    JOKI_UNASSIGNED: "Penugasan joki dibatalkan",
  };
  return labels[action] ?? "Aktivitas admin";
}

export default async function AdminOrderDetailPage({ params, searchParams }: Props) {
  await requireAdminSession();
  const { publicId } = await params;
  const order = await getAdminOrder(publicId);
  if (!order) notFound();

  const { notice, error } = await searchParams;
  const latestAssignment = order.assignments[0];
  const activeAssignment = latestAssignment?.status === "ACTIVE" ? latestAssignment : null;
  const shouldLoadEligibleJokis = shouldFetchEligibleJokis(order.status, order.paymentStatus);
  const eligibleJokis = shouldLoadEligibleJokis ? await getEligibleJokis(order.targetAbsoluteStar, order.serviceMode) : [];
  const latestJobPosting = order.jobPostings[0];
  const eligibleTelegramJokis = order.status === "WAITING_JOKI" && latestJobPosting?.status === "OPEN"
    ? await getEligibleTelegramJokis(order.targetAbsoluteStar, order.serviceMode)
    : [];
  const assignmentUi = getAdminAssignmentUiState({
    status: order.status,
    paymentStatus: order.paymentStatus,
    eligibleJokiCount: eligibleJokis.length,
    hasActiveAssignment: Boolean(activeAssignment),
    hasCompletedAssignment: latestAssignment?.status === "COMPLETED",
  });

  if (process.env.NODE_ENV === "development") {
    console.info("Admin assignment UI diagnostics", {
      orderPublicId: order.publicId,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      eligibleJokiCount: eligibleJokis.length,
      hasActiveAssignment: Boolean(activeAssignment),
    });
  }

  const progress = getOrderProgress(order.initialAbsoluteStar, order.progressAbsoluteStar, order.targetAbsoluteStar);
  const allowedStatuses = getAllowedGenericOrderStatusTransitions({
    currentStatus: order.status,
    paymentStatus: order.paymentStatus,
    progressAbsoluteStar: order.progressAbsoluteStar,
    targetAbsoluteStar: order.targetAbsoluteStar,
    hasActiveAssignment: Boolean(activeAssignment),
  });
  const status = ORDER_STATUS_META[order.status];
  const payment = PAYMENT_STATUS_META[order.paymentStatus];
  const progressTier = getRankTierForStar(order.progressAbsoluteStar);
  const canUnassign = Boolean(activeAssignment) && (["ASSIGNED", "IN_PROGRESS", "PAUSED"] as readonly string[]).includes(order.status);

  return <AdminShell>
    <Link className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white" href="/admin/orders"><ArrowLeft size={16} />Kembali ke pesanan</Link>
    <div className="mt-6 flex flex-col justify-between gap-5 rounded-3xl border border-white/10 bg-[#121522] p-5 shadow-2xl shadow-black/20 sm:flex-row sm:items-start sm:p-7">
      <div><p className="eyebrow">ORDER OPERATIONS</p><h1 className="mt-2 font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">{order.publicId}</h1><p className="mt-2 text-sm text-slate-400">Dibuat {formatDate(order.createdAt)}</p></div>
      <div className="flex flex-wrap gap-2"><span className={`status-badge status-${payment.tone}`}>{payment.label}</span><span className={`status-badge status-${status.tone}`}>{status.label}</span></div>
    </div>
    {notice && <p className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p>}
    {error && <p role="alert" className="form-error mt-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3">{error}</p>}

    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.8fr)]"><div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="font-semibold text-white">Pelanggan</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wide text-slate-500">Nama</dt><dd className="mt-1 text-sm text-slate-100">{order.customerName}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">WhatsApp</dt><dd className="mt-1 font-mono text-sm text-slate-100">{order.whatsapp}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt><dd className="mt-1 text-sm text-slate-100">{order.email || "—"}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">Catatan pelanggan</dt><dd className="mt-1 text-sm leading-6 text-slate-100">{order.customerNotes || "—"}</dd></div></dl></section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-white">Rank & progress</h2><p className="mt-1 text-sm text-slate-400">{rankLabel(order.initialAbsoluteStar)} → {rankLabel(order.targetAbsoluteStar)}</p></div><span className="text-lg font-bold text-amber-300">{progress.percent}%</span></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="stat-card"><p>Bintang awal</p><strong>{order.initialAbsoluteStar}</strong><span>{getRankTierForStar(order.initialAbsoluteStar)?.label}</span></div><div className="stat-card"><p>Progress saat ini</p><strong>{order.progressAbsoluteStar}</strong><span>{progress.completedStars} dari {progress.totalStars} selesai</span></div><div className="stat-card"><p>Target</p><strong>{order.targetAbsoluteStar}</strong><span>{getRankTierForStar(order.targetAbsoluteStar)?.label}</span></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300" style={{ width: `${progress.percent}%` }} /></div>{order.progressAbsoluteStar === order.targetAbsoluteStar && <p className="mt-4 flex items-center gap-2 text-sm text-emerald-200"><CheckCircle2 size={16} />Target tercapai.{order.status === "IN_PROGRESS" && " Lanjut ke QC saat siap."}</p>}</section>

      {assignmentUi.showAssignmentSection && <section className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.05] p-5"><div className="flex items-center gap-2"><UserRoundCheck className="text-amber-300" size={19} /><div><h2 className="font-semibold text-white">Penugasan Joki</h2><p className="mt-1 text-sm text-slate-400">Hanya Joki aktif, tersedia, tanpa assignment aktif, dan dengan peak rank yang mencapai target order.</p></div></div>{assignmentUi.showAssignmentForm && <form action={assignJokiAction} className="mt-5"><input name="publicId" type="hidden" value={order.publicId} /><label className="form-label">Pilih Joki<select className="field-control mt-2" defaultValue="" name="jokiPublicId"><option disabled value="">Pilih Joki yang eligible</option>{eligibleJokis.map((joki) => <option key={joki.publicId} value={joki.publicId}>{joki.name} · {joki.publicId} · {rankLabel(joki.peakAbsoluteStar)} · {joki.roles.map((role) => JOKI_ROLE_META[role]).join(", ")} · {JOKI_AVAILABILITY_META[joki.availability].label}</option>)}</select></label><button className="primary-button mt-3" type="submit">Assign Joki</button></form>}{assignmentUi.showEmptyState && <div className="mt-5 rounded-xl border border-dashed border-white/15 p-4"><p className="text-sm font-medium text-slate-100">Belum ada Joki yang memenuhi syarat untuk order ini.</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400"><li>harus Active</li><li>harus Available</li><li>peak rank harus mencapai target order</li><li>tidak sedang memiliki assignment aktif</li></ul><Link className="secondary-button mt-4" href="/admin/joki">Kelola Joki</Link></div>}{assignmentUi.requiresPayment && <p className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">Pembayaran perlu dikonfirmasi sebelum Joki dapat ditugaskan.</p>}</section>}

      {order.status === "WAITING_JOKI" && <section className="rounded-2xl border border-violet-300/25 bg-violet-300/[0.05] p-5"><h2 className="font-semibold text-white">Job Pool</h2>{(!latestJobPosting || latestJobPosting.status === "CANCELLED") && <div className="mt-3"><p className="text-sm text-slate-400">{latestJobPosting ? `Job sebelumnya dibatalkan pada ${formatDate(latestJobPosting.cancelledAt)}.` : "Belum ada Job Pool terbuka untuk pesanan ini."}</p><form action={publishJobAction} className="mt-4"><input name="publicId" type="hidden" value={order.publicId} /><button className="primary-button" type="submit">Publish Job</button></form></div>}{latestJobPosting?.status === "OPEN" && <div className="mt-3"><p className="text-sm text-slate-200">Status: <span className="font-medium text-emerald-200">Open</span></p><p className="mt-1 text-sm text-slate-400">Dipublish: {formatDate(latestJobPosting.publishedAt)}</p><p className="mt-1 text-sm text-slate-400">Eligible linked Joki: {eligibleTelegramJokis.length}</p>{eligibleTelegramJokis.length === 0 && <p className="mt-3 text-sm text-amber-100">Job dipublish, tetapi belum ada Joki Telegram yang memenuhi syarat.</p>}<div className="mt-4 flex flex-wrap gap-3"><form action={resendJobNotificationAction}><input name="jobPublicId" type="hidden" value={latestJobPosting.publicId} /><input name="orderPublicId" type="hidden" value={order.publicId} /><button className="secondary-button" type="submit">Resend Notification</button></form><form action={cancelJobAction}><input name="jobPublicId" type="hidden" value={latestJobPosting.publicId} /><input name="orderPublicId" type="hidden" value={order.publicId} /><button className="secondary-button border-rose-300/35 text-rose-100 hover:border-rose-200" type="submit">Cancel Job</button></form></div></div>}{latestJobPosting?.status === "CLAIMED" && <div className="mt-3 text-sm text-slate-300"><p>Status: <span className="font-medium text-emerald-200">Claimed</span></p><p className="mt-1">Claimed oleh: {latestJobPosting.claimedByJoki?.name ?? "Joki"}</p><p className="mt-1 text-slate-400">Claimed: {formatDate(latestJobPosting.claimedAt)}</p></div>}</section>}

      {assignmentUi.mode === "paid" && <section className="rounded-2xl border border-blue-300/20 bg-blue-300/[0.04] p-5"><h2 className="font-semibold text-white">Penugasan Joki</h2><p className="mt-2 text-sm text-slate-300">Ubah status ke Mencari Joki terlebih dahulu.</p></section>}

      {assignmentUi.showActiveAssignment && activeAssignment && <section className="rounded-2xl border border-blue-300/20 bg-blue-300/[0.04] p-5"><h2 className="font-semibold text-white">Joki Ditugaskan</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-slate-500">Nama</p><p className="mt-1 text-sm text-slate-100">{activeAssignment.joki.name}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Joki ID</p><Link className="mt-1 inline-block font-mono text-sm text-amber-200 hover:text-amber-100" href={`/admin/joki/${activeAssignment.joki.publicId}`}>{activeAssignment.joki.publicId}</Link></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Peak</p><p className="mt-1 text-sm text-slate-100">{rankLabel(activeAssignment.joki.peakAbsoluteStar)}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Role</p><p className="mt-1 text-sm text-slate-100">{activeAssignment.joki.roles.map((role) => JOKI_ROLE_META[role]).join(", ")}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Ditugaskan</p><p className="mt-1 text-sm text-slate-100">{formatDate(activeAssignment.assignedAt)}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Mulai dikerjakan</p><p className="mt-1 text-sm text-slate-100">{formatDate(activeAssignment.startedAt)}</p></div></div>{canUnassign && <form action={unassignJokiAction} className="mt-5 border-t border-white/10 pt-5"><input name="publicId" type="hidden" value={order.publicId} /><label className="form-label">Catatan pembatalan <span className="text-slate-500">(internal, opsional)</span><textarea className="field-control mt-2 min-h-20" maxLength={1000} name="reason" /></label><button className="secondary-button mt-3 border-rose-300/35 text-rose-100 hover:border-rose-200" type="submit">Batalkan Penugasan</button></form>}</section>}

      {assignmentUi.mode === "active" && !activeAssignment && <section className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.04] p-5"><h2 className="font-semibold text-white">Penugasan Joki</h2><p className="mt-2 text-sm text-slate-300">Status pesanan membutuhkan penugasan Joki aktif, tetapi tidak ditemukan pada data ini.</p></section>}

      {assignmentUi.showCompletedAssignment && latestAssignment && <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-5"><h2 className="font-semibold text-white">Ringkasan Penugasan Selesai</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-slate-500">Joki</p><Link className="mt-1 inline-block text-sm text-amber-200 hover:text-amber-100" href={`/admin/joki/${latestAssignment.joki.publicId}`}>{latestAssignment.joki.name} · {latestAssignment.joki.publicId}</Link></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Peak & role</p><p className="mt-1 text-sm text-slate-100">{rankLabel(latestAssignment.joki.peakAbsoluteStar)} · {latestAssignment.joki.roles.map((role) => JOKI_ROLE_META[role]).join(", ")}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Ditugaskan</p><p className="mt-1 text-sm text-slate-100">{formatDate(latestAssignment.assignedAt)}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Selesai</p><p className="mt-1 text-sm text-slate-100">{formatDate(latestAssignment.endedAt)}</p></div></div></section>}

      {order.credentials ? <CredentialReveal publicId={order.publicId} /> : <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"><h2 className="flex items-center gap-2 font-semibold text-white"><LockKeyhole className="text-slate-400" size={17} />Data login: Belum tersedia</h2><p className="mt-1 text-sm text-slate-400">Pelanggan belum mengirim data login terenkripsi.</p></section>}
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="flex items-center gap-2 font-semibold text-white"><Clock3 size={18} className="text-amber-300" />Timeline pesanan</h2><ol className="mt-5 space-y-4 border-l border-white/10 pl-5">{order.events.map((event) => <li className="relative" key={event.id}><span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full border-2 border-[#121522] bg-amber-300" /><p className="text-sm text-slate-200">{event.publicMessage}</p><time className="mt-1 block text-xs text-slate-500">{formatDate(event.createdAt)}</time></li>)}</ol></section>
    </div><aside className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="flex items-center gap-2 font-semibold text-white"><CircleDollarSign className="text-amber-300" size={18} />Harga & pembayaran</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-400">Subtotal</dt><dd>{formatRupiah(order.subtotal)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-400">Diskon</dt><dd>{formatRupiah(order.discount)}</dd></div><div className="flex justify-between gap-4 border-t border-white/10 pt-3 font-semibold text-white"><dt>Total</dt><dd className="text-amber-300">{formatRupiah(order.total)}</dd></div></dl>{order.paymentStatus !== "PAID" ? <form action={markOrderPaidAction} className="mt-5"><input name="publicId" type="hidden" value={order.publicId} /><button className="primary-button w-full" type="submit">Konfirmasi Manual</button><p className="mt-2 text-xs text-slate-500">Emergency/support override; bukan konfirmasi otomatis DOKU.</p></form> : <p className="mt-5 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={17} />Pembayaran telah dikonfirmasi.</p>}</section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="font-semibold text-white">Payment Attempts</h2><p className="mt-1 text-sm text-slate-400">Status order: {order.paymentStatus}</p>{order.paymentAttempts.length === 0 ? <p className="mt-4 text-sm text-slate-500">Belum ada attempt DOKU.</p> : <ol className="mt-4 space-y-3">{order.paymentAttempts.map((attempt) => <li className="rounded-xl border border-white/10 bg-slate-950/35 p-3 text-xs text-slate-300" key={attempt.publicId}><p className="font-mono text-amber-200">{attempt.publicId}</p><p className="mt-1">{attempt.provider} · {attempt.method} · {attempt.status}</p><p>{formatRupiah(attempt.amount)} {attempt.currency}</p><p className="break-all">Referensi: {attempt.providerInvoiceNumber}</p><p>Dibuat: {formatDate(attempt.createdAt)}</p><p>Kedaluwarsa: {formatDate(attempt.expiresAt)}</p><p>Dibayar: {formatDate(attempt.paidAt)}</p></li>)}</ol>}</section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="flex items-center gap-2 font-semibold text-white"><PencilLine className="text-amber-300" size={17} />Aksi operasional</h2><form action={changeOrderStatusAction} className="mt-5"><input name="publicId" type="hidden" value={order.publicId} /><label className="form-label">Ubah status<select className="field-control mt-2" defaultValue="" disabled={allowedStatuses.length === 0} name="status"><option disabled value="">Pilih status berikutnya</option>{allowedStatuses.map((value) => <option key={value} value={value}>{ORDER_STATUS_META[value].label}</option>)}</select></label><button className="secondary-button mt-3 w-full" disabled={allowedStatuses.length === 0} type="submit">Simpan status</button></form><form action={updateOrderProgressAction} className="mt-6 border-t border-white/10 pt-5"><input name="publicId" type="hidden" value={order.publicId} /><label className="form-label">Current Rank<select className="field-control mt-2" defaultValue={progressTier?.key ?? ""} name="progressRank">{RANK_TIERS.map((tier) => <option key={tier.key} value={tier.key}>{tier.label}</option>)}</select></label><label className="form-label mt-4">Current Star<input className="field-control mt-2" defaultValue={order.progressAbsoluteStar} min={order.initialAbsoluteStar} name="progressStar" step="1" type="number" /></label><p className="mt-2 text-xs leading-5 text-slate-500">Rentang valid: {rankLabel(order.initialAbsoluteStar)} hingga {rankLabel(order.targetAbsoluteStar)}. Progress tidak dapat mundur.</p><button className="secondary-button mt-3 w-full" type="submit">Update Progress</button></form></section>
      {order.auditLogs.length > 0 && <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"><h2 className="font-semibold text-white">Aktivitas admin terbaru</h2><ol className="mt-4 space-y-3">{order.auditLogs.map((audit) => <li className="border-l border-white/10 pl-3" key={audit.id}><p className="text-sm text-slate-300">{auditLabel(audit.action)}</p><time className="mt-1 block text-xs text-slate-500">{formatDate(audit.createdAt)}</time></li>)}</ol></section>}
    </aside></div>
  </AdminShell>;
}
