import type { CardDoc } from "@/types/layer";
import { createTextLayer, makeId } from "@/lib/layerFactory";

export function createBlankCard(): CardDoc {
  return {
    id: makeId("card"),
    name: "Ma carte de fidélité",
    category: "autres",
    background: {
      kind: "gradient",
      color: "#0f0603",
      gradientFrom: "#3a1a10",
      gradientTo: "#0a0402",
      gradientAngle: 135,
      pattern: "dots",
      patternColor: "#ffffff",
      image: null,
      imageDim: 30,
    },
    layers: [
      createTextLayer(1, {
        id: makeId("business-name"),
        name: "Nom du commerce",
        content: "MON ENTREPRISE",
        x: 8,
        y: 30,
        width: 60,
        height: 12,
        fontSize: 22,
        fontWeight: 800,
        color: "#ffffff",
      }),
      createTextLayer(2, {
        id: makeId("business-tagline"),
        name: "Slogan",
        content: "Fidélisez vos clients",
        x: 8,
        y: 46,
        width: 60,
        height: 8,
        fontSize: 11,
        fontWeight: 400,
        color: "#e5e5e5",
      }),
      createTextLayer(3, {
        id: makeId("reward-line"),
        name: "Récompense",
        content: "Une boisson offerte à la 10ᵉ visite",
        x: 8,
        y: 74,
        width: 62,
        height: 8,
        fontSize: 10,
        fontWeight: 500,
        color: "#f0c8b4",
      }),
    ],
    published: false,
    updatedAt: Date.now(),
  };
}
