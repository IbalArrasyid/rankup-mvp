"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowRight } from "lucide-react";
import { trackOrderAction } from "@/app/actions";
import { trackOrderSchema } from "@/validation/orders";

type TrackFormValues = { publicId: string; whatsapp: string };

export function TrackForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<TrackFormValues>();
  const onSubmit = (values: TrackFormValues) => {
    const parsed = trackOrderSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") setError(field as keyof TrackFormValues, { message: issue.message });
      }
      return;
    }
    setPending(true); setMessage(null);
    startTransition(async () => {
      const result = await trackOrderAction(parsed.data);
      setPending(false);
      if (!result.ok) { setMessage(result.message); return; }
      if (result.redirectTo) router.push(result.redirectTo);
    });
  };
  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
    <label className="form-label">Nomor pesanan<input className="field-control mt-2 uppercase" placeholder="ML-260902-X7K4" autoCapitalize="characters" {...register("publicId", { required: "Masukkan nomor pesanan." })} aria-invalid={Boolean(errors.publicId)} />{errors.publicId && <span className="form-error">{errors.publicId.message}</span>}</label>
    <label className="form-label">WhatsApp yang digunakan saat memesan<input className="field-control mt-2" inputMode="tel" placeholder="081234567890" {...register("whatsapp", { required: "Masukkan nomor WhatsApp." })} aria-invalid={Boolean(errors.whatsapp)} />{errors.whatsapp && <span className="form-error">{errors.whatsapp.message}</span>}</label>
    {message && <p role="alert" className="form-error rounded-xl border border-rose-400/25 bg-rose-400/10 p-3">{message}</p>}
    <button className="primary-button w-full" disabled={pending} type="submit">{pending ? "Memverifikasi…" : <>Lihat pesanan <ArrowRight size={18} /></>}</button>
  </form>;
}
