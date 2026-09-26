"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { TYPES_IMAGE_ACCEPTES, MAX_TAILLE_IMAGE_OCTETS, lireCommeDataUrl } from "./images";
import type { BrouillonCommerce } from "./types";

type Cle = "logo" | "photoInterieure" | "photoExterieure";

const ZONES: { cle: Cle; titre: string; detail: string }[] = [
  { cle: "logo", titre: "Votre logo", detail: "Pour qu'il apparaisse sur la carte" },
  { cle: "photoInterieure", titre: "Photo de l'intérieur", detail: "Votre salle, votre comptoir…" },
  { cle: "photoExterieure", titre: "Photo de la devanture", detail: "Votre vitrine, votre enseigne…" },
];

/**
 * Trois dépôts facultatifs. Chaque image posée part immédiatement vers
 * `/api/assistant` — c'est la seule façon d'obtenir une analyse de couleurs
 * réelle (`provider.vision()`, côté serveur, jamais recréée ici) — mais rien
 * n'est montré au commerçant tant qu'on n'est pas à l'étape 5 : ces
 * échanges nourrissent la session en silence, ils ne sont pas la
 * conversation elle-même.
 */
export default function EtapeImages({
  valeur,
  onEnvoyerImage,
  onSuivant,
  onPasser,
}: {
  valeur: BrouillonCommerce;
  /** Envoie l'image au moteur (vision) ; ne renvoie rien à afficher ici. */
  onEnvoyerImage: (cle: Cle, dataUrl: string) => Promise<void>;
  onSuivant: (patch: Pick<BrouillonCommerce, "logo" | "photoInterieure" | "photoExterieure">) => void;
  onPasser: () => void;
}) {
  const [images, setImages] = useState<Record<Cle, string | null>>({
    logo: valeur.logo,
    photoInterieure: valeur.photoInterieure,
    photoExterieure: valeur.photoExterieure,
  });
  const [enCours, setEnCours] = useState<Cle | null>(null);
  const inputs = { logo: useRef<HTMLInputElement>(null), photoInterieure: useRef<HTMLInputElement>(null), photoExterieure: useRef<HTMLInputElement>(null) };

  async function surFichier(cle: Cle, fichier: File | undefined) {
    if (!fichier) return;
    if (!TYPES_IMAGE_ACCEPTES.includes(fichier.type)) return;
    if (fichier.size > MAX_TAILLE_IMAGE_OCTETS) return;
    const dataUrl = await lireCommeDataUrl(fichier);
    setImages((prev) => ({ ...prev, [cle]: dataUrl }));
    setEnCours(cle);
    try {
      await onEnvoyerImage(cle, dataUrl);
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-4">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Votre image</h2>
      <p className="mt-1 text-[13px]" style={{ color: "var(--text-dim)" }}>
        Facultatif — mais une carte à votre image se remarque davantage.
      </p>

      <div className="mt-4 space-y-3">
        {ZONES.map((z) => {
          const image = images[z.cle];
          return (
            <div key={z.cle}>
              <input
                ref={inputs[z.cle]}
                type="file"
                accept={TYPES_IMAGE_ACCEPTES.join(",")}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  surFichier(z.cle, f);
                }}
              />
              <button
                type="button"
                onClick={() => inputs[z.cle].current?.click()}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-left"
                style={{ background: "var(--surface-1)", border: "1px dashed var(--border-strong)" }}
              >
                <span
                  className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl"
                  style={{ background: "var(--panel-soft)" }}
                >
                  {enCours === z.cle ? (
                    <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
                  ) : image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon size={18} style={{ color: "var(--text-faint)" }} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium" style={{ color: "var(--text)" }}>{z.titre}</span>
                  <span className="block text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {image ? "Ajoutée — touchez pour changer" : z.detail}
                  </span>
                </span>
                {image && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setImages((prev) => ({ ...prev, [z.cle]: null }));
                    }}
                    className="shrink-0 cursor-pointer p-1"
                    style={{ color: "var(--text-faint)" }}
                  >
                    <X size={16} />
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex gap-2 pt-4">
        <button onClick={onPasser} className="btn btn-secondary flex-1">Passer</button>
        <button
          onClick={() => onSuivant({ logo: images.logo, photoInterieure: images.photoInterieure, photoExterieure: images.photoExterieure })}
          className="btn btn-primary flex-1"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
