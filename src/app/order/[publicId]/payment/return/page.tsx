import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CheckCircle2, Clock3 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { hasOrderAccess } from "@/server/order-access";
import { getCustomerOrder } from "@/server/orders";
import { getCustomerPayment } from "@/server/payments";

export const metadata = { title: "Status Pembayaran", robots: { index: false, follow: false } };

export default async function PaymentReturnPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  if (!(await hasOrderAccess(publicId))) redirect("/track");
  const order = await getCustomerOrder(publicId);
  if (!order) notFound();
  const attempt = await getCustomerPayment(publicId);
  const paid = order.paymentStatus === "PAID";
  const expired = !paid && attempt?.status === "EXPIRED";
  return <div className="min-h-screen bg-[#090b13] text-slate-100"><SiteHeader orderPublicId={publicId} /><main className="mx-auto max-w-xl px-5 py-14"><section className="rounded-3xl border border-white/10 bg-[#121522] p-7 text-center"><span className={`mx-auto grid size-12 place-items-center rounded-full ${paid ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>{paid ? <CheckCircle2 /> : <Clock3 />}</span><h1 className="mt-5 text-2xl font-bold text-white">{paid ? "Pembayaran berhasil." : expired ? "Pembayaran telah kedaluwarsa." : "Pembayaran sedang diverifikasi."}</h1><p className="mt-3 text-sm leading-6 text-slate-400">{paid ? "Status pembayaran sudah dikonfirmasi oleh DOKU." : "Kembali dari DOKU tidak mengubah status pesanan. Cek ulang status pembayaran dari data server."}</p><Link className="primary-button mt-6" href={`/order/${publicId}`}>Cek Status Pembayaran</Link></section></main></div>;
}
