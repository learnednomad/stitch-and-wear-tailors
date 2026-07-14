import { cache } from "react";
import { listProducts } from "@/lib/api/products";
import {
  getStorefrontPage,
  listJournalPosts,
  listStorefrontCollections,
  listTailorProfiles,
} from "@/lib/api/storefront";
import { fileUrl } from "@/lib/pb";

export interface StorefrontCollection {
  id: string;
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  audience: string;
  image?: string;
  itemCount: number;
  productIds?: string[];
  featured?: boolean;
  tone: VisualTone;
}

export interface StorefrontProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  image?: string;
  seller: string;
  sellerName: string;
  rating: number;
  reviewCount: number;
  stock: number;
  featured?: boolean;
  tone: VisualTone;
}

export interface StorefrontDesigner {
  id: string;
  tailorId?: string;
  slug: string;
  displayName: string;
  businessName: string;
  headline: string;
  bio: string;
  location: string;
  specialties: string[];
  yearsExperience: number;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  verified: boolean;
  image?: string;
  coverImage?: string;
  featured?: boolean;
  tone: VisualTone;
}

export interface JournalArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  categoryLabel: string;
  author: string;
  publishedAt: string;
  readingMinutes: number;
  image?: string;
  featured?: boolean;
  tone: VisualTone;
}

export interface EditorialPageContent {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  image?: string;
  content: Record<string, unknown>;
  seoTitle?: string;
  seoDescription?: string;
}

export type VisualTone = "ink" | "bronze" | "indigo" | "clay" | "forest" | "sand";

const FALLBACK_COLLECTIONS: StorefrontCollection[] = [
  {
    id: "heritage-agbada",
    slug: "heritage-agbada",
    name: "Heritage Agbada",
    eyebrow: "Ceremonial dressing",
    description:
      "Architectural agbada sets finished with restrained embroidery and made for the moments that matter.",
    audience: "male",
    itemCount: 12,
    featured: true,
    tone: "ink",
  },
  {
    id: "modern-kaftan",
    slug: "modern-kaftan",
    name: "Modern Kaftan",
    eyebrow: "Everyday refinement",
    description:
      "Clean lines, breathable cloth and considered details for effortless day-to-evening dressing.",
    audience: "unisex",
    itemCount: 18,
    featured: true,
    tone: "sand",
  },
  {
    id: "occasion-wear",
    slug: "occasion-wear",
    name: "Occasion Wear",
    eyebrow: "For every entrance",
    description:
      "Sculpted gowns, expressive colour and hand-finished details for celebrations and ceremonies.",
    audience: "female",
    itemCount: 15,
    featured: true,
    tone: "clay",
  },
  {
    id: "tailored-suits",
    slug: "tailored-suits",
    name: "Tailored Suits",
    eyebrow: "Contemporary form",
    description:
      "Precision-cut suiting shaped around your posture, proportions and personal way of moving.",
    audience: "male",
    itemCount: 10,
    tone: "forest",
  },
  {
    id: "adire-stories",
    slug: "adire-stories",
    name: "Adire Stories",
    eyebrow: "Cloth with a memory",
    description:
      "Indigo-led pieces celebrating resist-dye traditions through a contemporary point of view.",
    audience: "all",
    itemCount: 14,
    tone: "indigo",
  },
  {
    id: "bridal-atelier",
    slug: "bridal-atelier",
    name: "Bridal Atelier",
    eyebrow: "Made for forever",
    description:
      "Bespoke ceremony looks developed through private consultations, fittings and patient handwork.",
    audience: "female",
    itemCount: 8,
    tone: "bronze",
  },
];

