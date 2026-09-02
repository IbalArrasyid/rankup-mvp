"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { RANK_TIERS, type RankTierKey } from "@/config/business";
import { calculatePrice, type PriceQuote } from "@/domain/pricing";
import { getStarRangeLabel, isStarValidForTier } from "@/domain/rank";
import { formatRupiah } from "@/lib/money";

type Selection = { rank: RankTierKey; star: number };

function RankSelect({ id, label, value, onChange }: { id: string; label: string; value: RankTierKey; onChange: (value: RankTierKey) => void }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as RankTierKey)} className="field-control">
        {RANK_TIERS.map((tier) => <option key={tier.key} value={tier.key}>{tier.label}</option>)}
      </select>
    </label>
  );
}

function StarInput({ id, label, value, selection, onChange }: { id: string; label: string; value: number; selection: Selection; onChange: (value: number) => void }) {
  const tier = RANK_TIERS.find((item) => item.key === selection.rank)!;
  const valid = isStarValidForTier(selection.rank, value);
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 flex items-center justify-between text-sm font-medium text-slate-200"><span>{label}</span><span className="text-xs font-normal text-slate-500">{getStarRangeLabel(tier)}</span></span>
      <input id={id} type="number" inputMode="numeric" min={tier.minStar} max={tier.maxStar ?? undefined} value={Number.isFinite(value) ? value : ""} onChange={(event) => onChange(Number(event.target.value))} className="field-control" aria-invalid={!valid} />
      {!valid && <span className="mt-1 block text-xs text-rose-300">Bintang harus berada pada rentang rank yang dipilih.</span>}
    </label>
  );
}

function PriceSummary({ quote }: { quote: PriceQuote }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <p className="text-xs font-semibold tracking-[0.18em] text-amber-300">RINGKASAN HARGA</p>
      <div className="mt-4 space-y-3">
        {quote.breakdown.map((item) => (
          <div key={item.tier} className="flex items-start justify-between gap-3 text-sm">
            <div><p className="font-medium text-white">{item.label}</p><p className="text-slate-400">{item.stars} bintang × {formatRupiah(item.pricePerStar)}</p></div>
            <span className="font-medium text-slate-100">{formatRupiah(item.subtotal)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
        <div><p className="text-xs text-slate-400">TOTAL BINTANG</p><p className="text-lg font-semibold text-white">{quote.totalStars} bintang</p></div>
        <div className="text-right"><p className="text-xs text-slate-400">TOTAL</p><p className="text-2xl font-bold tracking-tight text-amber-300">{formatRupiah(quote.total)}</p></div>
      </div>
    </div>
  );
}

export function RankCalculator() {
  const router = useRouter();
  const [current, setCurrent] = useState<Selection>({ rank: "MYTHICAL_HONOR", star: 32 });
  const [target, setTarget] = useState<Selection>({ rank: "MYTHICAL_GLORY", star: 55 });
  const quote = useMemo(() => {
    if (!isStarValidForTier(current.rank, current.star) || !isStarValidForTier(target.rank, target.star)) return null;
    try { return calculatePrice(current.star, target.star); } catch { return null; }
  }, [current, target]);

  const updateRank = (kind: "current" | "target", rank: RankTierKey) => {
    const tier = RANK_TIERS.find((item) => item.key === rank)!;
    const setter = kind === "current" ? setCurrent : setTarget;
    setter((previous) => ({ ...previous, rank, star: isStarValidForTier(rank, previous.star) ? previous.star : tier.minStar }));
  };

  return (
    <section id="kalkulator" className="scroll-mt-8 rounded-3xl border border-white/10 bg-[#121522] p-5 shadow-2xl shadow-black/20 sm:p-7">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Sparkles size={19} /></span><div><h2 className="font-semibold text-white">Kalkulator rank</h2><p className="text-sm text-slate-400">Harga dihitung per bintang, termasuk lintas tier.</p></div></div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-white/[0.03] p-4"><p className="text-xs font-semibold tracking-[0.15em] text-slate-400">RANK SAAT INI</p><RankSelect id="current-rank" label="Rank" value={current.rank} onChange={(rank) => updateRank("current", rank)} /><StarInput id="current-star" label="Bintang" value={current.star} selection={current} onChange={(star) => setCurrent((value) => ({ ...value, star }))} /></div>
        <div className="space-y-4 rounded-2xl bg-white/[0.03] p-4"><p className="text-xs font-semibold tracking-[0.15em] text-slate-400">TARGET RANK</p><RankSelect id="target-rank" label="Rank" value={target.rank} onChange={(rank) => updateRank("target", rank)} /><StarInput id="target-star" label="Bintang" value={target.star} selection={target} onChange={(star) => setTarget((value) => ({ ...value, star }))} /></div>
      </div>
      {quote ? <PriceSummary quote={quote} /> : <p role="alert" className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">Pastikan target berada di atas bintang saat ini dan tiap bintang sesuai rank yang dipilih.</p>}
      <button type="button" disabled={!quote} onClick={() => router.push(`/order/new?currentRank=${current.rank}&currentStar=${current.star}&targetRank=${target.rank}&targetStar=${target.star}`)} className="primary-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50">Lanjut Pesan <ArrowRight size={18} /></button>
    </section>
  );
}
