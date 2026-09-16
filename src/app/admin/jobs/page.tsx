import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { JobPostingStatus } from "@/generated/prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { getRankTierForStar } from "@/domain/rank";
import { getAdminJobs } from "@/server/jobs/job-pool";
import { requireAdminSession } from "@/server/admin/session";

export const metadata: Metadata = { title: "Job Pool Admin", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ page?: string; search?: string; status?: string }> };

function asStatus(value: string | undefined): JobPostingStatus | undefined {
  return value === "OPEN" || value === "CLAIMED" || value === "CANCELLED" ? value : undefined;
}

function dateLabel(date: Date | null): string {
  return date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date) : "—";
}

function rankLabel(star: number): string {
  return `${getRankTierForStar(star)?.label ?? "Rank"} ${star} ⭐`;
}

export default async function AdminJobsPage({ searchParams }: Props) {
  await requireAdminSession();
  const params = await searchParams;
  const filters = { page: Number(params.page) || 1, search: params.search?.trim() || undefined, status: asStatus(params.status) };
  const result = await getAdminJobs(filters);
  const hrefForPage = (page: number) => {
    const next = new URLSearchParams();
    if (filters.search) next.set("search", filters.search);
    if (filters.status) next.set("status", filters.status);
    next.set("page", String(page));
    return `/admin/jobs?${next.toString()}`;
  };

  return <AdminShell><div><p className="eyebrow">TELEGRAM JOB POOL</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Jobs</h1><p className="mt-2 text-sm text-slate-400">Posting job internal untuk Joki Telegram yang memenuhi syarat.</p></div><form className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className="field-control pl-10" defaultValue={filters.search} name="search" placeholder="Job ID atau Order ID" /></div><select className="field-control" defaultValue={filters.status ?? ""} name="status"><option value="">Semua status</option><option value="OPEN">Open</option><option value="CLAIMED">Claimed</option><option value="CANCELLED">Cancelled</option></select><button className="primary-button" type="submit">Terapkan</button></form><section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="flex justify-between gap-4 border-b border-white/10 px-5 py-4 text-sm text-slate-400"><span><strong className="text-white">{result.total}</strong> job</span><span>Halaman {result.page} dari {result.totalPages}</span></div>{result.jobs.length === 0 ? <p className="m-5 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Belum ada Job Pool yang sesuai.</p> : <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead className="border-b border-white/10 bg-slate-950/25 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Job ID</th><th className="px-5 py-3 font-medium">Order ID</th><th className="px-5 py-3 font-medium">Current → Target</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Published</th><th className="px-5 py-3 font-medium">Claimed by</th><th className="px-5 py-3 font-medium">Claimed at</th></tr></thead><tbody>{result.jobs.map((job) => <tr className="border-b border-white/5 last:border-0" key={job.publicId}><td className="px-5 py-4 font-mono text-xs text-amber-200">{job.publicId}</td><td className="px-5 py-4"><Link className="font-mono text-xs text-amber-200 hover:text-amber-100" href={`/admin/orders/${job.order.publicId}`}>{job.order.publicId}</Link></td><td className="px-5 py-4 text-slate-300">{rankLabel(job.order.initialAbsoluteStar)} → {rankLabel(job.order.targetAbsoluteStar)}</td><td className="px-5 py-4"><span className={`status-badge status-${job.status === "OPEN" ? "emerald" : job.status === "CLAIMED" ? "amber" : "slate"}`}>{job.status}</span></td><td className="px-5 py-4 text-xs text-slate-400">{dateLabel(job.publishedAt)}</td><td className="px-5 py-4 text-slate-300">{job.claimedByJoki ? `${job.claimedByJoki.name} · ${job.claimedByJoki.publicId}` : "—"}</td><td className="px-5 py-4 text-xs text-slate-400">{dateLabel(job.claimedAt)}</td></tr>)}</tbody></table></div>}<div className="flex justify-between gap-4 border-t border-white/10 px-5 py-4"><Link aria-disabled={result.page <= 1} className={`secondary-button ${result.page <= 1 ? "pointer-events-none opacity-40" : ""}`} href={hrefForPage(Math.max(1, result.page - 1))}><ChevronLeft size={16} />Sebelumnya</Link><Link aria-disabled={result.page >= result.totalPages} className={`secondary-button ${result.page >= result.totalPages ? "pointer-events-none opacity-40" : ""}`} href={hrefForPage(Math.min(result.totalPages, result.page + 1))}>Berikutnya<ChevronRight size={16} /></Link></div></section></AdminShell>;
}