const FALLBACK_PRODUCTS: StorefrontProduct[] = [
  {
    id: "royal-heritage-agbada",
    slug: "royal-heritage-agbada",
    name: "Royal Heritage Agbada",
    category: "Agbada",
    description: "Deep navy three-piece agbada with hand-guided bronze embroidery.",
    price: 320000,
    currency: "NGN",
    seller: "adewale-bespoke",
    sellerName: "Adewale Bespoke",
    rating: 4.9,
    reviewCount: 28,
    stock: 6,
    featured: true,
    tone: "ink",
  },
  {
    id: "midnight-majesty",
    slug: "midnight-majesty",
    name: "Midnight Majesty",
    category: "Agbada",
    description: "Fluid black agbada with tonal embroidery and a clean modern shoulder.",
    price: 285000,
    currency: "NGN",
    seller: "house-of-reign",
    sellerName: "House of Reign",
    rating: 4.8,
    reviewCount: 19,
    stock: 4,
    featured: true,
    tone: "bronze",
  },
  {
    id: "emerald-crown",
    slug: "emerald-crown",
    name: "Emerald Crown Kaftan",
    category: "Kaftan",
    description: "A relaxed kaftan cut from richly toned cloth with a crisp neckline.",
    price: 185000,
    currency: "NGN",
    seller: "native-atelier",
    sellerName: "The Native Atelier",
    rating: 4.7,
    reviewCount: 16,
    stock: 8,
    tone: "forest",
  },
  {
    id: "ivory-royalty",
    slug: "ivory-royalty",
    name: "Ivory Royalty",
    category: "Agbada",
    description: "A luminous ivory ceremonial set with quiet gold stitchwork.",
    price: 310000,
    currency: "NGN",
    seller: "adewale-bespoke",
    sellerName: "Adewale Bespoke",
    rating: 5,
    reviewCount: 11,
    stock: 3,
    tone: "sand",
  },
  {
    id: "lagos-flow",
    slug: "lagos-flow",
    name: "Lagos Flow Senator",
    category: "Senator",
    description: "A refined senator set with elongated lines and subtle chest detailing.",
    price: 145000,
    currency: "NGN",
    seller: "tunde-opulabi",
    sellerName: "Tunde Opulabi",
    rating: 4.6,
    reviewCount: 24,
    stock: 10,
    tone: "indigo",
  },
  {
    id: "adire-evening-dress",
    slug: "adire-evening-dress",
    name: "Adire Evening Dress",
    category: "Women",
    description: "A softly structured evening dress in hand-dyed indigo adire.",
    price: 165000,
    compareAtPrice: 185000,
    currency: "NGN",
    seller: "amina-yusuf",
    sellerName: "Amina Yusuf",
    rating: 4.9,
    reviewCount: 33,
    stock: 5,
    featured: true,
    tone: "indigo",
  },
  {
    id: "coral-aso-oke-set",
    slug: "coral-aso-oke-set",
    name: "Coral Aso Oke Set",
    category: "Women",
    description: "A celebration-ready iro and buba pairing woven with coral accents.",
    price: 225000,
    currency: "NGN",
    seller: "mai-couture",
    sellerName: "Mai Couture",
    rating: 4.8,
    reviewCount: 21,
    stock: 4,
    tone: "clay",
  },
  {
    id: "guilded-cap",
    slug: "gilded-embroidered-cap",
    name: "Gilded Embroidered Cap",
    category: "Accessories",
    description: "A structured fila finished with dense geometric embroidery.",
    price: 45000,
    currency: "NGN",
    seller: "adewale-bespoke",
    sellerName: "Adewale Bespoke",
    rating: 4.8,
    reviewCount: 42,
    stock: 18,
    tone: "bronze",
  },
];

