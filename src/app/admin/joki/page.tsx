import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { type JokiAvailability, type JokiRole, type JokiStatus } from "@/generated/prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { JOKI_AVAILABILITY_META, JOKI_ROLE_META, JOKI_STATUS_META } from "@/domain/joki";
import { getRankTierForStar } from "@/domain/rank";
import { getAdminJokis } from "@/server/admin/joki";
import { requireAdminSession } from "@/server/admin/session";

export const metadata: Metadata = { title: "Joki Admin", robots: { index: false, follow: false } };

type JokiListPageProps = { searchParams: Promise<{ page?: string; search?: string; status?: string; availability?: string; role?: string }> };

function asStatus(value: string | undefined): JokiStatus | undefined {
  return value && value in JOKI_STATUS_META ? value as JokiStatus : undefined;
}

function asAvailability(value: string | undefined): JokiAvailability | undefined {
  return value && value in JOKI_AVAILABILITY_META ? value as JokiAvailability : undefined;
}

function asRole(value: string | undefined): JokiRole | undefined {
  return value && value in JOKI_ROLE_META ? value as JokiRole : undefined;
}

function rankLabel(star: number): string {
  return `${getRankTierForStar(star)?.label ?? "Rank"} ${star} ⭐`;
}

export default async function AdminJokiListPage({ searchParams }: JokiListPageProps) {
  await requireAdminSession();
  const params = await searchParams;
  const filters = {
    page: Number(params.page) || 1,
    search: params.search?.trim() || undefined,
    status: asStatus(params.status),
    availability: asAvailability(params.availability),
    role: asRole(params.role),
  };
  const result = await getAdminJokis(filters);
  const hrefForPage = (page: number) => {
    const next = new URLSearchParams();
    if (filters.search) next.set("search", filters.search);
    if (filters.status) next.set("status", filters.status);
    if (filters.availability) next.set("availability", filters.availability);
    if (filters.role) next.set("role", filters.role);
    next.set("page", String(page));
    return `/admin/joki?${next.toString()}`;
  };

  return <AdminShell><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">TALENT OPERATIONS</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Joki</h1><p className="mt-2 text-sm text-slate-400">Kelola ketersediaan dan kapasitas joki untuk penugasan manual.</p></div><Link className="primary-button" href="/admin/joki/new"><Plus size={17} />Tambah Joki</Link></div><form className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_160px_auto]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className="field-control pl-10" defaultValue={filters.search} name="search" placeholder="Joki ID, nama, atau WhatsApp" /></div><select className="field-control" defaultValue={filters.status ?? ""} name="status"><option value="">Semua status</option>{Object.entries(JOKI_STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select><select className="field-control" defaultValue={filters.availability ?? ""} name="availability"><option value="">Semua ketersediaan</option>{Object.entries(JOKI_AVAILABILITY_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select><select className="field-control" defaultValue={filters.role ?? ""} name="role"><option value="">Semua role</option>{Object.entries(JOKI_ROLE_META).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="primary-button" type="submit">Terapkan</button></form><section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="flex justify-between gap-4 border-b border-white/10 px-5 py-4 text-sm text-slate-400"><span><strong className="text-white">{result.total}</strong> joki ditemukan</span><span>Halaman {result.page} dari {result.totalPages}</span></div>{result.jokis.length === 0 ? <p className="m-5 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Belum ada joki yang sesuai.</p> : <div className="overflow-x-auto"><table className="min-w-[1000px] w-full text-left text-sm"><thead className="border-b border-white/10 bg-slate-950/25 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Joki ID</th><th className="px-5 py-3 font-medium">Nama</th><th className="px-5 py-3 font-medium">WhatsApp</th><th className="px-5 py-3 font-medium">Peak</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Ketersediaan</th><th className="px-5 py-3 font-medium">Job aktif</th><th className="px-5 py-3 font-medium">Selesai</th></tr></thead><tbody>{result.jokis.map((joki) => { const status = JOKI_STATUS_META[joki.status]; const availability = JOKI_AVAILABILITY_META[joki.availability]; return <tr className="border-b border-white/5 last:border-0" key={joki.publicId}><td className="px-5 py-4 font-mono text-xs text-amber-200"><Link className="hover:text-amber-100" href={`/admin/joki/${joki.publicId}`}>{joki.publicId}</Link></td><td className="px-5 py-4 text-slate-100">{joki.name}</td><td className="px-5 py-4 font-mono text-xs text-slate-300">{joki.whatsapp}</td><td className="px-5 py-4 text-slate-300">{rankLabel(joki.peakAbsoluteStar)}</td><td className="px-5 py-4 text-xs text-slate-300">{joki.roles.map((role) => JOKI_ROLE_META[role]).join(", ")}</td><td className="px-5 py-4"><span className={`status-badge status-${status.tone}`}>{status.label}</span></td><td className="px-5 py-4"><span className={`status-badge status-${availability.tone}`}>{availability.label}</span></td><td className="px-5 py-4 text-xs">{joki.assignments[0] ? <Link className="text-amber-200 hover:text-amber-100" href={`/admin/orders/${joki.assignments[0].order.publicId}`}>{joki.assignments[0].order.publicId}</Link> : <span className="text-slate-500">—</span>}</td><td className="px-5 py-4 text-slate-300">{joki._count.assignments}</td></tr>; })}</tbody></table></div>}<div className="flex justify-between gap-4 border-t border-white/10 px-5 py-4"><Link aria-disabled={result.page <= 1} className={`secondary-button ${result.page <= 1 ? "pointer-events-none opacity-40" : ""}`} href={hrefForPage(Math.max(1, result.page - 1))}><ChevronLeft size={16} />Sebelumnya</Link><Link aria-disabled={result.page >= result.totalPages} className={`secondary-button ${result.page >= result.totalPages ? "pointer-events-none opacity-40" : ""}`} href={hrefForPage(Math.min(result.totalPages, result.page + 1))}>Berikutnya<ChevronRight size={16} /></Link></div></section></AdminShell>;
}
