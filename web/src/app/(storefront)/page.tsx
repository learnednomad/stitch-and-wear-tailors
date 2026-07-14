import type { Metadata } from "next";
import Link from "next/link";
import { EditorialVisual } from "@/components/storefront/EditorialVisual";
import { JsonLd } from "@/components/storefront/JsonLd";
import { ArticleCard, CollectionCard, DesignerCard, ProductCard } from "@/components/storefront/StorefrontCards";
import { CallToAction, SectionHeading, StorefrontSection } from "@/components/storefront/StorefrontBlocks";
import { getCollections, getDesigners, getEditorialPage, getJournalArticles, getProducts } from "@/lib/storefront-content";
import styles from "@/components/storefront/storefront.module.css";

const TRUST_POINTS = [
  { icon: "◇", label: "Premium fabrics" },
  { icon: "✦", label: "Verified tailors" },
  { icon: "⌁", label: "Perfect fit" },
  { icon: "○", label: "Worldwide delivery" },
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getEditorialPage("home");
  return {
    title: page?.seoTitle || "Bespoke Nigerian Fashion",
    description:
      page?.seoDescription ||
      "Commission bespoke Nigerian tailoring and discover ready-to-wear pieces from verified independent ateliers.",
  };
}

export default async function StorefrontHomePage() {
  const [collections, products, designers, articles, homePage] = await Promise.all([
    getCollections(),
    getProducts(),
    getDesigners(),
    getJournalArticles(),
    getEditorialPage("home"),
  ]);
  const heroTitle = homePage?.title || "Bespoke craft for your legacy";
  const titleWords = heroTitle.replace(/[.!]$/, "").split(" ");
  const titleAccent = titleWords.pop() || "legacy";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Stitch & Wear Tailors",
          url:
            process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
            "https://stitchandwear.com",
          description:
            homePage?.summary ||
            "Bespoke Nigerian tailoring and a curated marketplace of independent ateliers.",
        }}
      />
      <section className={styles.homeHero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>{homePage?.eyebrow || "Made in Nigeria · Made for you"}</span>
            <h1 className={styles.heroTitle}>
              {titleWords.join(" ")} <em>{titleAccent}.</em>
            </h1>
            <p className={styles.heroCopy}>
              {homePage?.summary || "Discover exceptional Nigerian tailoring, commission a piece that is entirely yours, and follow every considered detail from cloth to final fit."}
            </p>
            <div className={styles.heroActions}>
              <Link href="/appointments" className={styles.buttonPrimary}>
                Book an appointment
              </Link>
              <Link href="/collections" className={styles.buttonSecondary}>
                Explore collections
              </Link>
            </div>
          </div>
          <EditorialVisual
            image={homePage?.image || collections[0]?.image}
            alt="A signature Stitch & Wear ceremonial look"
            tone="bronze"
            className={styles.heroArtwork}
          />
        </div>
      </section>

      <div className={styles.trustStrip}>
        <div className={styles.trustGrid}>
          {TRUST_POINTS.map((point) => (
            <div key={point.label} className={styles.trustItem}>
              <span className={styles.trustIcon} aria-hidden>{point.icon}</span>
              {point.label}
            </div>
          ))}
        </div>
      </div>

      <StorefrontSection>
        <SectionHeading
          eyebrow="The Stitch & Wear edit"
          title="Shop our collections"
          description="A considered wardrobe of ceremony, ease and contemporary Nigerian expression."
          href="/collections"
          linkLabel="All collections"
        />
        <div className={styles.collectionGrid}>
          {collections.slice(0, 4).map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </StorefrontSection>

      <StorefrontSection bordered>
        <SectionHeading
          eyebrow="Curated marketplace"
          title="Pieces of distinction"
          description="Ready-to-order pieces from verified ateliers, selected for exceptional cloth, cut and finish."
          href="/marketplace"
          linkLabel="Shop marketplace"
        />
        <div className={styles.productGrid}>
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </StorefrontSection>

      <StorefrontSection bordered>
        <div className={styles.splitFeature}>
          <EditorialVisual
            image={products.find((product) => product.tone === "indigo")?.image}
            alt="A made-to-measure look developed through the Stitch & Wear design studio"
            tone="indigo"
            className={styles.splitVisual}
          />
          <div className={styles.splitCopy}>
            <span className={styles.eyebrow}>Your vision, expertly made</span>
            <h2>Design something unmistakably yours.</h2>
            <p>
              Choose a silhouette, explore cloth and finishing, add your measurements,
              and collaborate with a verified tailor on a garment made around you.
            </p>
            <Link href="/design" className={styles.buttonPrimary}>
              Enter the design studio
            </Link>
          </div>
        </div>
      </StorefrontSection>

      <StorefrontSection bordered>
        <SectionHeading
          eyebrow="The hands behind the cloth"
          title="Meet our designers"
          description="Independent makers, master tailors and evolving ateliers from across Nigeria."
          href="/designers"
          linkLabel="Meet every maker"
        />
        <div className={styles.designerGrid}>
          {designers.slice(0, 3).map((designer) => (
            <DesignerCard key={designer.id} designer={designer} />
          ))}
        </div>
      </StorefrontSection>

      <StorefrontSection bordered>
        <SectionHeading
          eyebrow="Journal"
          title="Stories of style and craft"
          description="The histories, people and practical knowledge behind a beautifully made wardrobe."
          href="/journal"
          linkLabel="Read the journal"
        />
        <div className={styles.journalGrid}>
          {articles.slice(0, 4).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </StorefrontSection>

      <CallToAction
        title="A perfect fit begins with a conversation."
        body="Book a private consultation with a verified tailor, in person or online, and begin your next piece with confidence."
        primaryHref="/appointments"
        primaryLabel="Book an appointment"
        secondaryHref="/designers"
        secondaryLabel="Explore our designers"
      />
    </>
  );
}
