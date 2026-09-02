"use client";

import { startTransition, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { revealOrderCredentialAction } from "@/app/admin/actions";

type Credential = {
  loginMethod: string;
  identifier: string;
  secret: string;
  accountId: string;
  serverId: string;
  notes: string | null;
};

export function CredentialReveal({ publicId }: { publicId: string }) {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reveal() {
    setPending(true);
    setMessage(null);
    startTransition(async () => {
      const result = await revealOrderCredentialAction(publicId);
      setPending(false);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setCredential(result.credential);
    });
  }

  if (!credential) {
    return <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="flex items-center gap-2 font-semibold text-white"><LockKeyhole size={17} className="text-amber-300" />Data login: Tersedia</h2><p className="mt-1 text-sm leading-6 text-slate-400">Data terenkripsi. Buka hanya saat perlu untuk memproses pesanan.</p></div><button className="secondary-button" disabled={pending} onClick={reveal} type="button"><Eye size={17} />{pending ? "Membuka…" : "Lihat Data Login"}</button></div>{message && <p role="alert" className="form-error mt-4 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3">{message}</p>}</div>;
  }

  const fields = [
    ["Metode login", credential.loginMethod],
    ["Account identifier", credential.identifier],
    ["Password / login secret", credential.secret],
    ["MLBB Account ID", credential.accountId],
    ["Server ID", credential.serverId],
    ["Catatan", credential.notes || "—"],
  ];

  return <section className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.055] p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="flex items-center gap-2 font-semibold text-white"><Eye className="text-amber-300" size={18} />Data login dibuka sementara</h2><p className="mt-1 text-sm text-slate-400">Nilai ini hanya disimpan di memori halaman ini.</p></div><button className="secondary-button" onClick={() => setCredential(null)} type="button"><EyeOff size={17} />Sembunyikan</button></div><dl className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-slate-950/50 p-3"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-100">{value}</dd></div>)}</dl></section>;
}
