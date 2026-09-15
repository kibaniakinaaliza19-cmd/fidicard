"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ScanLine,
  Check,
  PartyPopper,
  UserPlus,
  History,
  AlertTriangle,
  QrCode,
} from "lucide-react";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { useClientsStore, type LoyaltyClient } from "@/store/clientsStore";
import type { ScanResult } from "@/lib/loyalty";

/**
 * Encaissement d'un passage — la partie FONCTIONNELLE du scan.
 * En production, la caméra lit le QR unique de la carte client (code_client) ;
 * en démo on sélectionne le client ou on saisit son code, puis le moteur de
 * règles (lib/loyalty.ts) s'exécute : tampon/points ajoutés, paliers vérifiés,
 * récompense débloquée, historique mis à jour — exactement ce qui se passera
 * sur la carte Wallet du client.
 */
export default function ScanSimulator() {
  const config = useLoyaltyStore((s) => s.config);
  const clients = useClientsStore((s) => s.clients);
  const scan = useClientsStore((s) => s.scan);
  const addClient = useClientsStore((s) => s.addClient);
  const findByCode = useClientsStore((s) => s.findByCode);

  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? "");
  const [codeInput, setCodeInput] = useState("");
  const [montant, setMontant] = useState("");
  const [newName, setNewName] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scannedClient, setScannedClient] = useState<LoyaltyClient | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = clients.find((c) => c.id === selectedId) ?? clients[0];
  const needsMontant =
    config.mode === "points" ||
    (config.mode === "stamps" && config.regle.type !== "passage");

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  function doScan() {
    let client = selected;
    if (codeInput.trim()) {
      const byCode = findByCode(codeInput);
      if (!byCode) {
        setResult({
          ok: false,
          raison: `Code « ${codeInput.trim()} » inconnu — vérifiez la carte du client.`,
          tamponsAvant: 0, tamponsApres: 0, pointsAvant: 0, pointsApres: 0,
          paliersDeclenches: [], prochainPalier: null, restantAvantPalier: 0, carteCompletee: false,
        });
        setScannedClient(null);
        return;
      }
      client = byCode;
      setSelectedId(byCode.id);
    }
    if (!client) return;
    const m = needsMontant ? Number(montant.replace(",", ".")) : undefined;
    if (needsMontant && (!m || m <= 0)) {
      setResult({
        ok: false,
        raison: "Saisissez le montant payé par le client.",
        tamponsAvant: 0, tamponsApres: 0, pointsAvant: 0, pointsApres: 0,
        paliersDeclenches: [], prochainPalier: null, restantAvantPalier: 0, carteCompletee: false,
      });
      setScannedClient(client);
      return;
    }
    const r = scan(client.id, config, m);
    if (!r) return;
    setResult(r);
    setScannedClient(client);
    setMontant("");
    // écran de confirmation : fermeture auto sauf récompense (le commerçant confirme)
    if (r.ok && r.paliersDeclenches.length === 0) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => setResult(null), 3000);
    }
  }

  const progressLine = useMemo(() => {
    if (!result || !result.ok || !scannedClient) return "";
    if (config.mode === "stamps") {
      const shown = result.carteCompletee ? config.totalStamps : result.tamponsApres;
      const next = result.prochainPalier
        ? ` · Plus que ${result.restantAvantPalier} avant ${result.prochainPalier.label}`
        : "";
      return `${shown}/${config.totalStamps}${next}`;
    }
    const next = result.prochainPalier
      ? ` · Plus que ${result.restantAvantPalier} pts avant ${result.prochainPalier.label}`
      : "";
    return `${result.pointsApres} points${next}`;
  }, [result, scannedClient, config]);

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
        <ScanLine size={16} className="text-[var(--accent-1)]" /> Encaisser un passage
      </p>
      <p className="mb-4 text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
        Le QR de chaque client est <strong>unique</strong>. Au scan, les règles du panneau Fidélité
        s&rsquo;appliquent automatiquement : progression, paliers, récompense. Démo : choisissez un
        client (ou tapez le code de sa carte).
      </p>

      {/* sélection du client */}
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        {clients.slice(0, 4).map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelectedId(c.id); setCodeInput(""); }}
            className="cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors"
            style={{
              borderColor: selected?.id === c.id && !codeInput ? "var(--accent-1)" : "var(--border)",
              background: selected?.id === c.id && !codeInput ? "var(--accent-glow)" : "var(--panel-soft)",
            }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{c.nom}</p>
            <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>
              {config.mode === "stamps" ? `${c.tampons}/${config.totalStamps} tampons` : `${c.points} points`} · {c.code}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <QrCode size={14} style={{ color: "var(--text-faint)" }} />
        <input
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder="…ou code de la carte client (FIDI-XXXXXX)"
          className="w-full rounded-lg border bg-transparent px-2.5 py-2 text-xs uppercase outline-none focus:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        />
      </div>

      {needsMontant && (
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Montant payé
          </p>
          <div className="flex items-center gap-2">
            <input
              inputMode="decimal"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="15,00"
              className="w-full rounded-xl border bg-transparent px-3 py-3 text-lg font-semibold outline-none focus:border-[var(--accent-1)]"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            />
            <span className="text-lg font-semibold" style={{ color: "var(--text-dim)" }}>€</span>
          </div>
        </div>
      )}

      <button
        onClick={doScan}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.01]"
        style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 10px 24px -8px var(--accent-glow)" }}
      >
        <ScanLine size={18} /> Scanner la carte du client
      </button>

      {/* nouveau client */}
      <div className="mt-3 flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nouveau client (nom)"
          className="w-full rounded-lg border bg-transparent px-2.5 py-2 text-xs outline-none focus:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        />
        <button
          onClick={() => {
            if (!newName.trim()) return;
            const c = addClient(newName);
            setSelectedId(c.id);
            setNewName("");
          }}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <UserPlus size={13} /> Inscrire
        </button>
      </div>

      {/* historique du client sélectionné */}
      {selected && selected.historique.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            <History size={12} /> Historique — {selected.nom}
          </p>
          <div className="space-y-1">
            {selected.historique.slice(0, 5).map((h, i) => (
              <p key={i} className="flex items-center gap-2 text-[11px]" style={{ color: h.type === "palier" ? "#F4B942" : "var(--text-dim)" }}>
                <span style={{ color: "var(--text-faint)" }}>
                  {new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                </span>
                {h.label}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ------- écran de confirmation plein cadre ------- */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-6"
            style={{ background: "rgba(8,5,3,0.82)", backdropFilter: "blur(6px)" }}
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border p-7 text-center"
              style={{
                borderColor: !result.ok
                  ? "rgba(244,185,66,0.5)"
                  : result.paliersDeclenches.length > 0
                    ? "var(--accent-1)"
                    : "rgba(76,175,125,0.5)",
                background: "var(--panel)",
              }}
            >
              {!result.ok ? (
                <>
                  <AlertTriangle size={40} className="mx-auto mb-3" style={{ color: "#F4B942" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Scan non comptabilisé</p>
                  <p className="mt-1.5 text-xs" style={{ color: "var(--text-dim)" }}>{result.raison}</p>
                </>
              ) : result.paliersDeclenches.length > 0 ? (
                <>
                  <motion.div
                    initial={{ rotate: -12, scale: 0.6 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 12 }}
                  >
                    <PartyPopper size={46} className="mx-auto mb-3 text-[var(--accent-1)]" />
                  </motion.div>
                  <p className="text-base font-bold" style={{ color: "var(--text)" }}>
                    Récompense débloquée !
                  </p>
                  {result.paliersDeclenches.map((p) => (
                    <div key={p.position} className="mt-3 rounded-2xl px-4 py-3" style={{ background: "var(--accent-glow)" }}>
                      <p className="text-2xl font-black text-[var(--accent-1)]">{p.label}</p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--text)" }}>{p.description || p.label}</p>
                    </div>
                  ))}
                  <p className="mt-3 text-xs" style={{ color: "var(--text-dim)" }}>
                    {scannedClient?.nom} · {progressLine}
                    {result.carteCompletee && " · Carte complétée — nouveau cycle"}
                  </p>
                </>
              ) : (
                <>
                  <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(76,175,125,0.15)" }}>
                    <Check size={30} style={{ color: "#4CAF7D" }} />
                  </span>
                  <p className="text-base font-bold" style={{ color: "var(--text)" }}>
                    {config.mode === "stamps"
                      ? `+${result.tamponsApres - result.tamponsAvant || config.totalStamps - result.tamponsAvant} tampon`
                      : `+${result.pointsApres - result.pointsAvant} points`}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
                    {scannedClient?.nom} · {progressLine}
                  </p>
                </>
              )}
              <button
                onClick={() => setResult(null)}
                className="mt-5 w-full cursor-pointer rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
              >
                {result.ok && result.paliersDeclenches.length > 0 ? "Récompense appliquée" : "OK"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
