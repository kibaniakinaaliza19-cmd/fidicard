"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Coffee,
  Sparkles,
  Pizza,
  Gift,
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  ArrowRight,
  Check,
  Apple,
  Smartphone,
  Zap,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import FidiLogo from "@/components/ui/FidiLogo";
import JoinCard from "@/components/join/JoinCard";
import { findJoinBusiness } from "@/data/joinBusinesses";
import { addLocalClient } from "@/lib/localClients";

// Frozen public-page palette (per spec)
const CORAL = "#E8503D";
const GOLD = "#F4B942";
const WARM = "#FFF8EF";
const ANTHRACITE = "#2B1E1A";
const SUCCESS = "#4CAF7D";
const INK = "#1A1210";

const HEAD_ICONS: Record<string, LucideIcon> = { coffee: Coffee, sparkles: Sparkles, pizza: Pizza, gift: Gift };
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Fields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthday: string;
}

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? "").toString();
  const business = useMemo(() => findJoinBusiness(code), [code]);

  const [fields, setFields] = useState<Fields>({ firstName: "", lastName: "", email: "", phone: "", birthday: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.firstName.trim()) return setError("Votre prénom est requis.");
    if (!emailRe.test(fields.email.trim())) return setError("Votre email n'est pas valide.");
    if (!fields.phone.trim()) return setError("Votre numéro de téléphone est requis.");
    setError(null);
    setLoading(true);
    // Demo: persist to the merchant's local client file (no backend yet).
    window.setTimeout(() => {
      addLocalClient({
        firstName: fields.firstName.trim(),
        lastName: fields.lastName.trim(),
        phone: fields.phone.trim(),
        email: fields.email.trim(),
        birthday: fields.birthday,
        businessCode: code.toUpperCase(),
      });
      setLoading(false);
      setSubmitted(true);
    }, 700);
  }

  const pageStyle: React.CSSProperties = {
    background: `radial-gradient(120% 90% at 50% 0%, #3a281f 0%, ${ANTHRACITE} 45%, #1c1310 100%)`,
    color: WARM,
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  };

  // Invalid code → clean 404 in the design system.
  if (!business) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center px-5 py-10" style={pageStyle}>
        <div className="flex w-full max-w-[420px] flex-col items-center text-center">
          <span
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "rgba(255,248,239,0.06)", border: "1px solid rgba(255,248,239,0.12)" }}
          >
            <QrCode size={28} style={{ color: `${WARM}88` }} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Ce lien n&rsquo;est plus valide</h1>
          <p className="mt-2 text-sm" style={{ color: `${WARM}99` }}>
            Le QR code que vous avez scanné n&rsquo;existe pas ou a expiré. Vérifiez auprès du commerçant.
          </p>
          <Footer />
        </div>
      </main>
    );
  }

  const HeadIcon = HEAD_ICONS[business.stampIcon] ?? Gift;
  const cumulWord = business.loyaltyMode === "points" ? "Cumulez des points" : "Cumulez des tampons";

  return (
    <main className="flex min-h-screen w-full justify-center px-5 py-10" style={pageStyle}>
      <div className="w-full max-w-[480px]">
        {/* 1. header */}
        <div className="mb-7 flex flex-col items-center text-center">
          <span
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl"
            style={{ background: `linear-gradient(140deg, ${CORAL}, ${GOLD})`, boxShadow: `0 14px 40px -12px ${CORAL}aa` }}
          >
            <HeadIcon size={28} color={INK} strokeWidth={2.2} />
          </span>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight" style={{ color: WARM }}>
            {business.name}
          </h1>
        </div>

        {/* 2. card preview — 3D + coral halo */}
        <div className="mb-9 flex justify-center" style={{ perspective: 1000 }}>
          <div
            style={{
              transform: "perspective(1000px) rotateX(8deg) rotateY(-4deg)",
              boxShadow: `0 40px 80px -20px rgba(232,80,61,0.4), 0 20px 40px -16px rgba(0,0,0,0.55)`,
              borderRadius: 16,
            }}
          >
            <JoinCard business={business} width={340} />
          </div>
        </div>

        {!submitted ? (
          <>
            {/* 3. title */}
            <div className="mb-5 text-center">
              <p className="text-[22px] font-bold leading-tight" style={{ color: WARM }}>
                Rejoignez notre
              </p>
              <p className="text-[22px] font-bold leading-tight" style={{ color: CORAL }}>
                programme de fidélité
              </p>
            </div>

            {/* 4. arguments */}
            <div className="mb-7 grid grid-cols-3 gap-3">
              <Argument icon={Gift} text={cumulWord} />
              <Argument icon={Zap} text="Inscription en 30 secondes" />
              <Argument icon={Smartphone} text="Votre carte dans votre téléphone" />
            </div>

            {/* 5. form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <IconField icon={User} value={fields.firstName} onChange={(v) => update("firstName", v)} placeholder="Prénom *" autoComplete="given-name" />
              <IconField icon={User} value={fields.lastName} onChange={(v) => update("lastName", v)} placeholder="Nom" autoComplete="family-name" />
              <IconField icon={Mail} type="email" value={fields.email} onChange={(v) => update("email", v)} placeholder="E-mail *" autoComplete="email" />
              <IconField icon={Phone} type="tel" value={fields.phone} onChange={(v) => update("phone", v)} placeholder="Téléphone *" autoComplete="tel" />
              <IconField icon={Calendar} type="date" value={fields.birthday} onChange={(v) => update("birthday", v)} placeholder="Date d'anniversaire" />

              {error && <p className="text-sm" style={{ color: "#ff8a7a" }}>{error}</p>}

              {/* 6. trust line */}
              <div className="flex items-center justify-center gap-1.5 pt-1 text-[12px]" style={{ color: `${WARM}66` }}>
                <Lock size={12} />
                <span>Vos données ne sont utilisées que par {business.name}.</span>
              </div>

              {/* 7. CTA */}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-80"
                style={{ background: `linear-gradient(to right, ${CORAL}, ${GOLD})`, color: INK, boxShadow: `0 14px 34px -12px ${CORAL}bb` }}
              >
                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1A1210] border-t-transparent" />
                ) : (
                  <>
                    Créer ma carte fidélité <ArrowRight size={18} strokeWidth={2.4} />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* 9. success */
          <div className="flex flex-col items-center text-center">
            <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${SUCCESS}26` }}>
              <Check size={40} color={SUCCESS} strokeWidth={2.6} />
            </span>
            <h2 className="text-[22px] font-bold" style={{ color: WARM }}>
              Votre carte est prête 🎉
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: `${WARM}aa` }}>
              Bienvenue {fields.firstName} !
            </p>

            <div className="mt-7 w-full space-y-3">
              <WalletButton icon={<Apple size={18} />} label="Ajouter à Apple Wallet" />
              <WalletButton icon={<Smartphone size={18} />} label="Ajouter à Google Wallet" />
            </div>
          </div>
        )}

        <Footer />
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function Argument({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Icon size={20} color={CORAL} strokeWidth={2.2} />
      <span className="text-[13px] leading-snug" style={{ color: `${WARM}cc` }}>
        {text}
      </span>
    </div>
  );
}

function IconField({
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: `${WARM}66` }} />
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl py-4 pl-12 pr-4 text-[15px] outline-none transition-colors"
        style={{
          background: "rgba(255,248,239,0.04)",
          border: "1px solid rgba(255,248,239,0.12)",
          color: WARM,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(232,80,61,0.6)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,248,239,0.12)")}
      />
    </div>
  );
}

function WalletButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      disabled
      className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-2xl px-4 py-3.5 text-[14px] font-semibold"
      style={{ background: "rgba(255,248,239,0.06)", border: "1px solid rgba(255,248,239,0.12)", color: `${WARM}88` }}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${GOLD}29`, color: GOLD }}>
        Bientôt disponible
      </span>
    </button>
  );
}

function Footer() {
  return (
    <div className="mt-10 flex items-center justify-center gap-2 text-[11px]" style={{ color: `${WARM}55` }}>
      <span>Propulsé par</span>
      <FidiLogo size={16} />
      <span className="font-semibold" style={{ color: `${WARM}88` }}>
        FidiCard
      </span>
    </div>
  );
}
