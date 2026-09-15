export interface FontOption {
  label: string;
  value: string;
  cssVar: string;
}

export const fontOptions: FontOption[] = [
  { label: "Geist (défaut)", value: "geist", cssVar: "var(--font-geist-sans)" },
  { label: "Poppins", value: "poppins", cssVar: "var(--font-poppins)" },
  { label: "Montserrat", value: "montserrat", cssVar: "var(--font-montserrat)" },
  { label: "Playfair Display", value: "playfair", cssVar: "var(--font-playfair)" },
  { label: "Lato", value: "lato", cssVar: "var(--font-lato)" },
  { label: "Roboto", value: "roboto", cssVar: "var(--font-roboto)" },
  { label: "Open Sans", value: "open-sans", cssVar: "var(--font-open-sans)" },
  { label: "Great Vibes", value: "great-vibes", cssVar: "var(--font-great-vibes)" },
];

export function getFontCssVar(value: string): string {
  return fontOptions.find((f) => f.value === value)?.cssVar ?? "var(--font-geist-sans)";
}
