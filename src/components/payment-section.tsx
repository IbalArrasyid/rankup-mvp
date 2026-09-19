"use client";

import { startTransition, useState } from "react";
import { CheckCircle2, QrCode } from "lucide-react";
import { startDokuPaymentAction } from "@/app/actions";
import { formatRupiah } from "@/lib/money";

type Props = { publicId: string; total: number; paymentStatus: string; attempt: { status: string; checkoutUrl: string | null; expiresAt: Date | null } | null };

export function PaymentSection({ publicId, total, paymentStatus, attempt }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const active = attempt?.status === "PENDING" && attempt.checkoutUrl && (!attempt.expiresAt || new Date(attempt.expiresAt) > new Date());
  const pay = () => startTransition(async () => {
    setPending(true); setMessage(null);
    const result = await startDokuPaymentAction(publicId);
    setPending(false);
    if (!result.ok || !result.redirectTo) { setMessage(result.ok ? "Gagal membuka pembayaran QRIS." : result.message); return; }
    window.location.assign(result.redirectTo);
  });
  return <section className="mt-8 rounded-2xl border border-white/10 bg-slate-950/40 p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-white">Pembayaran</h2><p className="mt-1 text-sm text-slate-400">Metode pembayaran: QRIS</p></div><QrCode className="shrink-0 text-amber-300" /></div><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-sm text-slate-400">Total pesanan</span><strong className="text-xl text-amber-300">{formatRupiah(total)}</strong></div>{paymentStatus === "PAID" ? <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-300"><CheckCircle2 size={17} />Pembayaran berhasil.</p> : <><p className="mt-4 text-sm leading-6 text-slate-400">Bayar menggunakan aplikasi mobile banking atau e-wallet yang mendukung QRIS.</p><button className="primary-button mt-4 w-full" disabled={pending} onClick={pay} type="button">{pending ? "Membuka QRIS…" : active ? "Bayar Sekarang" : attempt?.status === "EXPIRED" ? "Buat QRIS Baru" : "Bayar dengan QRIS"}</button>{message && <p className="form-error mt-3" role="alert">{message}</p>}</>}</section>;
}
