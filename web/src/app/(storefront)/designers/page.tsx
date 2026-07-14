import type { Metadata } from "next";
import { DesignerCard } from "@/components/storefront/StorefrontCards";
import { CallToAction, PageHero, StorefrontSection } from "@/components/storefront/StorefrontBlocks";
import { getDesigners } from "@/lib/storefront-content";
import styles from "@/components/storefront/storefront.module.css";

export const metadata: Metadata = {
  title: "Our Designers",
  description: "Meet verified Nigerian tailors and independent designers creating exceptional made-to-measure fashion.",
};

export default async function DesignersPage() {
  const designers = await getDesigners();

  return (
    <>
      <PageHero
        eyebrow="Verified independent makers"
        title="Our designers"
        description="Meet the master tailors, textile thinkers and evolving ateliers shaping a confident expression of Nigerian style."
      />
      <StorefrontSection>
        <div className={styles.designerGrid}>
          {designers.map((designer) => (
            <DesignerCard key={designer.id} designer={designer} />
          ))}
        </div>
      </StorefrontSection>
      <CallToAction
        title="Find the right hands for your idea."
        body="Tell us what you are making and we will help you choose a designer whose craft, location and point of view fit the brief."
        primaryHref="/appointments"
        primaryLabel="Book a consultation"
        secondaryHref="/design"
        secondaryLabel="Start your design"
      />
    </>
  );
}

