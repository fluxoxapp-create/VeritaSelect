export type Raffle = {
  slug: string;
  title: string;
  category: "Agro" | "Caminhonetes" | "Motos" | "Náutico" | "Automotivo";
  organizer: string;
  organizerVerified: boolean;
  cotaPrice: number;
  totalCotas: number;
  soldCotas: number;
  drawDate: string;
  coverEmoji: string;
  description: string;
};

const CATEGORY_KEYWORDS: Record<Raffle["category"], string> = {
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

export function coverImage(raffle: Pick<Raffle, "slug" | "category">, index = 0) {
  const keywords = CATEGORY_KEYWORDS[raffle.category];
  const lock = seedNumber(`${raffle.slug}-${index}`);
  return `https://loremflickr.com/960/720/${keywords}?lock=${lock}`;
}

export const raffles: Raffle[] = [
  {
    slug: "ram-2500-limited",
    title: "RAM 2500 Limited 0km",
    category: "Caminhonetes",
    organizer: "Premium Trucks BR",
    organizerVerified: true,
    cotaPrice: 49.9,
    totalCotas: 20000,
    soldCotas: 14732,
    drawDate: "2026-07-12",
    coverEmoji: "🛻",
    description:
      "RAM 2500 Limited 0km, documentação em dia, sorteio com apuração pela Loteria Federal.",
  },
  {
    slug: "trator-john-deere-6110j",
    title: "Trator John Deere 6110J",
    category: "Agro",
    organizer: "AgroSorte Oficial",
    organizerVerified: true,
    cotaPrice: 89.9,
    totalCotas: 12000,
    soldCotas: 6810,
    drawDate: "2026-07-20",
    coverEmoji: "🚜",
    description:
      "Trator revisado, nota fiscal e laudo técnico verificados pela equipe VeritaSelect.",
  },
  {
    slug: "lancha-focker-302",
    title: "Lancha Focker 302",
    category: "Náutico",
    organizer: "Náutica Premium SC",
    organizerVerified: true,
    cotaPrice: 129.9,
    totalCotas: 8000,
    soldCotas: 2140,
    drawDate: "2026-08-02",
    coverEmoji: "🚤",
    description:
      "Lancha completa com motor de popa, registro na Marinha verificado pelo organizador.",
  },
  {
    slug: "harley-davidson-fat-boy",
    title: "Harley-Davidson Fat Boy",
    category: "Motos",
    organizer: "Moto Boutique RS",
    organizerVerified: true,
    cotaPrice: 39.9,
    totalCotas: 15000,
    soldCotas: 11920,
    drawDate: "2026-06-28",
    coverEmoji: "🏍️",
    description:
      "Moto 0km, emplacada e com seguro pago, pronta para retirada pelo ganhador.",
  },
];

export type Winner = {
  name: string;
  prize: string;
  raffleSlug: string;
  drawnAt: string;
  number: string;
};

export const winners: Winner[] = [
  {
    name: "Carlos E. — Goiânia/GO",
    prize: "Trator John Deere 5078E",
    raffleSlug: "trator-john-deere-6110j",
    drawnAt: "2026-05-14",
    number: "04821",
  },
  {
    name: "Marina T. — Florianópolis/SC",
    prize: "Lancha Focker 280",
    raffleSlug: "lancha-focker-302",
    drawnAt: "2026-04-30",
    number: "01193",
  },
  {
    name: "Diego P. — Cuiabá/MT",
    prize: "RAM 1500 Laramie",
    raffleSlug: "ram-2500-limited",
    drawnAt: "2026-03-22",
    number: "11267",
  },
];

export function getRaffleBySlug(slug: string) {
  return raffles.find((raffle) => raffle.slug === slug);
}

export function progress(raffle: Raffle) {
  return Math.min(100, Math.round((raffle.soldCotas / raffle.totalCotas) * 100));
}
