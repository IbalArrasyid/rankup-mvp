"use client";

import { useState, useTransition } from "react";
import { createJokiTelegramLinkAction, type TelegramLinkActionResult } from "@/app/admin/joki/actions";

type Props = { publicId: string };

export function TelegramLinkControl({ publicId }: Props) {
  const [result, setResult] = useState<TelegramLinkActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const generate = () => startTransition(async () => {
    setResult(await createJokiTelegramLinkAction(publicId));
  });

  const copy = async () => {
    if (result?.ok) await navigator.clipboard.writeText(result.link);
  };

  return <div className="mt-4 space-y-3"><button className="primary-button" disabled={isPending} onClick={generate} type="button">{isPending ? "Membuat link…" : "Hubungkan Telegram"}</button>{result && !result.ok && <p role="alert" className="form-error text-sm">{result.message}</p>}{result?.ok && <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.08] p-3"><p className="text-sm text-amber-100">Link satu kali pakai. Berlaku sampai {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.expiresAt))}.</p><a className="mt-2 block break-all text-sm text-amber-200 underline hover:text-amber-100" href={result.link} rel="noreferrer" target="_blank">{result.link}</a><button className="secondary-button mt-3" onClick={copy} type="button">Copy Link</button></div>}</div>;
}
