import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CredentialForm } from "@/components/credential-form";
import { SiteHeader } from "@/components/site-header";
import { hasOrderAccess } from "@/server/order-access";
import { getCustomerOrder } from "@/server/orders";

export const metadata: Metadata = { title: "Data Login", robots: { index: false, follow: false } };

type CredentialsPageProps = { params: Promise<{ publicId: string }> };
export default async function CredentialsPage({ params }: CredentialsPageProps) {
  const { publicId } = await params;
  if (!(await hasOrderAccess(publicId))) notFound();
  const order = await getCustomerOrder(publicId);
  if (!order) notFound();
  if (order.credentials) redirect(`/order/${publicId}`);
  return <div className="min-h-screen bg-[#090b13] text-slate-100"><SiteHeader /><main className="mx-auto max-w-xl px-5 py-10 sm:px-8 sm:py-14"><Link href={`/order/${publicId}`} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft size={16}/> Kembali ke pesanan</Link><div className="mt-7 rounded-3xl border border-white/10 bg-[#121522] p-5 shadow-2xl shadow-black/20 sm:p-8"><p className="eyebrow">PESANAN {publicId}</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Kirim data login</h1><p className="mt-3 text-sm leading-6 text-slate-400">Data ini dibutuhkan untuk proses pesanan dan hanya disimpan dalam bentuk terenkripsi.</p><div className="mt-8"><CredentialForm publicId={publicId} /></div></div></main></div>;
}
