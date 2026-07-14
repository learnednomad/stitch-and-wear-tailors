import type { Metadata } from "next";
import { EditorialVisual } from "@/components/storefront/EditorialVisual";
import { CallToAction, StorefrontSection } from "@/components/storefront/StorefrontBlocks";
import { getEditorialPage } from "@/lib/storefront-content";
import styles from "@/components/storefront/storefront.module.css";

export const metadata: Metadata = {
  title: "About Us",
  description: "Discover Stitch & Wear's mission to carry Nigerian tailoring heritage forward through thoughtful technology and trusted makers.",
};

const DEFAULT_VALUES = ["Heritage", "Quality", "Craftsmanship", "Sustainability"];

const VALUE_COPY: Record<string, string> = {
  Heritage: "We honour the lineages, silhouettes and textile knowledge that give Nigerian dress its depth.",
  Quality: "We select for enduring cloth, assured construction and a final fit that feels considered from every angle.",
  Craftsmanship: "We make the labour visible, celebrate skilled hands and keep the relationship between client and maker human.",
  Sustainability: "Made-to-order production, thoughtful sourcing and pieces designed to stay in wardrobes for years, not weeks.",
};

export default async function AboutPage() {
  const page = await getEditorialPage("about");
  const body = typeof page?.content.body === "string"
    ? page.content.body
    : "We connect discerning clients with independent makers, protecting the intimacy of bespoke service while making every step easier to follow.";
  const values = Array.isArray(page?.content.values)
    ? page.content.values.filter((value): value is string => typeof value === "string")
    : DEFAULT_VALUES;

  return (
    <>
      <section className={styles.aboutHero}>
        <div className={styles.aboutHeroCopy}>
          <span className={styles.eyebrow}>{page?.eyebrow || "Our story"}</span>
          <h1>{page?.title || "About Stitch & Wear"}</h1>
          <p>{page?.summary || "A marketplace built to carry Nigerian tailoring heritage forward."}</p>
        </div>
        <EditorialVisual
          image={page?.image}
          alt="Nigerian tailors working together around an atelier table"
          tone="bronze"
          portrait
          className={styles.aboutVisual}
        />
      </section>

      <StorefrontSection>
        <div className={styles.profileColumns}>
          <div>
            <span className={styles.eyebrow}>Why we exist</span>
            <h2 className={styles.bodyTitle}>Craft deserves both reverence and reach.</h2>
          </div>
          <div>
            <p className={styles.bodyCopy}>{body}</p>
            <p className={styles.bodyCopy}>
              Stitch &amp; Wear brings discovery, measurements, collaboration and order
              progress into one calm experience—without flattening the individual point
              of view that makes bespoke service special.
            </p>
          </div>
        </div>
      </StorefrontSection>

      <StorefrontSection bordered>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>What guides us</span>
            <h2 className={styles.sectionTitle}>Our values</h2>
          </div>
        </div>
        <div className={styles.valuesGrid}>
          {values.map((value, index) => (
            <article className={styles.valueCard} key={value}>
              <p className={styles.valueNumber}>0{index + 1}</p>
              <h3>{value}</h3>
              <p>{VALUE_COPY[value] || "A principle that shapes how we select, collaborate and deliver."}</p>
            </article>
          ))}
        </div>
      </StorefrontSection>

      <StorefrontSection bordered>
        <div className={styles.splitFeature}>
          <EditorialVisual
            alt="Hands guiding cloth beneath a tailor's machine"
            tone="forest"
            portrait
            className={styles.splitVisual}
          />
          <div className={styles.splitCopy}>
            <span className={styles.eyebrow}>Built around real makers</span>
            <h2>Technology should make craft feel closer.</h2>
            <p>
              Our role is to remove friction: clear briefs, saved measurements, visible
              milestones and direct conversations. The designer&apos;s eye and the tailor&apos;s
              hand remain at the centre of every piece.
            </p>
          </div>
        </div>
      </StorefrontSection>

      <CallToAction
        title="Discover who is making next."
        body="Meet the verified designers and tailors bringing their own histories, specialties and creative language to Stitch & Wear."
        primaryHref="/designers"
        primaryLabel="Meet our designers"
        secondaryHref="/collections"
        secondaryLabel="Explore collections"
      />
    </>
  );
}

