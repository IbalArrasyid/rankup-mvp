import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Send, UserRound } from "lucide-react";
import { unlinkJokiTelegramAction, updateJokiAction } from "@/app/admin/joki/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { JokiForm } from "@/components/admin/joki-form";
import { TelegramLinkControl } from "@/components/admin/telegram-link-control";
import { JOKI_AVAILABILITY_META, JOKI_ROLE_META, JOKI_STATUS_META } from "@/domain/joki";
import { getRankTierForStar } from "@/domain/rank";
import { formatServiceModeCapabilities, SERVICE_MODE_META } from "@/domain/service-mode";
import { getAdminJoki } from "@/server/admin/joki";
import { requireAdminSession } from "@/server/admin/session";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Detail Joki", robots: { index: false, follow: false } };
type Props = { params: Promise<{ publicId: string }>; searchParams: Promise<{ notice?: string; error?: string }> };

function dateLabel(date: Date | null): string {
  return date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date) : "—";
}

function rankLabel(star: number | null): string {
  return star === null ? "Belum diisi" : `${getRankTierForStar(star)?.label ?? "Rank"} ${star} ⭐`;
}

export default async function AdminJokiDetailPage({ params, searchParams }: Props) {
  await requireAdminSession();
  const { publicId } = await params;
  const joki = await getAdminJoki(publicId);
  if (!joki) notFound();
  const { notice, error } = await searchParams;
  const active = joki.assignments.find((assignment) => assignment.status === "ACTIVE");
  const status = JOKI_STATUS_META[joki.status];
  const availability = JOKI_AVAILABILITY_META[joki.availability];

  return <AdminShell>
    <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white" href="/admin/joki"><ArrowLeft size={16} />Kembali ke joki</Link>
    <div className="mt-6 flex flex-col justify-between gap-5 rounded-3xl border border-white/10 bg-[#121522] p-5 sm:flex-row sm:items-start sm:p-7"><div><p className="eyebrow">JOKI PROFILE</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{joki.name}</h1><p className="mt-2 font-mono text-sm text-amber-200">{joki.publicId}</p></div><div className="flex gap-2"><span className={`status-badge status-${status.tone}`}>{status.label}</span><span className={`status-badge status-${availability.tone}`}>{availability.label}</span></div></div>
    {notice && <p className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p>}
    {error && <p role="alert" className="form-error mt-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3">{error}</p>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]"><div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2"><UserRound className="text-amber-300" size={18} /><h2 className="font-semibold text-white">Profil operasional</h2></div><dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wide text-slate-500">WhatsApp</dt><dd className="mt-1 font-mono text-sm text-slate-100">{joki.whatsapp}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">Username Telegram</dt><dd className="mt-1 text-sm text-slate-100">{joki.telegramUsername ? `@${joki.telegramUsername}` : "—"}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">Peak</dt><dd className="mt-1 text-sm text-slate-100">{rankLabel(joki.peakAbsoluteStar)}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">Rank saat ini</dt><dd className="mt-1 text-sm text-slate-100">{rankLabel(joki.currentAbsoluteStar)}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">Jenis layanan</dt><dd className="mt-1 text-sm text-slate-100">{formatServiceModeCapabilities(joki.serviceModes)}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt><dd className="mt-1 text-sm text-slate-100">{joki.roles.map((role) => JOKI_ROLE_META[role]).join(", ")}</dd></div><div><dt className="text-xs uppercase tracking-wide text-slate-500">Hero pool</dt><dd className="mt-1 text-sm text-slate-100">{joki.heroPool.length ? joki.heroPool.join(", ") : "—"}</dd></div></dl></section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2"><BriefcaseBusiness className="text-amber-300" size={18} /><h2 className="font-semibold text-white">Riwayat penugasan</h2></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="stat-card"><p>Total</p><strong>{joki.assignmentCounts.total}</strong></div><div className="stat-card"><p>Selesai</p><strong>{joki.assignmentCounts.completed}</strong></div><div className="stat-card"><p>Dibatalkan</p><strong>{joki.assignmentCounts.cancelled}</strong></div></div>{joki.assignments.length === 0 ? <p className="mt-5 text-sm text-slate-400">Belum ada riwayat penugasan.</p> : <ol className="mt-5 space-y-3">{joki.assignments.map((assignment) => <li className="rounded-xl border border-white/10 bg-slate-950/35 p-3" key={assignment.id}><div className="flex justify-between gap-2"><Link className="font-mono text-sm text-amber-200 hover:text-amber-100" href={`/admin/orders/${assignment.order.publicId}`}>{assignment.order.publicId}</Link><span className="text-xs text-slate-400">{assignment.status}</span></div><p className="mt-1 text-xs text-slate-400">{SERVICE_MODE_META[assignment.order.serviceMode].shortLabel} · {rankLabel(assignment.order.initialAbsoluteStar)} → {rankLabel(assignment.order.targetAbsoluteStar)} · ditugaskan {dateLabel(assignment.assignedAt)}</p></li>)}</ol>}</section>
    </div><aside className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"><h2 className="font-semibold text-white">Penugasan saat ini</h2>{active ? <div className="mt-4"><Link className="font-mono text-sm text-amber-200 hover:text-amber-100" href={`/admin/orders/${active.order.publicId}`}>{active.order.publicId}</Link><p className="mt-2 text-sm text-slate-300">Mode: {SERVICE_MODE_META[active.order.serviceMode].label}</p><p className="mt-1 text-sm text-slate-300">Status order: {active.order.status}</p><p className="mt-1 text-xs text-slate-500">Ditugaskan {dateLabel(active.assignedAt)}</p></div> : <p className="mt-3 text-sm text-slate-400">Tidak ada penugasan aktif.</p>}</section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2"><Send className="text-amber-300" size={18} /><h2 className="font-semibold text-white">Telegram</h2></div>{joki.telegramUserId ? <div className="mt-4"><p className="text-sm text-emerald-200">Terhubung</p><p className="mt-1 text-xs text-slate-500">Terhubung {dateLabel(joki.telegramLinkedAt)}</p>{joki.telegramUsername && <p className="mt-1 text-sm text-slate-300">@{joki.telegramUsername}</p>}<form action={unlinkJokiTelegramAction} className="mt-4"><input name="publicId" type="hidden" value={joki.publicId} /><button className="secondary-button border-rose-300/35 text-rose-100 hover:border-rose-200" type="submit">Putuskan Telegram</button></form><p className="mt-3 text-xs leading-5 text-slate-500">Memutus Telegram tidak mengubah ownership assignment aktif; Joki ini tetap tercatat sebagai pemilik assignment di database.</p></div> : <div className="mt-4"><p className="text-sm text-slate-400">Belum terhubung</p><TelegramLinkControl publicId={joki.publicId} /></div>}</section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="font-semibold text-white">Edit joki</h2><div className="mt-5"><JokiForm action={updateJokiAction} hasActiveAssignment={Boolean(active)} joki={joki} submitLabel="Simpan perubahan" /></div></section>
    </aside></div>
  </AdminShell>;
}
