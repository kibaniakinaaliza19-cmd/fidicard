"use client";

import { useState } from "react";
import type { BrouillonCommerce } from "./types";

const SECTEURS_RAPIDES = [
  "Café", "Restaurant", "Salon de coiffure", "Institut de beauté",
  "Boulangerie", "Garage", "Boutique", "Bar",
];

export default function EtapeCommerce({
  valeur,
  onSuivant,
}: {
  valeur: BrouillonCommerce;
  onSuivant: (patch: Pick<BrouillonCommerce, "nom" | "secteur" | "prenom" | "contact">) => void;
}) {
  const [nom, setNom] = useState(valeur.nom);
  const [secteur, setSecteur] = useState(valeur.secteur);
  const [prenom, setPrenom] = useState(valeur.prenom);
  const [contact, setContact] = useState(valeur.contact);

  const pret = nom.trim().length > 0 && secteur.trim().length > 0;

  return (
    <div className="flex flex-1 flex-col px-4 py-4">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Votre commerce</h2>
      <p className="mt-1 text-[13px]" style={{ color: "var(--text-dim)" }}>
        Deux informations, et je m&rsquo;occupe du reste.
      </p>

      <div
        className="mt-4 space-y-4 rounded-2xl p-4"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium" style={{ color: "var(--text-dim)" }}>
            Nom du commerce
          </span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex. Café Madeleine"
            className="champ w-full"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium" style={{ color: "var(--text-dim)" }}>
            Type de commerce
          </span>
          <input
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            placeholder="Ex. Café, salon de coiffure…"
            className="champ w-full"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SECTEURS_RAPIDES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSecteur(s)}
                className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                style={{
                  borderColor: secteur === s ? "var(--accent)" : "var(--border-strong)",
                  color: secteur === s ? "var(--accent)" : "var(--text-dim)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </label>
      </div>

      {/* Facultatif, jamais bloquant : le bouton plus bas reste actif sans
          eux. Demandé ici OU à l'étape 5 — pas les deux, pour ne jamais
          poser deux fois la même question. */}
      <details className="mt-4 rounded-2xl" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <summary
          className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium"
          style={{ color: "var(--text)" }}
        >
          Vos coordonnées <span style={{ color: "var(--text-faint)" }}>(facultatif — pour vous recontacter)</span>
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <input
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder="Prénom"
            className="champ w-full"
          />
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Téléphone ou email"
            className="champ w-full"
          />
        </div>
      </details>

      <div className="mt-auto pt-4">
        <button
          disabled={!pret}
          onClick={() => onSuivant({ nom: nom.trim(), secteur: secteur.trim(), prenom: prenom.trim(), contact: contact.trim() })}
          className="btn btn-primary w-full"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
