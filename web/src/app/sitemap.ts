import type { MetadataRoute } from "next";
import {
  getCollections,
  getDesigners,
  getJournalArticles,
  getProducts,
} from "@/lib/storefront-content";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://stitchandwear.com";

const publicRoutes = [
  "",
  "/collections",
  "/marketplace",
  "/designers",
  "/design",
  "/journal",
  "/about",
  "/appointments",
  "/measurements-guide",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updated = new Date();
  const staticEntries: MetadataRoute.Sitemap = publicRoutes.map((route, index) => ({
    url: `${siteUrl}${route}`,
    lastModified: updated,
    changeFrequency: index === 0 ? "daily" : "weekly",
    priority: index === 0 ? 1 : 0.7,
  }));
  const [collections, products, designers, articles] = await Promise.all([
    getCollections(),
    getProducts(),
    getDesigners(),
    getJournalArticles(),
  ]);
  const dynamicEntries: MetadataRoute.Sitemap = [
    ...collections.map((item) => `/collections/${item.slug}`),
    ...products.map((item) => `/products/${item.slug || item.id}`),
    ...designers.map((item) => `/designers/${item.slug || item.id}`),
    ...articles.map((item) => `/journal/${item.slug || item.id}`),
  ].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: updated,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...dynamicEntries];
}
