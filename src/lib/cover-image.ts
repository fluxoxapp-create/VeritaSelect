export type CoverCategory = string;

const FALLBACK_KEYWORDS: Record<string, string> = {
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
 * Deterministic placeholder photo for a raffle's prize.
 * Accepts an optional `keywords` override (from the categories table);
 * falls back to the hardcoded map for backwards compatibility.
 */
export function coverImage(
  item: { slug: string; category: CoverCategory; categoryKeywords?: string },
  index = 0,
) {
  const keywords =
    item.categoryKeywords ||
    FALLBACK_KEYWORDS[item.category] ||
    item.category.toLowerCase().replace(/\s+/g, ",");
  const lock = seedNumber(`${item.slug}-${index}`);
  return `https://loremflickr.com/960/720/${keywords}?lock=${lock}`;
}
