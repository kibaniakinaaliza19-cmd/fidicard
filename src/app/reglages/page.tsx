"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Info,
  User,
  Shield,
  Crown,
  Palette,
  Bell,
  Puzzle,
  Radio,
  Database,
  Terminal,
  LayoutDashboard,
  Mail,
  Phone,
  MapPin,
  Building2,
  Globe,
  Pencil,
  Check,
  Lock,
  ShieldCheck,
  Smartphone,
  Monitor,
  History,
  LogOut,
  CreditCard,
  Receipt,
  Sun,
  Moon,
  Zap,
  Share2,
  Wallet,
  Star,
  RefreshCw,
  Download,
  Upload,
  FileText,
  Save,
  Copy,
  KeyRound,
  Bug,
  ChevronRight,
  Users,
  QrCode,
  TrendingUp,
  Trash2,
  Package,
  ScanLine,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useUIStore } from "@/store/uiStore";
import { supabase } from "@/lib/supabase";
import { getLocalClients } from "@/lib/localClients";
import {
  useSettingsStore,
  ACCENTS,
  type AccentKey,
  type NotifPrefKey,
} from "@/store/settingsStore";
import { useSettingsHydration } from "@/components/reglages/useSettingsHydration";
import { usePublishStore } from "@/store/publishStore";
import { usePublishHydration, useCardCreated } from "@/lib/usePublish";
import { getConfigSteps, configProgress } from "@/lib/configSteps";
import { usePlan } from "@/lib/usePlan";
import { PLAN_LIMITS, PLAN_ORDER, nextPlan, type Plan } from "@/lib/plans";
import { PlanLockBadge } from "@/components/plan/PlanLock";
import {
  SoonBadge,
  DemoBadge,
  StatusDot,
  Toggle,
  SectionCard,
  SettingRow,
  AnimatedCounter,
} from "@/components/reglages/primitives";

/* -------------------------------------------------------------------------- */
/*  Section registry                                                          */
/* -------------------------------------------------------------------------- */

type SectionKey =
  | "overview"
  | "account"
  | "security"
  | "subscription"
  | "appearance"
  | "notifications"
  | "integrations"
  | "nfc"
  | "data"
  | "advanced";

