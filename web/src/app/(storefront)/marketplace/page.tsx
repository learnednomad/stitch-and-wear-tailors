import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/storefront/StorefrontCards";
import { PageHero, StorefrontSection } from "@/components/storefront/StorefrontBlocks";
import { getProducts } from "@/lib/storefront-content";
import styles from "@/components/storefront/storefront.module.css";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Shop distinctive Nigerian fashion and accessories from verified independent tailors and designers.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function MarketplacePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = first(params.q).trim().toLowerCase();
  const category = first(params.category);
  const sort = first(params.sort) || "featured";
  const allProducts = await getProducts();
  const categories = Array.from(new Set(allProducts.map((product) => product.category))).sort();

  const filtered = allProducts.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const haystack = `${product.name} ${product.category} ${product.description} ${product.sellerName}`.toLowerCase();
    return matchesCategory && (!query || haystack.includes(query));
  });

  filtered.sort((a, b) => {
    if (sort === "price-low") return a.price - b.price;
    if (sort === "price-high") return b.price - a.price;
    if (sort === "rating") return b.rating - a.rating;
    return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  });

  return (
    <>
      <PageHero
        eyebrow="Independent Nigerian design"
        title="Marketplace"
        description="Discover ready-to-order garments and accessories from verified makers, selected for distinctive design and assured craftsmanship."
      />
      <StorefrontSection>
        <form className={styles.filterBar} action="/marketplace" method="get" role="search">
          <div className={styles.filterGroup}>
            <input
              className={styles.input}
              type="search"
              name="q"
              defaultValue={first(params.q)}
              placeholder="Search pieces, makers or styles"
              aria-label="Search marketplace"
            />
            <select className={styles.select} name="category" defaultValue={category} aria-label="Filter by category">
              <option value="">All categories</option>
              {categories.map((item) => (
                <option value={item} key={item}>{item.replaceAll("_", " ")}</option>
              ))}
            </select>
            <select className={styles.select} name="sort" defaultValue={sort} aria-label="Sort products">
              <option value="featured">Featured</option>
              <option value="rating">Top rated</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
            <button className={styles.filterButton} type="submit">Apply</button>
          </div>
          <p className={styles.resultsCopy}>{filtered.length} {filtered.length === 1 ? "piece" : "pieces"}</p>
        </form>

        {filtered.length ? (
          <div className={styles.productGrid}>
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h2>No pieces match that search</h2>
            <p>Try a broader term or explore the full marketplace.</p>
            <Link href="/marketplace" className={styles.textLink}>Clear filters</Link>
          </div>
        )}
      </StorefrontSection>
    </>
  );
}

