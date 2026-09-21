// La bibliothèque ne publie pas de types (voir node_modules/pdf417-generator,
// champ `types` absent du package.json). Seule la fonction `draw` est
// utilisée dans le produit (LayerContent.tsx) ; seule sa signature est typée.
declare module "pdf417-generator" {
  export const PDF417: {
    draw(
      code: string,
      canvas: HTMLCanvasElement,
      aspectRatio?: number,
      ecl?: number,
      devicePixelRatio?: number,
      lineColor?: string,
    ): boolean;
  };
}
