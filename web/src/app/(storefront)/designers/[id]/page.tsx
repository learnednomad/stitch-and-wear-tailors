import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialVisual } from "@/components/storefront/EditorialVisual";
import { ProductCard } from "@/components/storefront/StorefrontCards";
import { CallToAction, SectionHeading, StorefrontSection } from "@/components/storefront/StorefrontBlocks";
import { getDesigner, getDesigners, getProducts } from "@/lib/storefront-content";
import styles from "@/components/storefront/storefront.module.css";

type DesignerPageProps = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return (await getDesigners()).map((designer) => ({ id: designer.slug || designer.id }));
}

export async function generateMetadata({ params }: DesignerPageProps): Promise<Metadata> {
  const { id } = await params;
  const designer = await getDesigner(id);
  if (!designer) return { title: "Designer" };
  return {
    title: designer.businessName,
    description: designer.headline,
  };
}

export default async function DesignerProfilePage({ params }: DesignerPageProps) {
  const { id } = await params;
  const designer = await getDesigner(id);
  if (!designer) notFound();
  const allProducts = await getProducts();
  const ownProducts = allProducts.filter((product) =>
    product.seller === designer.tailorId ||
    product.seller === designer.id ||
    product.seller === designer.slug ||
    product.sellerName.toLowerCase().includes(designer.businessName.toLowerCase().split(" ")[0]),
  );
  const portfolio = ownProducts.length ? ownProducts : allProducts.slice(0, 4);

  return (
    <>
      <section className={styles.profileHero}>
        <EditorialVisual
          image={designer.coverImage || designer.image}
          alt={`${designer.displayName} in the ${designer.businessName} atelier`}
          tone={designer.tone}
          portrait
          className={styles.profileVisual}
        />
        <div className={styles.profileIntro}>
          <span className={styles.eyebrow}>{designer.verified ? "Verified Stitch & Wear designer" : "Independent designer"}</span>
          <h1>{designer.businessName}</h1>
          <p className={styles.profileHeadline}>{designer.headline}</p>
          <p className={styles.profileLocation}>{designer.displayName} · {designer.location}</p>
          <div className={styles.heroActions}>
            <Link href={`/appointments?designer=${designer.slug}`} className={styles.buttonPrimary}>Book this designer</Link>
            <a href="#portfolio" className={styles.buttonSecondary}>View portfolio</a>
          </div>
        </div>
      </section>

      <StorefrontSection compact>
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <p className={styles.statValue}>{designer.yearsExperience}+</p>
            <p className={styles.statLabel}>Years experience</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statValue}>{designer.rating.toFixed(1)}</p>
            <p className={styles.statLabel}>Client rating</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statValue}>{designer.completedOrders}+</p>
            <p className={styles.statLabel}>Pieces completed</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statValue}>{designer.reviewCount}</p>
            <p className={styles.statLabel}>Client reviews</p>
          </div>
        </div>
      </StorefrontSection>

      <StorefrontSection bordered>
        <div className={styles.profileColumns}>
          <div>
            <span className={styles.eyebrow}>About the atelier</span>
            <h2 className={styles.bodyTitle}>Craft with a point of view.</h2>
            <p className={styles.bodyCopy}>{designer.bio}</p>
            <div className={styles.specialtyList} aria-label="Specialties">
              {designer.specialties.map((specialty) => (
                <span key={specialty} className={styles.specialty}>{specialty}</span>
              ))}
            </div>
          </div>
          <div className={styles.quoteCard}>
            <blockquote>
              “Every fitting is a conversation. The cloth tells us something, but the client must always feel seen in the final piece.”
            </blockquote>
            <cite>— {designer.displayName}, Creative Director</cite>
          </div>
        </div>
      </StorefrontSection>

      <StorefrontSection bordered>
        <div id="portfolio">
          <SectionHeading
            eyebrow="Selected work"
            title={`From ${designer.businessName}`}
            description="Signature pieces and ready-to-order designs from the atelier."
          />
          <div className={styles.productGrid}>
            {portfolio.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </StorefrontSection>

      <CallToAction
        title={`Begin a piece with ${designer.businessName}.`}
        body="Book a consultation to discuss your occasion, timeline, measurements and the details that will make the commission yours."
        primaryHref={`/appointments?designer=${designer.slug}`}
        primaryLabel="Book this designer"
        secondaryHref="/measurements-guide"
        secondaryLabel="Prepare measurements"
      />
    </>
  );
}
