import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/storefront/StorefrontCards";
import { PageHero, StorefrontSection } from "@/components/storefront/StorefrontBlocks";
import { getJournalArticles } from "@/lib/storefront-content";
import styles from "@/components/storefront/storefront.module.css";

export const metadata: Metadata = {
  title: "Journal",
  description: "Stories, practical guides and considered perspectives on Nigerian style, textiles and tailoring craft.",
};

const CATEGORIES = [
  { value: "", label: "All stories" },
  { value: "style_guide", label: "Style guides" },
  { value: "behind_the_seams", label: "Behind the seams" },
  { value: "craftsmanship", label: "Craftsmanship" },
  { value: "weddings", label: "Weddings" },
];

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const category = first(params.category);
  const articles = await getJournalArticles();
  const filtered = category ? articles.filter((article) => article.category === category) : articles;

  return (
    <>
      <PageHero
        eyebrow="The Stitch & Wear journal"
        title="Stories in every stitch"
        description="Meet the people, understand the processes and gather the practical knowledge behind an enduring, beautifully made wardrobe."
      />
      <StorefrontSection compact>
        <nav className={styles.specialtyList} aria-label="Journal categories">
          {CATEGORIES.map((item) => (
            <Link
              key={item.value}
              href={item.value ? `/journal?category=${item.value}` : "/journal"}
              className={styles.specialty}
              aria-current={category === item.value ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </StorefrontSection>
      <StorefrontSection bordered compact>
        {filtered.length ? (
          <div className={styles.journalGrid}>
            {filtered.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h2>No stories in this edit yet</h2>
            <p>Explore the full journal while our editors prepare the next story.</p>
            <Link href="/journal" className={styles.textLink}>View all stories</Link>
          </div>
        )}
      </StorefrontSection>
    </>
  );
}

