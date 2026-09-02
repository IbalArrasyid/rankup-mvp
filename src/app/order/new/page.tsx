import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RANK_TIERS, type RankTierKey } from "@/config/business";
import { isStarValidForTier } from "@/domain/rank";
import { OrderForm } from "@/components/order-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Buat Pesanan", robots: { index: false, follow: false } };

type NewOrderPageProps = {
  searchParams: Promise<{
    currentRank?: string;
    currentStar?: string;
    targetRank?: string;
    targetStar?: string;
  }>;
};
function isRankKey(value: string | undefined): value is RankTierKey {
  return Boolean(value && RANK_TIERS.some((tier) => tier.key === value));
}

export default async function NewOrderPage({ searchParams }: NewOrderPageProps) {
  const query = await searchParams;
  const currentRank = isRankKey(query.currentRank as string | undefined) ? query.currentRank as RankTierKey : "MYTHICAL_HONOR";
  const targetRank = isRankKey(query.targetRank as string | undefined) ? query.targetRank as RankTierKey : "MYTHICAL_GLORY";
  const currentStarCandidate = Number(query.currentStar);
  const targetStarCandidate = Number(query.targetStar);
  const initialValues = {
    currentRank,
    targetRank,
    currentStar: isStarValidForTier(currentRank, currentStarCandidate) ? currentStarCandidate : 32,
    targetStar: isStarValidForTier(targetRank, targetStarCandidate) ? targetStarCandidate : 55,
  };

  return <div className="min-h-screen bg-[#090b13] text-slate-100"><SiteHeader /><main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14"><Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft size={16}/> Kembali ke kalkulator</Link><div className="mt-7 rounded-3xl border border-white/10 bg-[#121522] p-5 shadow-2xl shadow-black/20 sm:p-8"><p className="eyebrow">LANGKAH 2 DARI 2</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Lengkapi pesanan</h1><p className="mt-3 text-sm leading-6 text-slate-400">Harga yang terlihat adalah perkiraan dari kalkulator. Harga resmi dihitung ulang ketika pesanan disimpan.</p><div className="mt-8"><OrderForm initialValues={initialValues} /></div></div></main></div>;
}
