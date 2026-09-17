import { RANK_TIERS } from "@/config/business";
import { JOKI_AVAILABILITY_META, JOKI_ROLE_META, JOKI_STATUS_META } from "@/domain/joki";
import { getRankTierForStar } from "@/domain/rank";
import { SERVICE_MODES, SERVICE_MODE_META } from "@/domain/service-mode";

type JokiFormValues = {
  publicId?: string;
  name?: string;
  whatsapp?: string;
  telegramUsername?: string | null;
  peakAbsoluteStar?: number;
  currentAbsoluteStar?: number | null;
  serviceModes?: readonly string[];
  roles?: readonly string[];
  heroPool?: readonly string[];
  status?: string;
  availability?: string;
  notes?: string | null;
};

type JokiFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  joki?: JokiFormValues;
  hasActiveAssignment?: boolean;
  submitLabel: string;
};

export function JokiForm({ action, joki, hasActiveAssignment = false, submitLabel }: JokiFormProps) {
  const peakTier = joki?.peakAbsoluteStar === undefined ? undefined : getRankTierForStar(joki.peakAbsoluteStar);
  const currentTier = joki?.currentAbsoluteStar === null || joki?.currentAbsoluteStar === undefined
    ? undefined
    : getRankTierForStar(joki.currentAbsoluteStar);
  const availability = hasActiveAssignment ? "BUSY" : (joki?.availability ?? "AVAILABLE");

  return <form action={action} className="space-y-7">
    {joki?.publicId && <input name="publicId" type="hidden" value={joki.publicId} />}
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="form-label">Nama joki<input className="field-control mt-2" defaultValue={joki?.name} name="name" required /></label>
      <label className="form-label">WhatsApp<input className="field-control mt-2" defaultValue={joki?.whatsapp} inputMode="tel" name="whatsapp" required /></label>
      <label className="form-label">Username Telegram <span className="text-slate-500">(opsional)</span><input className="field-control mt-2" defaultValue={joki?.telegramUsername ?? ""} name="telegramUsername" /></label>
      <label className="form-label">Status<select className="field-control mt-2" defaultValue={joki?.status ?? "ACTIVE"} name="status">{Object.entries(JOKI_STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label>
    </div>
    <fieldset><legend className="form-label">Peak rank</legend><div className="mt-2 grid gap-3 sm:grid-cols-2"><select className="field-control" defaultValue={peakTier?.key ?? ""} name="peakRank" required><option disabled value="">Pilih peak rank</option>{RANK_TIERS.map((tier) => <option key={tier.key} value={tier.key}>{tier.label}</option>)}</select><input className="field-control" defaultValue={joki?.peakAbsoluteStar ?? ""} min="0" name="peakStar" placeholder="Bintang peak" required type="number" /></div></fieldset>
    <fieldset><legend className="form-label">Rank saat ini <span className="text-slate-500">(opsional)</span></legend><div className="mt-2 grid gap-3 sm:grid-cols-2"><select className="field-control" defaultValue={currentTier?.key ?? ""} name="currentRank"><option value="">Belum diisi</option>{RANK_TIERS.map((tier) => <option key={tier.key} value={tier.key}>{tier.label}</option>)}</select><input className="field-control" defaultValue={joki?.currentAbsoluteStar ?? ""} min="0" name="currentStar" placeholder="Bintang saat ini" type="number" /></div></fieldset>
    <fieldset><legend className="form-label">Jenis Layanan</legend><div className="mt-3 flex flex-wrap gap-3">{SERVICE_MODES.map((mode) => <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-200" key={mode}><input defaultChecked={joki ? joki.serviceModes?.includes(mode) : mode === "ACCOUNT"} name="serviceModes" type="checkbox" value={mode} />{SERVICE_MODE_META[mode].label}</label>)}</div><p className="mt-2 text-xs text-slate-500">Pilih minimal satu layanan yang dapat ditangani Joki.</p></fieldset>
    <fieldset><legend className="form-label">Role utama</legend><div className="mt-3 flex flex-wrap gap-3">{Object.entries(JOKI_ROLE_META).map(([value, label]) => <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-200" key={value}><input defaultChecked={joki?.roles?.includes(value)} name="roles" type="checkbox" value={value} />{label}</label>)}</div></fieldset>
    <div className="grid gap-5 sm:grid-cols-2"><label className="form-label">Ketersediaan<select className="field-control mt-2" defaultValue={availability} disabled={hasActiveAssignment} name="availability">{Object.entries(JOKI_AVAILABILITY_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select>{hasActiveAssignment && <><input name="availability" type="hidden" value="BUSY" /><span className="mt-2 block text-xs text-amber-200">Joki dengan penugasan aktif tetap Sibuk.</span></>}</label><label className="form-label">Hero pool <span className="text-slate-500">(satu hero per baris)</span><textarea className="field-control mt-2 min-h-28" defaultValue={joki?.heroPool?.join("\n") ?? ""} name="heroPool" placeholder="Ling&#10;Hayabusa" /></label></div>
    <label className="form-label">Catatan internal <span className="text-slate-500">(opsional)</span><textarea className="field-control mt-2 min-h-28" defaultValue={joki?.notes ?? ""} name="notes" /></label>
    <button className="primary-button" type="submit">{submitLabel}</button>
  </form>;
}
