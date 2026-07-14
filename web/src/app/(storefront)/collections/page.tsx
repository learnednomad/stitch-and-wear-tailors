import type { Metadata } from "next";
import { CollectionCard } from "@/components/storefront/StorefrontCards";
import { CallToAction, PageHero, StorefrontSection } from "@/components/storefront/StorefrontBlocks";
import { getCollections } from "@/lib/storefront-content";
import styles from "@/components/storefront/storefront.module.css";

export const metadata: Metadata = {
  title: "Collections",
  description: "Explore curated Nigerian occasion wear, everyday tailoring, textiles and bespoke collections.",
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <>
      <PageHero
        eyebrow="Curated by Stitch & Wear"
        title="Our collections"
        description="A wardrobe of enduring silhouettes, expressive textiles and modern Nigerian craft—made for ceremony, work and every meaningful day between."
      />
      <StorefrontSection>
        <div className={styles.collectionGrid}>
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </StorefrontSection>
      <CallToAction
        title="Can’t find quite what you imagined?"
        body="Start with a silhouette, choose your cloth and details, and let a verified maker bring the idea to life."
        primaryHref="/design"
        primaryLabel="Design your own"
        secondaryHref="/appointments"
        secondaryLabel="Speak with a tailor"
      />
    </>
  );
}

