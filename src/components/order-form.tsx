"use client";

import { startTransition, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { RANK_TIERS, type RankTierKey } from "@/config/business";
import { calculateOrderPrice, SERVICE_MODES, SERVICE_MODE_META, type ServiceMode } from "@/domain/service-mode";
import { getStarRangeLabel } from "@/domain/rank";
import { formatRupiah } from "@/lib/money";
import { createOrderAction } from "@/app/actions";
import { orderCreationSchema } from "@/validation/orders";

type OrderFormValues = {
  serviceMode: ServiceMode;
  mlbbNickname: string;
  mlbbUserId: string;
  mlbbServerId: string;
  customerName: string;
  whatsapp: string;
  email: string;
  customerNotes: string;
  currentRank: RankTierKey;
  currentStar: number;
  targetRank: RankTierKey;
  targetStar: number;
};

export function OrderForm({ initialValues }: { initialValues: Pick<OrderFormValues, "currentRank" | "currentStar" | "targetRank" | "targetStar"> }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<OrderFormValues>({
    defaultValues: {
      serviceMode: "ACCOUNT",
      mlbbNickname: "",
      mlbbUserId: "",
      mlbbServerId: "",
      customerName: "",
      whatsapp: "",
      email: "",
      customerNotes: "",
      ...initialValues,
    },
  });
  const values = useWatch({ control });
  const serviceMode = values.serviceMode ?? "ACCOUNT";
  let quote: ReturnType<typeof calculateOrderPrice> | null = null;
  try { quote = calculateOrderPrice(serviceMode, Number(values.currentStar), Number(values.targetStar)); } catch { /* validation message below */ }

  const onSubmit = (values: OrderFormValues) => {
    const parsed = orderCreationSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") setError(field as keyof OrderFormValues, { message: issue.message });
      }
      return;
    }
    setMessage(null);
    setPending(true);
    startTransition(async () => {
      const result = await createOrderAction(parsed.data);
      setPending(false);
      if (!result.ok) { setMessage(result.message); return; }
    });
  };

  const currentTier = RANK_TIERS.find((tier) => tier.key === values.currentRank);
  const targetTier = RANK_TIERS.find((tier) => tier.key === values.targetRank);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7" noValidate>
      <fieldset className="border-0 p-0"><legend className="mb-3 text-sm font-semibold text-white">Cara Joki</legend>
        <div className="grid gap-3 sm:grid-cols-2">{SERVICE_MODES.map((mode) => <label className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 transition has-[:checked]:border-amber-300/50 has-[:checked]:bg-amber-300/[0.07]" key={mode}>
          <input className="mt-1" type="radio" value={mode} {...register("serviceMode")} />
          <span><strong className="block text-sm text-white">{SERVICE_MODE_META[mode].label}</strong><span className="mt-1 block text-xs leading-5 text-slate-400">{SERVICE_MODE_META[mode].explanation}</span></span>
        </label>)}</div>
        {errors.serviceMode && <span className="form-error">{errors.serviceMode.message}</span>}
      </fieldset>

      <fieldset className="grid gap-4 border-0 p-0 sm:grid-cols-2"><legend className="mb-3 text-sm font-semibold text-white">Detail rank</legend>
        <label className="form-label">Rank saat ini<select className="field-control mt-2" {...register("currentRank")}>
          {RANK_TIERS.map((tier) => <option key={tier.key} value={tier.key}>{tier.label}</option>)}
        </select></label>
        <label className="form-label">Bintang saat ini <span className="text-slate-500">({currentTier ? getStarRangeLabel(currentTier) : ""})</span><input className="field-control mt-2" type="number" inputMode="numeric" {...register("currentStar", { valueAsNumber: true })} aria-invalid={Boolean(errors.currentStar)} />{errors.currentStar && <span className="form-error">{errors.currentStar.message}</span>}</label>
        <label className="form-label">Target rank<select className="field-control mt-2" {...register("targetRank")}>
          {RANK_TIERS.map((tier) => <option key={tier.key} value={tier.key}>{tier.label}</option>)}
        </select></label>
        <label className="form-label">Target bintang <span className="text-slate-500">({targetTier ? getStarRangeLabel(targetTier) : ""})</span><input className="field-control mt-2" type="number" inputMode="numeric" {...register("targetStar", { valueAsNumber: true })} aria-invalid={Boolean(errors.targetStar)} />{errors.targetStar && <span className="form-error">{errors.targetStar.message}</span>}</label>
      </fieldset>

      {quote ? <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4"><div className="flex items-center justify-between text-sm text-slate-300"><span>Total bintang</span><span>{quote.totalStars} bintang</span></div><div className="mt-2 flex items-end justify-between"><span className="font-medium text-white">Harga server akan diverifikasi ulang</span><strong className="text-xl text-amber-300">{formatRupiah(quote.total)}</strong></div></div> : <p role="alert" className="form-error">Pilih rank dan bintang yang valid; target harus lebih tinggi.</p>}

      <fieldset className="grid gap-4 border-0 p-0 sm:grid-cols-2"><legend className="mb-3 text-sm font-semibold text-white">Kontak</legend>
        <label className="form-label">Nama lengkap<input className="field-control mt-2" autoComplete="name" {...register("customerName", { required: "Masukkan nama lengkap." })} aria-invalid={Boolean(errors.customerName)} />{errors.customerName && <span className="form-error">{errors.customerName.message}</span>}</label>
        <label className="form-label">WhatsApp<input className="field-control mt-2" inputMode="tel" autoComplete="tel" placeholder="081234567890" {...register("whatsapp", { required: "Masukkan nomor WhatsApp." })} aria-invalid={Boolean(errors.whatsapp)} />{errors.whatsapp && <span className="form-error">{errors.whatsapp.message}</span>}</label>
        <label className="form-label sm:col-span-2">Email <span className="text-slate-500">(opsional)</span><input className="field-control mt-2" type="email" autoComplete="email" {...register("email")} aria-invalid={Boolean(errors.email)} />{errors.email && <span className="form-error">{errors.email.message}</span>}</label>
        {serviceMode === "GENDONG" && <>
          <label className="form-label sm:col-span-2">Nickname MLBB<input className="field-control mt-2" {...register("mlbbNickname")} aria-invalid={Boolean(errors.mlbbNickname)} />{errors.mlbbNickname && <span className="form-error">{errors.mlbbNickname.message}</span>}</label>
          <label className="form-label">User ID MLBB<input className="field-control mt-2" inputMode="numeric" {...register("mlbbUserId")} aria-invalid={Boolean(errors.mlbbUserId)} />{errors.mlbbUserId && <span className="form-error">{errors.mlbbUserId.message}</span>}</label>
          <label className="form-label">Server ID MLBB<input className="field-control mt-2" inputMode="numeric" {...register("mlbbServerId")} aria-invalid={Boolean(errors.mlbbServerId)} />{errors.mlbbServerId && <span className="form-error">{errors.mlbbServerId.message}</span>}</label>
        </>}
        <label className="form-label sm:col-span-2">{serviceMode === "GENDONG" ? "Catatan waktu main" : "Catatan pesanan"} <span className="text-slate-500">(opsional)</span><textarea className="field-control mt-2 min-h-24 resize-y" placeholder={serviceMode === "GENDONG" ? "Contoh: biasanya bisa main malam setelah jam 20.00." : undefined} {...register("customerNotes")} /></label>
      </fieldset>
      <p className="flex gap-2 rounded-xl bg-white/[0.04] p-3 text-xs leading-5 text-slate-400"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-amber-300" />{serviceMode === "GENDONG" ? "Harga final dihitung ulang di server. Mode Gendong tidak meminta password atau secret login akunmu." : "Harga final dihitung ulang di server. Data login baru akan diminta setelah pesanan dibuat."}</p>
      {message && <p role="alert" className="form-error rounded-xl border border-rose-400/25 bg-rose-400/10 p-3">{message}</p>}
      <button className="primary-button w-full" type="submit" disabled={pending || !quote}>{pending ? "Membuat pesanan…" : <>Buat Pesanan <ArrowRight size={18} /></>}</button>
    </form>
  );
}