const FALLBACK_DESIGNERS: StorefrontDesigner[] = [
  {
    id: "adewale-bespoke",
    slug: "adewale-bespoke",
    displayName: "Tunde Opulabi",
    businessName: "Adewale Bespoke",
    headline: "Ceremonial tailoring, distilled to its finest form.",
    bio: "Tunde leads a Lagos atelier known for stately agbada, exacting construction and embroidery that rewards a closer look. His practice brings traditional proportion into an assured contemporary wardrobe.",
    location: "Lagos, Nigeria",
    specialties: ["Agbada", "Senator", "Custom embroidery"],
    yearsExperience: 18,
    rating: 4.9,
    reviewCount: 86,
    completedOrders: 312,
    verified: true,
    featured: true,
    tone: "ink",
  },
  {
    id: "amina-yusuf",
    slug: "amina-yusuf",
    displayName: "Amina Yusuf",
    businessName: "Amina Yusuf Atelier",
    headline: "Expressive occasion wear with an elegant sense of ease.",
    bio: "Amina creates graceful pieces that balance sculptural drape, colour and comfort. Her atelier is especially loved for wedding guest looks and modern interpretations of northern Nigerian dress.",
    location: "Abuja, Nigeria",
    specialties: ["Occasion wear", "Bridal", "Women’s kaftans"],
    yearsExperience: 12,
    rating: 4.8,
    reviewCount: 63,
    completedOrders: 241,
    verified: true,
    featured: true,
    tone: "clay",
  },
  {
    id: "dapo-adeyemi",
    slug: "dapo-adeyemi",
    displayName: "Dapo Adeyemi",
    businessName: "House of Reign",
    headline: "Quietly commanding menswear, made one client at a time.",
    bio: "House of Reign specialises in modern formalwear with precise shoulders, long clean lines and deeply considered finishing. Dapo’s work moves easily between boardroom and ceremony.",
    location: "Lagos, Nigeria",
    specialties: ["Suits", "Formalwear", "Kaftans"],
    yearsExperience: 15,
    rating: 4.8,
    reviewCount: 51,
    completedOrders: 287,
    verified: true,
    featured: true,
    tone: "forest",
  },
  {
    id: "mai-couture",
    slug: "mai-couture",
    displayName: "Mai Chukwue",
    businessName: "Mai Couture",
    headline: "Textile-led womenswear alive with movement and story.",
    bio: "Mai works closely with locally sourced textiles, treating the cloth as the beginning of every silhouette. The result is colourful, assured and unmistakably personal.",
    location: "Lagos, Nigeria",
    specialties: ["Adire", "Iro & buba", "Dresses"],
    yearsExperience: 10,
    rating: 4.7,
    reviewCount: 44,
    completedOrders: 198,
    verified: true,
    tone: "indigo",
  },
  {
    id: "native-atelier",
    slug: "native-atelier",
    displayName: "Nkiru Okafor",
    businessName: "The Native Atelier",
    headline: "Modern heirlooms shaped by patient, skilled hands.",
    bio: "Nkiru’s atelier makes elevated wardrobe pieces with a tactile focus: woven cloth, delicate beading and hand-finished edges intended to live far beyond one occasion.",
    location: "Enugu, Nigeria",
    specialties: ["Hand finishing", "Women’s tailoring", "Textiles"],
    yearsExperience: 14,
    rating: 4.9,
    reviewCount: 72,
    completedOrders: 264,
    verified: true,
    tone: "bronze",
  },
  {
    id: "kano-clothiers",
    slug: "kano-clothiers",
    displayName: "Sani Bello",
    businessName: "Kano Clothiers",
    headline: "Northern tailoring traditions with a precise modern rhythm.",
    bio: "Sani and his team are known for impeccable kaftans and detailed babanriga. The workshop combines generational technique with a modern eye for proportion and palette.",
    location: "Kano, Nigeria",
    specialties: ["Babanriga", "Kaftans", "Embroidery"],
    yearsExperience: 20,
    rating: 4.8,
    reviewCount: 58,
    completedOrders: 356,
    verified: true,
    tone: "sand",
  },
];

