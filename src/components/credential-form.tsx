"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { LockKeyhole } from "lucide-react";
import { saveCredentialAction } from "@/app/actions";
import { credentialSchema } from "@/validation/orders";

type CredentialFormValues = { loginMethod: "MOONTON" | "GOOGLE" | "FACEBOOK" | "TIKTOK" | "OTHER"; identifier: string; secret: string; accountId: string; serverId: string; notes: string };

export function CredentialForm({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<CredentialFormValues>({ defaultValues: { loginMethod: "MOONTON", notes: "" } });
  const onSubmit = (values: CredentialFormValues) => {
    const parsed = credentialSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) { const field = issue.path[0]; if (typeof field === "string") setError(field as keyof CredentialFormValues, { message: issue.message }); }
      return;
    }
    setPending(true); setMessage(null);
    startTransition(async () => {
      const result = await saveCredentialAction(publicId, parsed.data);
      setPending(false);
      if (!result.ok) { setMessage(result.message); return; }
      if (result.redirectTo) router.push(result.redirectTo);
    });
  };
  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
    <p className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] p-3 text-xs leading-5 text-slate-300"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-amber-300" />Secret login dienkripsi dengan AES-256-GCM sebelum disimpan dan tidak akan ditampilkan kembali.</p>
    <label className="form-label">Metode login<select className="field-control mt-2" {...register("loginMethod")}><option value="MOONTON">Moonton</option><option value="GOOGLE">Google</option><option value="FACEBOOK">Facebook</option><option value="TIKTOK">TikTok</option><option value="OTHER">Lainnya</option></select></label>
    <label className="form-label">Email / identifier login<input className="field-control mt-2" autoComplete="username" {...register("identifier", { required: "Masukkan identifier login." })} aria-invalid={Boolean(errors.identifier)} />{errors.identifier && <span className="form-error">{errors.identifier.message}</span>}</label>
    <label className="form-label">Password / secret login<input className="field-control mt-2" type="password" autoComplete="current-password" {...register("secret", { required: "Masukkan secret login." })} aria-invalid={Boolean(errors.secret)} />{errors.secret && <span className="form-error">{errors.secret.message}</span>}</label>
    <div className="grid gap-5 sm:grid-cols-2"><label className="form-label">User ID MLBB<input className="field-control mt-2" inputMode="numeric" {...register("accountId", { required: "Masukkan User ID." })} aria-invalid={Boolean(errors.accountId)} />{errors.accountId && <span className="form-error">{errors.accountId.message}</span>}</label><label className="form-label">Server ID MLBB<input className="field-control mt-2" inputMode="numeric" {...register("serverId", { required: "Masukkan Server ID." })} aria-invalid={Boolean(errors.serverId)} />{errors.serverId && <span className="form-error">{errors.serverId.message}</span>}</label></div>
    <label className="form-label">Catatan login <span className="text-slate-500">(opsional)</span><textarea className="field-control mt-2 min-h-24 resize-y" {...register("notes")} /></label>
    {message && <p role="alert" className="form-error rounded-xl border border-rose-400/25 bg-rose-400/10 p-3">{message}</p>}
    <button className="primary-button w-full" type="submit" disabled={pending}>{pending ? "Menyimpan terenkripsi…" : "Kirim data login dengan aman"}</button>
  </form>;
}
