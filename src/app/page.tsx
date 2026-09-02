import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
} from "lucide-react";
import { RANK_TIERS } from "@/config/business";
import { getStarRangeLabel } from "@/domain/rank";
import { RankCalculator } from "@/components/rank-calculator";
import { SiteHeader } from "@/components/site-header";

const faqs = [
  ["Bagaimana harga dihitung?", "Harga dihitung untuk setiap bintang yang didapat. Jika target melewati tier, harga dipecah mengikuti tarif tiap tier."],
  ["Berapa lama prosesnya?", "Durasi bergantung pada jumlah target bintang, rank saat ini, kondisi matchmaking, dan ketersediaan pemain. Kami tidak menjanjikan durasi tetap."],
  ["Apakah saya boleh login ketika order sedang dikerjakan?", "Sebaiknya hindari aktivitas yang dapat mengganggu proses. Ikuti arahan yang diberikan saat pesanan diproses."],
  ["Bagaimana cara melihat progress?", "Masuk ke Lacak Pesanan dan verifikasi dengan nomor pesanan serta WhatsApp yang digunakan saat memesan."],
  ["Apa yang terjadi jika ada kendala?", "Status dan timeline pesanan akan diperbarui. Hubungi dukungan bila membutuhkan bantuan."],
  ["Apakah layanan ini resmi dari Moonton?", "Tidak. RankUp adalah layanan independen dan tidak berafiliasi, didukung, atau disponsori Moonton maupun Mobile Legends: Bang Bang."],
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#090b13] text-slate-100">
      <SiteHeader />
      <main>
        <section className="hero-grid relative isolate overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:py-24">
            <div className="relative z-10">
              <p className="eyebrow"><Sparkles size={15} /> JOKI RANK MLBB</p>
              <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">Push Rank MLBB <span className="text-amber-300">Lebih Praktis</span></h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">Pilih rank dan target bintangmu, lihat harga secara langsung, lalu pantau progress pesanan dari satu tempat.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="#kalkulator" className="primary-button">Cek Harga <ArrowRight size={18} /></a><Link href="/track" className="secondary-button">Lacak Pesanan</Link></div>
              <p className="mt-6 text-xs leading-5 text-slate-500">Layanan independen untuk pemain Mobile Legends: Bang Bang di Indonesia.</p>
            </div>
            <RankCalculator />
          </div>
        </section>

        <section className="section-shell">
          <div className="section-heading"><p className="eyebrow">ALUR SEDERHANA</p><h2>Mulai dari harga yang transparan</h2></div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <article className="surface-card"><span className="text-sm font-bold text-amber-300">01</span><h3 className="mt-5 text-lg font-semibold text-white">Pilih rank</h3><p className="mt-2 text-sm leading-6 text-slate-400">Tentukan bintang saat ini dan target yang ingin dicapai.</p></article>
            <article className="surface-card"><span className="text-sm font-bold text-amber-300">02</span><h3 className="mt-5 text-lg font-semibold text-white">Buat pesanan</h3><p className="mt-2 text-sm leading-6 text-slate-400">Isi kontak, lalu harga dihitung ulang oleh server sebelum disimpan.</p></article>
            <article className="surface-card"><span className="text-sm font-bold text-amber-300">03</span><h3 className="mt-5 text-lg font-semibold text-white">Pantau progress</h3><p className="mt-2 text-sm leading-6 text-slate-400">Gunakan nomor pesanan dan WhatsApp untuk melihat status terbaru.</p></article>
          </div>
        </section>

        <section className="section-shell pt-4">
          <div className="section-heading"><p className="eyebrow">RANK TERSEDIA</p><h2>Mythic hingga Mythical Immortal</h2></div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{RANK_TIERS.map((tier) => <article key={tier.key} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><Trophy size={20} className="text-amber-300"/><h3 className="mt-4 font-semibold text-white">{tier.label}</h3><p className="mt-1 text-sm text-slate-400">{getStarRangeLabel(tier)}</p></article>)}</div>
        </section>

        <section className="section-shell pt-4"><div className="grid gap-4 md:grid-cols-3">
          <article className="surface-card"><ShieldCheck size={22} className="text-amber-300"/><h3 className="mt-4 font-semibold text-white">Data pesanan terjaga</h3><p className="mt-2 text-sm leading-6 text-slate-400">Akses pesanan membutuhkan nomor pesanan dan WhatsApp yang sama.</p></article>
          <article className="surface-card"><Sparkles size={22} className="text-amber-300"/><h3 className="mt-4 font-semibold text-white">Harga terperinci</h3><p className="mt-2 text-sm leading-6 text-slate-400">Setiap tier yang dilalui ditampilkan dalam breakdown harga.</p></article>
          <article className="surface-card"><Timer size={22} className="text-amber-300"/><h3 className="mt-4 font-semibold text-white">Progress di satu tempat</h3><p className="mt-2 text-sm leading-6 text-slate-400">Lihat status, pembayaran, dan timeline setelah pesanan dibuat.</p></article>
        </div></section>

        <section className="section-shell pt-4"><div className="section-heading"><p className="eyebrow">FAQ</p><h2>Yang perlu kamu tahu</h2></div><div className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.025] px-5">{faqs.map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white">{question}<ChevronDown size={18} className="text-slate-400 transition group-open:rotate-180"/></summary><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{answer}</p></details>)}</div></section>

        <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8"><div className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-400/15 to-transparent p-7 sm:p-10"><p className="eyebrow">SUDAH PUNYA ORDER?</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Cek status pesananmu.</h2><p className="mt-3 max-w-xl text-slate-300">Siapkan nomor pesanan dan WhatsApp yang kamu gunakan saat membuat pesanan.</p><Link href="/track" className="primary-button mt-6">Lacak Pesanan <ArrowRight size={18} /></Link></div><aside className="mt-5 flex gap-3 rounded-2xl border border-rose-300/15 bg-rose-400/[0.06] p-4 text-sm leading-6 text-slate-300"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-rose-300"/><p>Disclaimer: RankUp adalah layanan pihak ketiga yang tidak berafiliasi, didukung, atau disponsori Moonton maupun Mobile Legends: Bang Bang. Akses akun pihak ketiga dan rank boosting dapat membawa risiko terhadap akun atau platform.</p></aside></section>
      </main>
      <footer className="border-t border-white/8 px-5 py-7 text-center text-sm text-slate-500">© {new Date().getFullYear()} RankUp. Layanan independen untuk pasar Indonesia.</footer>
    </div>
  );
}
