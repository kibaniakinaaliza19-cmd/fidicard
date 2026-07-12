"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Coffee, Check, Apple, Smartphone } from "lucide-react";
import { getJoinBusiness } from "@/data/joinBusinesses";
import { addLocalClient } from "@/lib/localClients";

// Frozen public-page palette (per spec)
const CORAL = "#E8503D";
const GOLD = "#F4B942";
const WARM = "#FFF8EF";
const ANTHRACITE = "#2B1E1A";
const SUCCESS = "#4CAF7D";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Fields {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthday: string;
}

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? "").toString();
  const business = useMemo(() => getJoinBusiness(code), [code]);

  const [fields, setFields] = useState<Fields>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    birthday: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.firstName.trim()) return setError("Votre prénom est requis.");
    if (!fields.phone.trim()) return setError("Votre numéro de téléphone est requis.");
    if (!emailRe.test(fields.email.trim())) return setError("Votre email n'est pas valide.");
    setError(null);
    // Demo: add to the merchant's local client file (localStorage, no backend).
    addLocalClient({
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      phone: fields.phone.trim(),
      email: fields.email.trim(),
      birthday: fields.birthday,
      businessCode: code.toUpperCase(),
    });
    setSubmitted(true);
  }

  return (
    <main
      className="flex min-h-screen w-full items-center justify-center px-5 py-10"
      style={{
        background: `radial-gradient(120% 90% at 50% 0%, #3a281f 0%, ${ANTHRACITE} 45%, #1c1310 100%)`,
        color: WARM,
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-[420px]">
        {/* Welcome header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-2xl"
            style={{ background: `linear-gradient(140deg, ${CORAL}, ${GOLD})`, boxShadow: `0 14px 40px -10px ${CORAL}88` }}
          >
            {business.emoji === "☕" ? <Coffee size={28} color="#1A1210" strokeWidth={2.2} /> : <span>{business.emoji}</span>}
          </span>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: WARM }}>
            Bienvenue chez {business.name}
          </h1>
          <p className="mt-2 text-sm" style={{ color: `${WARM}99` }}>
            {submitted ? business.tagline : "Créez votre carte de fidélité en 30 secondes."}
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Prénom" value={fields.firstName} onChange={(v) => update("firstName", v)} placeholder="Jean" autoComplete="given-name" />
            <Field label="Nom" value={fields.lastName} onChange={(v) => update("lastName", v)} placeholder="Dupont" autoComplete="family-name" />
            <Field label="Téléphone" type="tel" value={fields.phone} onChange={(v) => update("phone", v)} placeholder="06 12 34 56 78" autoComplete="tel" />
            <Field label="Email" type="email" value={fields.email} onChange={(v) => update("email", v)} placeholder="jean.dupont@email.com" autoComplete="email" />
            <Field label="Date d'anniversaire" type="date" value={fields.birthday} onChange={(v) => update("birthday", v)} />

            {error && (
              <p className="text-sm" style={{ color: "#ff8a7a" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-2 w-full cursor-pointer rounded-xl py-3.5 text-base font-bold transition-transform hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: `linear-gradient(135deg, ${CORAL}, ${GOLD})`, color: "#1A1210", boxShadow: `0 12px 30px -10px ${CORAL}aa` }}
            >
              Recevoir ma carte
            </button>

            <p className="pt-1 text-center text-[11px]" style={{ color: `${WARM}55` }}>
              Sans mot de passe · Aucune vérification · Vos données restent chez {business.name}.
            </p>
          </form>
        ) : (
          <div className="flex flex-col items-center text-center">
            <span
              className="mb-5 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: `${SUCCESS}26` }}
            >
              <Check size={40} color={SUCCESS} strokeWidth={2.6} />
            </span>
            <h2 className="text-xl font-bold" style={{ color: WARM }}>
              Votre carte est prête 🎉
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: `${WARM}aa` }}>
              Bienvenue {fields.firstName} ! Ajoutez votre carte à votre téléphone.
            </p>

            <div className="mt-7 w-full space-y-3">
              <WalletButton icon={<Apple size={18} />} label="Ajouter à Apple Wallet" />
              <WalletButton icon={<Smartphone size={18} />} label="Ajouter à Google Wallet" />
            </div>

            <p className="mt-5 text-[12px]" style={{ color: `${WARM}66` }}>
              Vous pouvez fermer cette page.
            </p>
          </div>
        )}

        <p className="mt-10 text-center text-[11px]" style={{ color: `${WARM}44` }}>
          Propulsé par FidiCard
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium" style={{ color: "#FFF8EFcc" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-colors"
        style={{
          background: "rgba(255,248,239,0.05)",
          border: "1px solid rgba(255,248,239,0.14)",
          color: "#FFF8EF",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(244,185,66,0.6)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,248,239,0.14)")}
      />
    </label>
  );
}

function WalletButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      disabled
      className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-xl px-4 py-3.5 text-[14px] font-semibold"
      style={{ background: "rgba(255,248,239,0.06)", border: "1px solid rgba(255,248,239,0.12)", color: "#FFF8EF88" }}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ background: "rgba(244,185,66,0.16)", color: GOLD }}
      >
        Bientôt
      </span>
    </button>
  );
}
