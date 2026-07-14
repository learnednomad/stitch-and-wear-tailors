import Link from "next/link";
import { formatNaira } from "@/lib/format";
import {
  formatStorefrontDate,
  type JournalArticle,
  type StorefrontCollection,
  type StorefrontDesigner,
  type StorefrontProduct,
} from "@/lib/storefront-content";
import { EditorialVisual } from "./EditorialVisual";
import styles from "./storefront.module.css";

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1A5.5 5.5 0 0 0 3.1 12.6L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

export function CollectionCard({ collection }: { collection: StorefrontCollection }) {
  return (
    <Link href={`/collections/${collection.slug}`} className={styles.collectionCard}>
      <EditorialVisual
        image={collection.image}
        alt={`${collection.name} collection`}
        tone={collection.tone}
        className={styles.collectionVisual}
      />
      <span className={styles.collectionOverlay}>
        <span className={styles.cardEyebrow}>{collection.eyebrow}</span>
        <span className={styles.collectionName}>{collection.name}</span>
        <span className={styles.collectionCount}>
          {collection.itemCount || "Curated"} {collection.itemCount === 1 ? "piece" : "pieces"}
        </span>
      </span>
    </Link>
  );
}

export function ProductCard({ product }: { product: StorefrontProduct }) {
  return (
    <article className={styles.productCard}>
      <Link href={`/products/${product.slug || product.id}`} className={styles.productImageLink}>
        <EditorialVisual
          image={product.image}
          alt={product.name}
          tone={product.tone}
          className={styles.productVisual}
        />
        {product.featured && <span className={styles.productBadge}>Signature piece</span>}
        <span className={styles.wishlistButton} aria-hidden>
          <HeartIcon />
        </span>
      </Link>
      <div className={styles.productMeta}>
        <div className={styles.productTopline}>
          <span>{product.category.replaceAll("_", " ")}</span>
          <span>{product.sellerName}</span>
        </div>
        <Link href={`/products/${product.slug || product.id}`} className={styles.productName}>
          {product.name}
        </Link>
        <div className={styles.productBottom}>
          <p className={styles.productPrice}>
            {formatNaira(product.price, product.currency)}
            {product.compareAtPrice ? (
              <span className={styles.comparePrice}>{formatNaira(product.compareAtPrice, product.currency)}</span>
            ) : null}
          </p>
          <span className={styles.rating} aria-label={`${product.rating.toFixed(1)} out of 5 stars`}>
            ★ {product.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </article>
  );
}

export function DesignerCard({ designer }: { designer: StorefrontDesigner }) {
  return (
    <Link href={`/designers/${designer.slug || designer.id}`} className={styles.designerCard}>
      <EditorialVisual
        image={designer.image}
        alt={`${designer.displayName}, ${designer.businessName}`}
        tone={designer.tone}
        portrait
        className={styles.designerVisual}
      />
      <div className={styles.designerMeta}>
        <p className={styles.designerName}>{designer.businessName}</p>
        <p className={styles.designerLocation}>
          {designer.displayName} · {designer.location}
        </p>
        {designer.verified && <span className={styles.verified} aria-label="Verified designer">✓</span>}
      </div>
    </Link>
  );
}

export function ArticleCard({ article }: { article: JournalArticle }) {
  return (
    <Link href={`/journal/${article.slug}`} className={styles.articleCard}>
      <EditorialVisual
        image={article.image}
        alt={article.title}
        tone={article.tone}
        portrait
        className={styles.articleVisual}
      />
      <div className={styles.articleMeta}>
        <span className={styles.cardEyebrow}>{article.categoryLabel}</span>
        <h2 className={styles.articleTitle}>{article.title}</h2>
        <p className={styles.articleExcerpt}>{article.excerpt}</p>
        <p className={styles.articleDate}>
          {formatStorefrontDate(article.publishedAt)} · {article.readingMinutes} min read
        </p>
      </div>
    </Link>
  );
}