const SECTIONS: { key: SectionKey; label: string; icon: typeof User }[] = [
  { key: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { key: "account", label: "Compte", icon: User },
  { key: "security", label: "Sécurité", icon: Shield },
  { key: "subscription", label: "Abonnement", icon: Crown },
  { key: "appearance", label: "Apparence", icon: Palette },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "integrations", label: "Intégrations", icon: Puzzle },
  { key: "nfc", label: "Lecteur NFC", icon: Radio },
  { key: "data", label: "Sauvegarde & données", icon: Database },
  { key: "advanced", label: "Avancé", icon: Terminal },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

const SECTION_KEYS = new Set(SECTIONS.map((s) => s.key));
function isSectionKey(v: string | null): v is SectionKey {
  return !!v && SECTION_KEYS.has(v as SectionKey);
}

export default function ReglagesPage() {
  return (
    <Suspense fallback={null}>
      <ReglagesInner />
    </Suspense>
  );
}

function ReglagesInner() {
  useSettingsHydration();
  usePublishHydration();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [active, setActive] = useState<SectionKey>(isSectionKey(initialTab) ? initialTab : "overview");
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);

  return (
    <div>
      <PageHeader title="Réglages" subtitle="Le centre de contrôle de votre commerce" />

      <div className="px-8 pb-16">
        {/* demo banner */}
        <div
          className="mb-6 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs"
          style={{ borderColor: "var(--border-strong)", background: "var(--panel-soft)", color: "var(--text-dim)" }}
        >
          <Info size={14} className="text-[var(--accent-1)]" />
          Mode démonstration — l&rsquo;apparence, les préférences et les exports fonctionnent réellement. Le paiement, le NFC
          physique et la synchronisation serveur arrivent dans les prochaines briques.
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          {/* -------- section nav -------- */}
          <nav className="lg:sticky lg:top-4 lg:self-start">
            <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const on = active === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setActive(s.key)}
                    className="group flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      color: on ? "var(--text)" : "var(--text-dim)",
                      background: on ? "var(--panel-soft)" : "transparent",
                    }}
                  >
                    <Icon size={16} style={{ color: on ? "var(--accent-1)" : "var(--text-faint)" }} />
                    <span className="whitespace-nowrap">{s.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <LogoutButton />
            </div>
          </nav>

          {/* -------- active panel -------- */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                {active === "overview" && <OverviewSection onGo={setActive} />}
                {active === "account" && <AccountSection />}
                {active === "security" && <SecuritySection />}
                {active === "subscription" && <SubscriptionSection />}
                {active === "appearance" && <AppearanceSection />}
                {active === "notifications" && <NotificationsSection />}
                {active === "integrations" && <IntegrationsSection />}
                {active === "nfc" && <NfcSection />}
                {active === "data" && <DataSection />}
                {active === "advanced" && <AdvancedSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Vue d'ensemble                                                             */
/* -------------------------------------------------------------------------- */

const STATS = [
  { label: "Scans aujourd'hui", value: 124, delta: "+12%", icon: ScanLine },
  { label: "Clients actifs", value: 312, delta: "+8%", icon: Users },
  { label: "Cartes créées", value: 56, delta: "+15%", icon: CreditCard },
  { label: "Clients fidèles", value: 89, delta: "+5%", icon: Star },
  { label: "Notifications envoyées", value: 1847, delta: "+22%", icon: Bell },
  { label: "Campagnes actives", value: 3, delta: "+1", icon: TrendingUp },
];

function OverviewSection({ onGo }: { onGo: (s: SectionKey) => void }) {
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const pushToast = useUIStore((s) => s.pushToast);
  const published = usePublishStore((s) => s.published);
  const cardCreated = useCardCreated();
  const steps = getConfigSteps(published, cardCreated);
  const pct = configProgress(steps);
  const remaining = steps.filter((s) => !s.done).length;

  const shortcuts: { label: string; icon: typeof User; href?: string; soon?: boolean }[] = [
    { label: "Créer une carte", icon: CreditCard, href: "/carte" },
    { label: "Mes clients", icon: Users, href: "/clients" },
    { label: "Mon QR d'inscription", icon: QrCode, href: "/scanner" },
    { label: "Statistiques", icon: TrendingUp, href: "/analyse" },
    { label: "Exporter les données", icon: Download, href: undefined, soon: false },
    { label: "Créer une campagne", icon: Zap, soon: true },
  ];

  return (
    <>
      {/* animated stat tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl border p-4 transition-transform hover:-translate-y-0.5"
              style={{ background: "rgba(245,245,244,0.04)", borderColor: "var(--border)" }}
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon size={16} className="text-[var(--accent-1)]" />
                <span className="text-xs font-medium" style={{ color: "#4CAF7D" }}>
                  {s.delta}
                </span>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
                <AnimatedCounter value={s.value} reduceMotion={reduceMotion} />
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-dim)" }}>
                {s.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* setup progress (gated QR concept) */}
      <SectionCard title="Configuration du commerce" subtitle="Le QR Code est généré une fois toutes les étapes terminées.">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(245,245,244,0.10)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, var(--accent-1), var(--accent-2))" }}
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
            {pct}%
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {steps.map((step) => (
            <div key={step.key} className="flex items-center gap-2.5 text-sm">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full"
                style={{
                  background: step.done ? "#4CAF7D22" : "rgba(245,245,244,0.06)",
                  color: step.done ? "#4CAF7D" : "var(--text-faint)",
                }}
              >
                {step.done ? <Check size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <span style={{ color: step.done ? "var(--text)" : "var(--text-dim)" }}>{step.label}</span>
              {step.key === "card" && !step.done && (
                <Link href="/carte" className="ml-auto text-xs font-medium text-[var(--accent-1)]">Créer</Link>
              )}
              {step.key === "publish" && !step.done && (
                <Link href="/scanner" className="ml-auto text-xs font-medium text-[var(--accent-1)]">Publier</Link>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs" style={{ color: "var(--text-faint)" }}>
          {remaining === 0
            ? "Votre programme est prêt — votre QR Code d'inscription est actif."
            : `Encore ${remaining} étape${remaining > 1 ? "s" : ""} — rendez-vous sur Scanner pour publier votre programme.`}
        </p>
      </SectionCard>

      {/* shortcuts */}
      <SectionCard title="Raccourcis rapides">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shortcuts.map((sc) => {
            const Icon = sc.icon;
            const inner = (
              <>
                <Icon size={16} className="text-[var(--accent-1)]" />
                <span className="flex-1 text-left text-sm" style={{ color: "var(--text)" }}>
                  {sc.label}
                </span>
                {sc.soon ? <SoonBadge /> : <ChevronRight size={15} style={{ color: "var(--text-faint)" }} />}
              </>
            );
            const cls =
              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors hover:bg-[var(--panel-soft)]";
            const style = { borderColor: "var(--border)" };
            if (sc.href)
              return (
                <Link key={sc.label} href={sc.href} className={cls} style={style}>
                  {inner}
                </Link>
              );
            return (
              <button
                key={sc.label}
                type="button"
                onClick={() => (sc.soon ? pushToast("Cette fonctionnalité arrive bientôt.") : onGo("data"))}
                className={cls}
                style={style}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Compte                                                                     */
/* -------------------------------------------------------------------------- */

function AccountSection() {
  const pushToast = useUIStore((s) => s.pushToast);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "Café Madeleine",
    email: "contact@cafemadeleine.fr",
    phone: "+33 6 12 34 56 78",
    address: "12 rue des Lilas, 75011 Paris",
    siret: "824 519 002 00013",
    website: "cafemadeleine.fr",
  });

  const fields: { key: keyof typeof form; label: string; icon: typeof User }[] = [
    { key: "name", label: "Nom du commerce", icon: Building2 },
    { key: "email", label: "Email", icon: Mail },
    { key: "phone", label: "Téléphone", icon: Phone },
    { key: "address", label: "Adresse", icon: MapPin },
    { key: "siret", label: "SIRET", icon: FileText },
    { key: "website", label: "Site internet", icon: Globe },
  ];

  return (
    <>
      <SectionCard
        title="Compte"
        right={
          <button
            type="button"
            onClick={() => {
              if (editing) pushToast("Informations enregistrées (démo).");
              setEditing((e) => !e);
            }}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            {editing ? <Check size={13} /> : <Pencil size={13} />}
            {editing ? "Enregistrer" : "Modifier"}
          </button>
        }
      >
        <div className="mb-5 flex items-center gap-4">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold"
            style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", color: "#fff" }}
          >
            CM
          </span>
          <button
            type="button"
            onClick={() => pushToast("Changement de logo bientôt disponible.")}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
          >
            Changer le logo <SoonBadge />
          </button>
        </div>

        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          {fields.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.key} className="flex items-center gap-3 py-3">
                <Icon size={16} style={{ color: "var(--text-dim)" }} />
                <span className="w-36 shrink-0 text-sm" style={{ color: "var(--text-dim)" }}>
                  {f.label}
                </span>
                {editing ? (
                  <input
                    value={form[f.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="flex-1 rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-1)]"
                    style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                  />
                ) : (
                  <span className="flex-1 truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                    {form[f.key]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sécurité                                                                   */
/* -------------------------------------------------------------------------- */

const SESSIONS = [
  { icon: Monitor, device: "MacBook Pro · Chrome", where: "Paris, FR · 92.184.104.xx", when: "Actif maintenant", current: true },
  { icon: Smartphone, device: "iPhone 15 · Safari", where: "Paris, FR · 92.184.104.xx", when: "Il y a 2 h", current: false },
];

const LOGIN_HISTORY = [
  { when: "13 juil. 2026, 09:14", ip: "92.184.104.22", ok: true },
  { when: "12 juil. 2026, 18:02", ip: "92.184.104.22", ok: true },
  { when: "10 juil. 2026, 08:47", ip: "88.120.53.10", ok: true },
];

function SecuritySection() {
  const pushToast = useUIStore((s) => s.pushToast);
  return (
    <>
      <SectionCard title="Authentification">
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          <SettingRow
            icon={Lock}
            label="Mot de passe"
            hint="Dernière modification il y a 3 mois"
            control={
              <>
                <span className="tracking-widest" style={{ color: "var(--text-faint)" }}>••••••••</span>
                <SoonBadge />
              </>
            }
          />
          <SettingRow
            icon={ShieldCheck}
            label="Authentification à deux facteurs (2FA)"
            hint="Non activée"
            control={
              <>
                <Toggle checked={false} disabled />
                <SoonBadge />
              </>
            }
          />
        </div>
      </SectionCard>

      <SectionCard title="Sessions actives" right={<DemoBadge />}>
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          {SESSIONS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.device} className="flex items-center gap-3 py-3">
                <Icon size={18} style={{ color: "var(--text-dim)" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm" style={{ color: "var(--text)" }}>{s.device}</p>
                  <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>{s.where}</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: s.current ? "#4CAF7D" : "var(--text-faint)" }}>
                  <StatusDot ok={s.current} /> {s.when}
                </span>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => pushToast("Déconnexion de tous les appareils (démo).")}
          className="mt-4 w-full rounded-xl border py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          Déconnecter tous les appareils
        </button>
      </SectionCard>

      <SectionCard title="Historique des connexions" right={<DemoBadge />}>
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          {LOGIN_HISTORY.map((h, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
              <History size={15} style={{ color: "var(--text-faint)" }} />
              <span className="flex-1" style={{ color: "var(--text)" }}>{h.when}</span>
              <span className="tabular-nums text-xs" style={{ color: "var(--text-dim)" }}>{h.ip}</span>
              <StatusDot ok={h.ok} />
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Abonnement                                                                 */
/* -------------------------------------------------------------------------- */

const INVOICES = [
  { id: "FID-2026-07", date: "1 juil. 2026", amount: "69,90 €" },
  { id: "FID-2026-06", date: "1 juin 2026", amount: "69,90 €" },
  { id: "FID-2026-05", date: "1 mai 2026", amount: "69,90 €" },
];

function planFeatureLines(limits: (typeof PLAN_LIMITS)[Plan]): string[] {
  const lines: string[] = [
    limits.notifsParMois === -1 ? "Notifications illimitées" : `${limits.notifsParMois} notifications / mois`,
  ];
  if (limits.avisGoogleAuto) lines.push("Avis Google automatisés");
  if (limits.automatisations) lines.push("Automatisations (anniversaire, client inactif)");
  if (limits.statsAvancees) lines.push("Statistiques avancées");
  if (limits.multiEtablissements) lines.push("Multi-établissements");
  return lines;
}

function planUpgradeLines(current: (typeof PLAN_LIMITS)[Plan], upgraded: (typeof PLAN_LIMITS)[Plan]): string[] {
  const lines: string[] = [];
  if (upgraded.notifsParMois === -1 && current.notifsParMois !== -1) lines.push("Notifications illimitées");
  else if (upgraded.notifsParMois > current.notifsParMois) lines.push(`${upgraded.notifsParMois} notifications / mois (au lieu de ${current.notifsParMois})`);
  if (upgraded.avisGoogleAuto && !current.avisGoogleAuto) lines.push("Avis Google automatisés");
  if (upgraded.automatisations && !current.automatisations) lines.push("Automatisations (anniversaire, client inactif)");
  if (upgraded.statsAvancees && !current.statsAvancees) lines.push("Statistiques avancées");
  if (upgraded.multiEtablissements && !current.multiEtablissements) lines.push("Multi-établissements");
  return lines;
}

function SubscriptionSection() {
  const pushToast = useUIStore((s) => s.pushToast);
  const { plan, limits, setPlan } = usePlan();
  const upgrade = nextPlan(plan);
  const upgradeLines = upgrade ? planUpgradeLines(limits, PLAN_LIMITS[upgrade]) : [];

  return (
    <>
      <SectionCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Crown size={22} className="mt-0.5 text-[var(--accent-1)]" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold" style={{ color: "var(--text)" }}>Plan {limits.label}</p>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#4CAF7D26", color: "#4CAF7D" }}>
                  Actif
                </span>
              </div>
              <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
                {limits.prix}/mois — {planFeatureLines(limits).join(", ")}.
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                Prochain renouvellement le 1 août 2026
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => pushToast("Gestion de l'abonnement bientôt disponible.")}
              className="flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            >
              Modifier <SoonBadge />
            </button>
            <button
              type="button"
              onClick={() => pushToast("Annulation gérée par le support pour le moment.")}
              className="rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:text-[#E8503D]"
              style={{ color: "var(--text-faint)" }}
            >
              Annuler l&rsquo;abonnement
            </button>
          </div>
        </div>
      </SectionCard>

      {upgrade && (
        <SectionCard
          title={`Débloquez plus avec ${PLAN_LIMITS[upgrade].label}`}
          subtitle={`${PLAN_LIMITS[upgrade].prix}/mois`}
          right={
            <button
              type="button"
              onClick={() => {
                setPlan(upgrade);
                pushToast(`Passé au plan ${PLAN_LIMITS[upgrade].label} (démo).`);
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.03]"
              style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
            >
              <Zap size={13} /> Passer à {PLAN_LIMITS[upgrade].label}
            </button>
          }
        >
          <ul className="flex flex-col gap-2">
            {upgradeLines.map((line) => (
              <li key={line} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text)" }}>
                <Check size={14} className="shrink-0 text-[#4CAF7D]" /> {line}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Changer de plan" subtitle="Contrôle de démonstration — simule le plan de votre commerce sans paiement réel.">
        <div className="grid grid-cols-3 gap-2">
          {PLAN_ORDER.map((p) => {
            const on = plan === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  if (!on) {
                    setPlan(p);
                    pushToast(`Plan ${PLAN_LIMITS[p].label} activé (démo).`);
                  }
                }}
                className="flex flex-col items-center gap-1 rounded-xl border py-3 text-center transition-colors"
                style={{
                  borderColor: on ? "var(--accent-1)" : "var(--border-strong)",
                  background: on ? "var(--accent-glow)" : "transparent",
                }}
              >
                <span className="text-sm font-semibold" style={{ color: on ? "var(--accent-1)" : "var(--text)" }}>
                  {PLAN_LIMITS[p].label}
                </span>
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>{PLAN_LIMITS[p].prix}/mois</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Moyen de paiement" right={<SoonBadge label="Stripe · Bientôt" />}>
        <div className="flex items-center gap-3">
          <CreditCard size={20} style={{ color: "var(--text-dim)" }} />
          <span className="text-sm" style={{ color: "var(--text)" }}>Visa •••• 4242</span>
          <span className="ml-auto text-xs" style={{ color: "var(--text-faint)" }}>expire 08/28</span>
        </div>
      </SectionCard>

      <SectionCard title="Factures">
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          {INVOICES.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 py-3 text-sm">
              <Receipt size={16} style={{ color: "var(--text-dim)" }} />
              <span className="flex-1" style={{ color: "var(--text)" }}>{inv.id}</span>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>{inv.date}</span>
              <span className="w-16 text-right font-medium tabular-nums" style={{ color: "var(--text)" }}>{inv.amount}</span>
              <button type="button" onClick={() => pushToast("Téléchargement des factures bientôt disponible.")} className="text-[var(--text-faint)] transition-colors hover:text-[var(--accent-1)]">
                <Download size={15} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Apparence  (real)                                                          */
/* -------------------------------------------------------------------------- */

function AppearanceSection() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const accent = useSettingsStore((s) => s.accent);
  const setAccent = useSettingsStore((s) => s.setAccent);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion);

  return (
    <>
      <SectionCard title="Thème">
        <div className="grid grid-cols-2 gap-3">
          {(["dark", "light"] as const).map((mode) => {
            const on = theme === mode;
            const Icon = mode === "dark" ? Moon : Sun;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                className="flex items-center gap-3 rounded-2xl border p-4 transition-all"
                style={{
                  borderColor: on ? "var(--accent-1)" : "var(--border-strong)",
                  background: on ? "var(--accent-glow)" : "transparent",
                }}
              >
                <Icon size={18} style={{ color: on ? "var(--accent-1)" : "var(--text-dim)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  Mode {mode === "dark" ? "sombre" : "clair"}
                </span>
                {on && <Check size={16} className="ml-auto text-[var(--accent-1)]" />}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Couleur d'accent" subtitle="Appliquée instantanément à toute l'interface.">
        <div className="flex flex-wrap gap-3">
          {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
            const a = ACCENTS[key];
            const on = accent === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAccent(key)}
                title={a.label}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${a.a1}, ${a.a2})`,
                  boxShadow: on ? `0 0 0 2px var(--bg), 0 0 0 4px ${a.a1}` : "none",
                }}
              >
                {on && <Check size={16} className="text-white" />}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Animations">
        <SettingRow
          icon={Zap}
          label="Réduire les animations"
          hint="Désactive les transitions et effets de mouvement."
          control={<Toggle checked={reduceMotion} onChange={setReduceMotion} />}
        />
      </SectionCard>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Notifications  (real toggles)                                              */
/* -------------------------------------------------------------------------- */

function NotificationsSection() {
  const notif = useSettingsStore((s) => s.notif);
  const toggleNotif = useSettingsStore((s) => s.toggleNotif);
  const { limits } = usePlan();

  const channels: { key: NotifPrefKey; label: string; icon: typeof Bell }[] = [
    { key: "push", label: "Notifications Push", icon: Bell },
    { key: "email", label: "Emails", icon: Mail },
    { key: "sms", label: "SMS", icon: Smartphone },
  ];
  const events: { key: NotifPrefKey; label: string; locked?: boolean }[] = [
    { key: "birthday", label: "Anniversaire client", locked: !limits.automatisations },
    { key: "loyal", label: "Client fidèle" },
    { key: "cardCreated", label: "Carte créée" },
    { key: "cardUsed", label: "Carte utilisée" },
    { key: "promos", label: "Offres promotionnelles" },
    { key: "campaigns", label: "Campagnes" },
    { key: "googleReviews", label: "Nouveaux avis Google", locked: !limits.avisGoogleAuto },
  ];

  return (
    <>
      <SectionCard title="Canaux">
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          {channels.map((c) => (
            <SettingRow
              key={c.key}
              icon={c.icon}
              label={c.label}
              control={<Toggle checked={notif[c.key]} onChange={() => toggleNotif(c.key)} />}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Événements" subtitle="Choisissez ce qui déclenche une notification.">
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          {events.map((e) => (
            <SettingRow
              key={e.key}
              label={e.label}
              muted={e.locked}
              control={e.locked ? <PlanLockBadge requiredPlan="pro" /> : <Toggle checked={notif[e.key]} onChange={() => toggleNotif(e.key)} />}
            />
          ))}
        </div>
      </SectionCard>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Intégrations                                                               */
/* -------------------------------------------------------------------------- */

const INTEGRATIONS = [
  { label: "Google Business", icon: Building2, desc: "Fiche & avis" },
  { label: "Avis Google", icon: Star, desc: "Collecte automatique" },
  { label: "Apple Wallet", icon: Wallet, desc: "Cartes iOS" },
  { label: "Google Wallet", icon: Wallet, desc: "Cartes Android" },
  { label: "Stripe", icon: CreditCard, desc: "Paiements & abonnements" },
  { label: "Zapier", icon: Zap, desc: "Automatisations" },
  { label: "API", icon: Terminal, desc: "Accès développeur" },
  { label: "Webhooks", icon: Share2, desc: "Événements sortants" },
];

function IntegrationsSection() {
  return (
    <SectionCard title="Intégrations" subtitle="Connectez FidiCard à vos outils. Disponibles dans les prochaines briques.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.label}
              className="flex items-center gap-3 rounded-2xl border p-4"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(245,245,244,0.06)" }}>
                <Icon size={18} style={{ color: "var(--text-dim)" }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>{it.label}</p>
                <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>{it.desc}</p>
              </div>
              <SoonBadge />
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Lecteur NFC                                                                */
/* -------------------------------------------------------------------------- */

const NFC_SCANS = [
  { when: "Aujourd'hui, 14:32", label: "Passage validé · Léa M." },
  { when: "Aujourd'hui, 12:08", label: "Nouvelle carte · Karim B." },
  { when: "Hier, 17:45", label: "Passage validé · Sophie D." },
];

function NfcSection() {
  const pushToast = useUIStore((s) => s.pushToast);
  const [testing, setTesting] = useState(false);

  function testReader() {
    if (testing) return;
    setTesting(true);
    pushToast("Test du lecteur en cours…");
    setTimeout(() => {
      setTesting(false);
      pushToast("Lecteur NFC opérationnel (simulation).");
    }, 1500);
  }

  const actions: { label: string; icon: typeof Radio; onClick: () => void; danger?: boolean }[] = [
    { label: "Reconnecter", icon: RefreshCw, onClick: () => pushToast("Reconnexion du lecteur (démo).") },
    { label: "Remplacer un lecteur", icon: Package, onClick: () => pushToast("Remplacement de lecteur bientôt disponible.") },
    { label: "Déclarer perdu", icon: Trash2, onClick: () => pushToast("Signalement enregistré (démo)."), danger: true },
    { label: "Commander un lecteur", icon: Package, onClick: () => pushToast("La boutique de lecteurs arrive bientôt.") },
  ];

  return (
    <>
      <SectionCard
        title="Lecteur NFC"
        subtitle="Le NFC deviendra le système principal ; le QR Code reste en solution alternative."
        right={<DemoBadge />}
      >
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
          style={{ borderColor: "var(--border)", background: "rgba(76,175,125,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(245,245,244,0.06)" }}>
              <Radio size={20} className="text-[var(--accent-1)]" />
            </span>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                <StatusDot ok /> Connecté <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>(simulation)</span>
              </p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>N° FIDI-NFC-0A7F · dernière synchro il y a 4 min</p>
            </div>
          </div>
          <button
            type="button"
            onClick={testReader}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", opacity: testing ? 0.7 : 1 }}
          >
            <RefreshCw size={14} className={testing ? "animate-spin" : ""} /> {testing ? "Test…" : "Tester le lecteur"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className="flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium transition-colors hover:bg-[var(--panel-soft)]"
                style={{ borderColor: "var(--border)", color: a.danger ? "#E8503D" : "var(--text)" }}
              >
                <Icon size={16} style={{ color: a.danger ? "#E8503D" : "var(--text-dim)" }} />
                {a.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Firmware">
        <SettingRow
          icon={RefreshCw}
          label="Version 2.4.1"
          hint="Mise à jour 2.5.0 disponible"
          control={
            <button
              type="button"
              onClick={() => pushToast("Mise à jour du firmware bientôt disponible.")}
              className="rounded-xl border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            >
              Mettre à jour <SoonBadge />
            </button>
          }
        />
      </SectionCard>

      <SectionCard title="Historique des scans" right={<DemoBadge />}>
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          {NFC_SCANS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
              <ScanLine size={15} style={{ color: "var(--text-faint)" }} />
              <span className="flex-1" style={{ color: "var(--text)" }}>{s.label}</span>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>{s.when}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sauvegarde & données  (real export)                                        */
/* -------------------------------------------------------------------------- */

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DataSection() {
  const pushToast = useUIStore((s) => s.pushToast);
  const autosave = useSettingsStore((s) => s.autosave);
  const setAutosave = useSettingsStore((s) => s.setAutosave);

  function exportJSON() {
    const clients = getLocalClients();
    let card: unknown = null;
    try {
      const raw = localStorage.getItem("fidicard-card-doc");
      if (raw) card = JSON.parse(raw);
    } catch {}
    const payload = { exportedAt: new Date().toISOString(), business: "Café Madeleine", clients, card };
    download("fidicard-export.json", JSON.stringify(payload, null, 2), "application/json");
    pushToast(`Export JSON — ${clients.length} client(s).`);
  }

  function exportCSV() {
    const clients = getLocalClients();
    const header = "Prénom,Nom,Téléphone,Email,Anniversaire,Inscrit le";
    const rows = clients.map((c) =>
      [c.firstName, c.lastName, c.phone, c.email, c.birthday, new Date(c.createdAt).toLocaleDateString("fr-FR")]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    download("fidicard-clients.csv", [header, ...rows].join("\n"), "text/csv");
    pushToast(`Export CSV — ${clients.length} client(s).`);
  }

  const docs = ["Factures", "Contrats", "CGU", "Mentions légales"];

  return (
    <>
      <SectionCard title="Sauvegarde">
        <SettingRow
          icon={Save}
          label="Sauvegarde automatique"
          hint="Dernière sauvegarde : aujourd'hui, 14:32"
          control={<Toggle checked={autosave} onChange={setAutosave} />}
        />
        <button
          type="button"
          onClick={() => pushToast("Restauration bientôt disponible.")}
          className="mt-2 flex items-center gap-2 text-sm font-medium text-[var(--accent-1)]"
        >
          <RefreshCw size={14} /> Restaurer une sauvegarde <SoonBadge />
        </button>
      </SectionCard>

      <SectionCard title="Exporter les données" subtitle="JSON et CSV fonctionnent réellement.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={exportJSON} className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}>
            <Download size={14} /> JSON
          </button>
          <button type="button" onClick={exportCSV} className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}>
            <Download size={14} /> CSV
          </button>
          <button type="button" onClick={() => pushToast("Export Excel bientôt disponible.")} className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium opacity-70" style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}>
            Excel <SoonBadge />
          </button>
          <button type="button" onClick={() => pushToast("Export PDF bientôt disponible.")} className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium opacity-70" style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}>
            PDF <SoonBadge />
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Importer des clients">
        <button
          type="button"
          onClick={() => pushToast("Import CSV / Excel bientôt disponible.")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-6 text-sm font-medium"
          style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
        >
          <Upload size={16} /> Importer un fichier CSV ou Excel <SoonBadge />
        </button>
      </SectionCard>

      <SectionCard title="Documents">
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
          {docs.map((d) => (
            <SettingRow
              key={d}
              icon={FileText}
              label={d}
              control={
                <button type="button" onClick={() => pushToast(`${d} bientôt disponibles.`)} className="text-[var(--text-faint)]">
                  <ChevronRight size={16} />
                </button>
              }
            />
          ))}
        </div>
      </SectionCard>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Avancé                                                                     */
/* -------------------------------------------------------------------------- */

const API_KEY = "sk_demo_fidi_9c1f4b7a2e8d6035";

function AdvancedSection() {
  const pushToast = useUIStore((s) => s.pushToast);
  const developerMode = useSettingsStore((s) => s.developerMode);
  const setDeveloperMode = useSettingsStore((s) => s.setDeveloperMode);
  const [revealed, setRevealed] = useState(false);

  return (
    <>
      <SectionCard title="Développeur">
        <SettingRow
          icon={Bug}
          label="Mode développeur"
          hint="Affiche la clé API, les webhooks et les logs."
          control={<Toggle checked={developerMode} onChange={setDeveloperMode} />}
        />
      </SectionCard>

      {developerMode && (
        <>
          <SectionCard title="Clé API" right={<DemoBadge />}>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border-strong)" }}>
              <KeyRound size={15} style={{ color: "var(--text-dim)" }} />
              <code className="flex-1 truncate text-sm" style={{ color: "var(--text)" }}>
                {revealed ? API_KEY : "sk_demo_fidi_••••••••••••••••"}
              </code>
              <button type="button" onClick={() => setRevealed((r) => !r)} className="text-xs font-medium text-[var(--accent-1)]">
                {revealed ? "Masquer" : "Afficher"}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(API_KEY).catch(() => {});
                  pushToast("Clé API copiée.");
                }}
                className="text-[var(--text-faint)] transition-colors hover:text-[var(--accent-1)]"
              >
                <Copy size={15} />
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Webhooks" right={<SoonBadge />}>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border-strong)" }}>
              <Share2 size={15} style={{ color: "var(--text-dim)" }} />
              <span className="flex-1 truncate text-sm" style={{ color: "var(--text-faint)" }}>https://votre-domaine.fr/webhooks/fidicard</span>
            </div>
          </SectionCard>

          <SectionCard title="Logs récents" right={<DemoBadge />}>
            <div className="rounded-xl border p-3 font-mono text-xs" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
              <p>[14:32:04] card.scanned reader=FIDI-NFC-0A7F ok</p>
              <p>[14:31:58] client.created source=nfc id=cl_8842</p>
              <p>[12:08:11] card.scanned reader=FIDI-NFC-0A7F ok</p>
            </div>
          </SectionCard>
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Logout (real)                                                              */
/* -------------------------------------------------------------------------- */

function LogoutButton() {
  const router = useRouter();
  const pushToast = useUIStore((s) => s.pushToast);
  async function handleLogout() {
    try {
      await supabase?.auth.signOut();
    } catch {}
    pushToast("Vous avez été déconnecté.");
    router.push("/");
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition-colors hover:bg-[rgba(232,80,61,0.10)]"
      style={{ borderColor: "rgba(232,80,61,0.25)", color: "#E8503D" }}
    >
      <LogOut size={16} /> Se déconnecter
    </button>
  );
}
