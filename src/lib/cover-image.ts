export type CoverCategory = "Agro" | "Caminhonetes" | "Motos" | "Náutico" | "Automotivo";

const CATEGORY_KEYWORDS: Record<CoverCategory, string> = {
  Agro: "tractor,farm",
  Caminhonetes: "pickup-truck,truck",
  Motos: "motorcycle",
  Náutico: "boat,yacht",
  Automotivo: "car,automobile",
};

function seedNumber(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Deterministic placeholder photo for a raffle's prize — keyed by category so
 * it matches the actual product type (e.g. a generic pickup for a truck raffle)
 * and locked per slug+index so the same item always shows the same images.
 */
export function coverImage(item: { slug: string; category: CoverCategory }, index = 0) {
  const keywords = CATEGORY_KEYWORDS[item.category];
  const lock = seedNumber(`${item.slug}-${index}`);
  return `https://loremflickr.com/960/720/${keywords}?lock=${lock}`;
}
