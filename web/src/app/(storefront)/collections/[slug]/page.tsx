import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialVisual } from "@/components/storefront/EditorialVisual";
import { ProductCard } from "@/components/storefront/StorefrontCards";
import { CallToAction, SectionHeading, StorefrontSection } from "@/components/storefront/StorefrontBlocks";
import { getCollection, getCollectionProducts, getCollections } from "@/lib/storefront-content";
import styles from "@/components/storefront/storefront.module.css";

type CollectionPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getCollections()).map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return { title: "Collection" };
  return {
    title: collection.name,
    description: collection.description,
  };
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();
  const products = await getCollectionProducts(collection);

  return (
    <>
      <section className={styles.splitFeature}>
        <div className={styles.splitCopy}>
          <span className={styles.eyebrow}>{collection.eyebrow}</span>
          <h1>{collection.name}</h1>
          <p>{collection.description}</p>
          <a href="#collection-pieces" className={styles.buttonPrimary}>
            Explore the edit
          </a>
        </div>
        <EditorialVisual
          image={collection.image}
          alt={`${collection.name} collection campaign`}
          tone={collection.tone}
          className={styles.splitVisual}
        />
      </section>

      <StorefrontSection>
        <div id="collection-pieces">
          <SectionHeading
            eyebrow={`${collection.itemCount || products.length} considered pieces`}
            title={`The ${collection.name} edit`}
            description="Every piece can be refined through fabric, colour and measurement choices before it is made for you."
          />
          <div className={styles.productGrid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </StorefrontSection>

      <CallToAction
        title="Make this collection personal."
        body="Choose a piece as your starting point or work with a designer to shape a completely individual commission."
        primaryHref="/design"
        primaryLabel="Customise a piece"
        secondaryHref="/appointments"
        secondaryLabel="Book a consultation"
      />
    </>
  );
}