const FALLBACK_ARTICLES: JournalArticle[] = [
  {
    id: "story-behind-agbada",
    slug: "the-story-behind-agbada",
    title: "The Story Behind Agbada",
    excerpt: "From royal courts to modern ceremonies, discover how an icon continues to evolve.",
    body: "Agbada has always communicated more than occasion. Its volume, cloth and embroidery carry ideas about presence, community and craft. Today’s best makers respect that language while refining the garment for contemporary life.\n\nThe silhouette begins with proportion: how the outer gown falls from the shoulder, where the embroidery meets the body, and how the layers move together. Cloth is chosen not only for appearance but for weight, climate and the way it will hold a fold.\n\nAt Stitch & Wear, we believe the most compelling agbada feels rooted without feeling fixed in time. It should honour the hands and histories behind it while belonging completely to the person wearing it.",
    category: "craftsmanship",
    categoryLabel: "Craftsmanship",
    author: "Stitch & Wear Journal",
    publishedAt: "2026-06-14",
    readingMinutes: 6,
    featured: true,
    tone: "bronze",
  },
  {
    id: "choose-perfect-fabric",
    slug: "how-to-choose-the-perfect-fabric",
    title: "How to Choose the Perfect Fabric",
    excerpt: "A practical guide to texture, drape, climate and choosing cloth that serves the silhouette.",
    body: "Beautiful cloth is only the beginning. The right fabric must also suit the garment, the setting and the way you want to feel in it. Start with drape: softer cloth follows the body, while cloth with more structure creates a stronger outline.\n\nFor warm celebrations, consider breathability and how many layers the look requires. For embroidery, choose a base with enough stability to support the stitchwork without puckering. Ask to see and handle a swatch whenever possible.\n\nMost importantly, choose for the life of the piece. A thoughtful fabric will wear comfortably, photograph beautifully and still feel right years from now.",
    category: "style_guide",
    categoryLabel: "Style Guide",
    author: "Amina Yusuf",
    publishedAt: "2026-05-27",
    readingMinutes: 5,
    featured: true,
    tone: "sand",
  },
  {
    id: "wedding-style-inspiration",
    slug: "wedding-style-inspiration",
    title: "Wedding Style, Considered",
    excerpt: "A composed approach to colour, coordination and dressing for the celebration around you.",
    body: "The most memorable wedding looks begin with context. Consider the ceremony, the venue, the family palette and how your outfit will sit within the wider celebration. Coordination does not have to mean exact matching; related tones and shared textile details often feel more sophisticated.\n\nBuild in enough time for fittings, especially when handwork is involved. Bring the shoes and accessories you plan to wear so your tailor can judge the full proportion.\n\nA successful occasion look should make an entrance and still let you move, greet, dance and remain present throughout the day.",
    category: "weddings",
    categoryLabel: "Weddings",
    author: "Mai Chukwue",
    publishedAt: "2026-05-06",
    readingMinutes: 4,
    tone: "clay",
  },
  {
    id: "bespoke-ready-to-wear",
    slug: "bespoke-vs-ready-to-wear",
    title: "Bespoke or Ready-to-Wear?",
    excerpt: "Understanding the difference helps you choose the right path for your time, budget and occasion.",
    body: "Ready-to-wear offers immediacy: the design is resolved, the price is clear and the garment can be yours quickly. Bespoke begins somewhere else—with your body, your preferences and a conversation.\n\nChoose bespoke when fit is especially important, when you want control over the cloth and details, or when the occasion deserves something deeply personal. Choose ready-to-wear when time is short or when an existing piece already feels like you.\n\nNeither is inherently better. A considered wardrobe makes room for both, choosing the process that best serves each moment.",
    category: "style_guide",
    categoryLabel: "Style Guide",
    author: "Stitch & Wear Journal",
    publishedAt: "2026-04-19",
    readingMinutes: 4,
    tone: "forest",
  },
  {
    id: "inside-lagos-atelier",
    slug: "inside-a-lagos-atelier",
    title: "Inside a Lagos Atelier",
    excerpt: "Pattern, chalk, conversation and the quiet accumulation of a garment made well.",
    body: "An atelier wakes slowly: irons heating, machines being threaded, yesterday’s cut pieces returning to the table. Before a seam is sewn, the team reads the order again—measurements, notes, cloth direction and every promised detail.\n\nThe work moves between precision and judgment. A paper pattern offers a map, but an experienced cutter is always reading the cloth and the client behind the numbers. At fitting, that judgment becomes a conversation.\n\nWhat looks effortless at the end is the result of dozens of small, careful decisions. That is the beauty of atelier work: attention made visible.",
    category: "behind_the_seams",
    categoryLabel: "Behind the Seams",
    author: "Dapo Adeyemi",
    publishedAt: "2026-03-28",
    readingMinutes: 7,
    tone: "ink",
  },
  {
    id: "care-for-embroidered-clothes",
    slug: "care-for-embroidered-clothes",
    title: "Caring for Embroidered Clothes",
    excerpt: "Simple habits that protect fine threadwork, preserve shape and extend the life of special pieces.",
    body: "Embroidered garments respond best to gentle care. Air a piece after wearing before storing it, and avoid placing heavy folds directly across dense threadwork. A padded hanger can help structured pieces retain their shoulder line.\n\nFor cleaning, follow your tailor’s guidance and use a specialist who understands embellished cloth. Never iron embroidery directly; work from the reverse with a protective layer and low heat.\n\nStore special pieces in breathable garment bags, away from direct light and moisture. The aim is simple: protect the handwork while allowing the cloth to rest naturally.",
    category: "style_guide",
    categoryLabel: "Care Guide",
    author: "The Native Atelier",
    publishedAt: "2026-03-03",
    readingMinutes: 3,
    tone: "indigo",
  },
];

