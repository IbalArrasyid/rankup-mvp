import { MessageCircle } from "lucide-react";

export function WhatsAppSupport({ orderPublicId }: { orderPublicId?: string }) {
  const number = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace(/\D/g, "");
  if (!number || !/^62\d{8,14}$/.test(number)) return null;
  const message = orderPublicId ? `Halo Admin RankUp, saya mengalami kendala pada pesanan saya.\n\nOrder ID: ${orderPublicId}` : "Halo Admin RankUp, saya mengalami kendala di website RankUp.";
  return <a aria-label="Hubungi RankUp via WhatsApp" className="fixed bottom-5 right-5 z-50 inline-flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200" href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`} rel="noreferrer" target="_blank"><MessageCircle size={22} /></a>;
}
