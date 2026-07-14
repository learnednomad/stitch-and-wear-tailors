import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialVisual } from "@/components/storefront/EditorialVisual";
import { ArticleCard } from "@/components/storefront/StorefrontCards";
import { SectionHeading, StorefrontSection } from "@/components/storefront/StorefrontBlocks";
import {
  formatStorefrontDate,
  getJournalArticle,
  getJournalArticles,
} from "@/lib/storefront-content";
import styles from "@/components/storefront/storefront.module.css";

type JournalArticlePageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getJournalArticles()).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: JournalArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getJournalArticle(slug);
  if (!article) return { title: "Journal" };
  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default async function JournalArticlePage({ params }: JournalArticlePageProps) {
  const { slug } = await params;
  const article = await getJournalArticle(slug);
  if (!article) notFound();
  const allArticles = await getJournalArticles();
  const related = allArticles.filter((item) => item.slug !== article.slug).slice(0, 2);
  const paragraphs = article.body.split(/\n\s*\n/).filter(Boolean);

  return (
    <>
      <header className={styles.pageHero}>
        <div className={styles.pageHeroInner}>
          <span className={styles.eyebrow}>{article.categoryLabel}</span>
          <h1 className={styles.pageTitle}>{article.title}</h1>
          <p className={styles.pageDescription}>{article.excerpt}</p>
          <p className={styles.articleDate}>
            By {article.author} · {formatStorefrontDate(article.publishedAt)} · {article.readingMinutes} min read
          </p>
        </div>
      </header>
      <EditorialVisual
        image={article.image}
        alt={article.title}
        tone={article.tone}
        portrait
        className={styles.articleHeroVisual}
      />

      <article className={`${styles.narrowContainer} ${styles.articleBody}`}>
        {paragraphs.length ? (
          paragraphs.map((paragraph, index) =>
            index === 0 ? (
              <p className={styles.articleLead} key={paragraph}>{paragraph}</p>
            ) : (
              <p className={styles.articleParagraph} key={paragraph}>{paragraph}</p>
            ),
          )
        ) : (
          <p className={styles.articleLead}>{article.excerpt}</p>
        )}
        <aside className={styles.articleAside}>
          Good tailoring does not chase a moment. It gives the person wearing it more presence within that moment.
        </aside>
      </article>

      {related.length > 0 && (
        <StorefrontSection bordered>
          <SectionHeading eyebrow="Continue reading" title="From the journal" />
          <div className={styles.journalGrid}>
            {related.map((item) => (
              <ArticleCard key={item.id} article={item} />
            ))}
          </div>
        </StorefrontSection>
      )}
    </>
  );
}