function toneAt(index: number): VisualTone {
  const tones: VisualTone[] = ["ink", "bronze", "indigo", "clay", "forest", "sand"];
  return tones[index % tones.length];
}

export const getCollections = cache(async (): Promise<StorefrontCollection[]> => {
  const records = await listStorefrontCollections({ perPage: 100 })
    .then((result) => result.items)
    .catch(() => []);
  if (!records.length) return FALLBACK_COLLECTIONS;

  return records.map((record, index) => ({
      id: record.id,
      slug: record.slug || record.id,
      name: record.name || "Curated Collection",
      eyebrow: record.eyebrow || "Stitch & Wear edit",
      description: record.description || "A considered edit from independent Nigerian makers.",
      audience: record.audience || "all",
      image: record.coverImage ? fileUrl(record, record.coverImage) : undefined,
      itemCount: record.products?.length ?? 0,
      productIds: record.products ?? [],
      featured: record.isFeatured,
      tone: toneAt(index),
    }));
});

export const getProducts = cache(async (): Promise<StorefrontProduct[]> => {
  const [records, profiles] = await Promise.all([
    listProducts({ perPage: 100 })
      .then((result) => result.items)
      .catch(() => []),
    listTailorProfiles({ perPage: 100 })
      .then((result) => result.items)
      .catch(() => []),
  ]);
  if (!records.length) return FALLBACK_PRODUCTS;
  const profileByTailor = new Map(profiles.map((profile) => [profile.tailor, profile]));

  return records.map((record, index) => {
    const publicSeller = profileByTailor.get(record.seller);
    return {
      id: record.id,
      slug: record.slug || record.id,
      name: record.name || "Made-to-measure piece",
      category: record.category || "Bespoke",
      description: record.description || "Designed and made by an independent Nigerian tailor.",
      price: record.price,
      compareAtPrice: record.compareAtPrice || undefined,
      currency: record.currency || "NGN",
      image: record.images?.[0] ? fileUrl(record, record.images[0]) : undefined,
      seller: record.seller,
      sellerName:
        publicSeller?.businessName ||
        publicSeller?.displayName ||
        "Independent atelier",
      rating: Number((record.rating || 4.8).toFixed(1)),
      reviewCount: record.reviewCount || 0,
      stock: record.stock,
      featured: record.isFeatured,
      tone: toneAt(index),
    };
  });
});

