export interface BundleProductConfig {
  slug: string;
  label: string;
  quantity?: number;
}

export interface Bundle {
  slug: string;
  name: string;
  subtitle: string;
  tagline: string;
  emoji: string;
  cardColor: string;
  items: BundleProductConfig[];
  originalPrice: number;
  bundlePrice: number;
  isNew?: boolean;
  /** Bundle photo — shown instead of the emoji when set. */
  imageUrl?: string;
  /** Hidden from the storefront when false (admin can park drafts). */
  active?: boolean;
  description: string;
  features: string[];
}

export const bundles: Bundle[] = [
  {
    slug: "yeni-dogan-paketi",
    name: "Yeni Doğan Paketi",
    subtitle: "Newborn Starter Bundle",
    tagline: "Everything your newborn needs from day one",
    emoji: "🌿",
    cardColor: "#C8DDD8",
    items: [
      { slug: "organic-cotton-bodysuit", label: "Organic Cotton Bodysuit", quantity: 2 },
      { slug: "bamboo-hooded-towel",     label: "Bamboo Hooded Towel" },
      { slug: "cloud-print-blanket",     label: "Cloud Print Blanket" },
    ],
    originalPrice: 134,
    bundlePrice: 99,
    isNew: true,
    description:
      "A carefully curated starter set for your newborn's first weeks. Two ultra-soft organic bodysuits, a bamboo hooded towel for gentle bath times, and a cloud-print blanket for cozy naps — bundled together at a special price.",
    features: [
      "Soft, tested organic materials",
      "Perfect first-time parent gift",
      "Save 35₾ vs buying separately",
      "Beautiful gift-ready packaging",
    ],
  },
  {
    slug: "bebek-cikis-seti",
    name: "Bebek Çıkış Seti",
    subtitle: "Hospital Exit Bundle",
    tagline: "Make your first day home picture-perfect",
    emoji: "🏠",
    cardColor: "#EDE5D8",
    items: [
      { slug: "hospital-exit-set",       label: "Hospital Exit Set (5-piece)" },
      { slug: "bamboo-hooded-towel",     label: "Bamboo Hooded Towel" },
      { slug: "muslin-swaddle-blanket",  label: "Muslin Swaddle Blanket" },
    ],
    originalPrice: 159,
    bundlePrice: 129,
    description:
      "The ultimate coming-home bundle. The 5-piece hospital exit set has a matching outfit and hat, plus our soft bamboo towel and a muslin swaddle that you'll reach for every single day.",
    features: [
      "Complete 5-piece coming-home outfit",
      "Soft muslin swaddle included",
      "Save 30₾ vs buying separately",
      "Gift box packaging available",
    ],
  },
  {
    slug: "komple-hediye-paketi",
    name: "Komple Hediye Paketi",
    subtitle: "Complete Gift Bundle",
    tagline: "The ultimate baby shower gift — 4 best-loved items",
    emoji: "🎁",
    cardColor: "#E8D8EC",
    items: [
      { slug: "long-sleeve-bodysuit-set", label: "Long Sleeve Bodysuit Set" },
      { slug: "bear-ear-romper",          label: "Bear Ear Romper" },
      { slug: "bamboo-hooded-towel",      label: "Bamboo Hooded Towel" },
      { slug: "mini-bunny-backpack",      label: "Mini Bunny Backpack" },
    ],
    originalPrice: 196,
    bundlePrice: 159,
    description:
      "Four of our most-loved products bundled together for the ultimate baby shower gift. A matching bodysuit set, adorable bear ear romper, bamboo towel, and a tiny bunny backpack for when they're on the go.",
    features: [
      "4 products, huge savings",
      "Perfect baby shower gift",
      "Save 37₾ vs buying separately",
      "Includes free gift wrapping",
    ],
  },
  {
    slug: "uyku-seti",
    name: "Rahat Uyku Seti",
    subtitle: "Sleep Comfort Bundle",
    tagline: "Safe, cozy sleep — every night",
    emoji: "🌙",
    cardColor: "#D4C4E4",
    items: [
      { slug: "organic-sleep-sack",       label: "Organic Sleep Sack" },
      { slug: "bamboo-pajama-set",        label: "Bamboo Pajama Set" },
      { slug: "muslin-swaddle-blanket",   label: "Muslin Swaddle Blanket" },
    ],
    originalPrice: 130,
    bundlePrice: 105,
    isNew: true,
    description:
      "Everything you need for safe, peaceful sleep. Our organic sleep sack keeps baby at the right temperature all night, paired with buttery-soft bamboo pyjamas and a breathable muslin swaddle.",
    features: [
      "TOG-rated safe sleep sack",
      "Anti-pill bamboo pyjamas",
      "Save 25₾ vs buying separately",
      "Paediatrician-recommended materials",
    ],
  },
];
