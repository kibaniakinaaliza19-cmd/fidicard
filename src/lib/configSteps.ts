/**
 * Configuration checklist that gates the QR code.
 * The QR is only generated once every step is done — including "Publier".
 * Steps are derived from real app state where possible (a saved card, the
 * publish flag); the rest are pre-filled for the Café Madeleine demo account.
 */

export interface ConfigStep {
  key: string;
  label: string;
  done: boolean;
}

export function hasSavedCard(): boolean {
  try {
    return !!localStorage.getItem("fidicard-card-doc");
  } catch {
    return false;
  }
}

export function getConfigSteps(published: boolean, cardCreated: boolean): ConfigStep[] {
  return [
    { key: "info", label: "Informations du commerce", done: true },
    { key: "logo", label: "Logo ajouté", done: true },
    { key: "colors", label: "Couleurs configurées", done: true },
    { key: "card", label: "Carte de fidélité créée", done: cardCreated },
    { key: "publish", label: "Programme publié", done: published },
  ];
}

export function configProgress(steps: ConfigStep[]): number {
  const done = steps.filter((s) => s.done).length;
  return Math.round((done / steps.length) * 100);
}