export const getDesigners = cache(async (): Promise<StorefrontDesigner[]> => {
  const records = await listTailorProfiles({ perPage: 100 })
    .then((result) => result.items)
    .catch(() => []);
  if (!records.length) return FALLBACK_DESIGNERS;

  return records.map((record, index) => ({
      id: record.id,
      tailorId: record.tailor,
      slug: record.slug || record.id,
      displayName: record.displayName || "Independent tailor",
      businessName: record.businessName || record.displayName || "Independent atelier",
      headline: record.headline || "Considered tailoring, made personally.",
      bio: record.bio || "A verified Stitch & Wear tailoring partner.",
      location: record.location || "Nigeria",
      specialties: record.specialties ?? [],
      yearsExperience: record.yearsExperience || 0,
      rating: Number((record.rating || 4.8).toFixed(1)),
      reviewCount: record.reviewCount || 0,
      completedOrders: record.completedOrders || 0,
      verified: record.isVerified,
      image: record.avatar ? fileUrl(record, record.avatar) : undefined,
      coverImage: record.coverImage ? fileUrl(record, record.coverImage) : undefined,
      featured: record.isFeatured,
      tone: toneAt(index),
    }));
});

function plainTextBody(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function journalCategoryLabel(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const getJournalArticles = cache(async (): Promise<JournalArticle[]> => {
  const records = await listJournalPosts({ perPage: 100 })
    .then((result) => result.items)
    .catch(() => []);
  if (!records.length) return FALLBACK_ARTICLES;

  return records.map((record, index) => {
      const category = record.category || "craftsmanship";
      return {
        id: record.id,
        slug: record.slug || record.id,
        title: record.title || "From the Stitch & Wear Journal",
        excerpt: record.excerpt || "Stories of Nigerian style, craft and the people who make it.",
        body: plainTextBody(record.body),
        category,
        categoryLabel: journalCategoryLabel(category),
        author: record.expand?.author?.displayName || record.expand?.author?.businessName || "Stitch & Wear Journal",
        publishedAt: record.publishedAt || record.created || "2026-01-01",
        readingMinutes: record.readingMinutes || 5,
        image: record.coverImage ? fileUrl(record, record.coverImage) : undefined,
        featured: record.isFeatured,
        tone: toneAt(index),
      };
    });
});

export async function getCollection(slug: string): Promise<StorefrontCollection | undefined> {
  return (await getCollections()).find((collection) => collection.slug === slug || collection.id === slug);
}

export async function getDesigner(id: string): Promise<StorefrontDesigner | undefined> {
  return (await getDesigners()).find((designer) => designer.slug === id || designer.id === id);
}

export async function getJournalArticle(slug: string): Promise<JournalArticle | undefined> {
  return (await getJournalArticles()).find((article) => article.slug === slug || article.id === slug);
}

export async function getEditorialPage(slug: string): Promise<EditorialPageContent | undefined> {
  try {
    const page = await getStorefrontPage(slug);
    return {
      slug: page.slug,
      title: page.title,
      eyebrow: page.eyebrow,
      summary: page.summary,
      image: page.heroImage ? fileUrl(page, page.heroImage) : undefined,
      content: page.content ?? {},
      seoTitle: page.seoTitle || undefined,
      seoDescription: page.seoDescription || undefined,
    };
  } catch {
    return undefined;
  }
}

export async function getCollectionProducts(collection: StorefrontCollection): Promise<StorefrontProduct[]> {
  const products = await getProducts();
  const related = collection.productIds?.length
    ? products.filter((product) => collection.productIds?.includes(product.id))
    : [];
  if (related.length) return related;
  const match = collection.name.toLowerCase().split(" ")[0];
  const selected = products.filter((product) =>
    `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(match),
  );
  return selected.length >= 3 ? selected : products;
}

export function formatStorefrontDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
