import { ClientResponseError } from "pocketbase";
import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type { WishlistItem } from "@/lib/types";

export interface WishlistEntryInput {
  product: string;
  variantId?: string;
}

export async function listWishlist(): Promise<WishlistItem[]> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.wishlistItems).getFullList<WishlistItem>({
    filter: pb.filter("user = {:user}", { user: authedUserId() }),
    sort: "-created",
    expand: "product",
  });
}

export async function addWishlistItem(
  product: string,
  variantId = ""
): Promise<WishlistItem> {
  return getPb().collection(COLLECTIONS.wishlistItems).create<WishlistItem>(
    {
      user: authedUserId(),
      product,
      variantId: normalizeVariantId(variantId),
    },
    { expand: "product" }
  );
}

export async function removeWishlistItem(id: string): Promise<void> {
  await getPb().collection(COLLECTIONS.wishlistItems).delete(id);
}

/** Returns the created item, or `null` when the existing item was removed. */
export async function toggleWishlistItem(
  product: string,
  variantId = ""
): Promise<WishlistItem | null> {
  const existing = await findWishlistItem(product, variantId);
  if (existing) {
    await removeWishlistItem(existing.id);
    return null;
  }
  return addWishlistItem(product, variantId);
}

/**
 * Merge guest/local wishlist entries into the signed-in account. Existing
 * entries win, making repeated login merges idempotent.
 */
export async function mergeWishlist(
  entries: WishlistEntryInput[]
): Promise<WishlistItem[]> {
  const current = await listWishlist();
  const byKey = new Map(current.map((item) => [wishlistKey(item), item]));
  const uniqueEntries = new Map(
    entries
      .filter((entry) => entry.product)
      .map((entry) => [
        wishlistKey({
          product: entry.product,
          variantId: normalizeVariantId(entry.variantId),
        }),
        entry,
      ])
  );

  for (const [key, entry] of uniqueEntries) {
    if (byKey.has(key)) continue;
    try {
      const created = await addWishlistItem(entry.product, entry.variantId);
      byKey.set(key, created);
    } catch (error) {
      // A concurrent tab may have inserted the same unique tuple.
      if (!(error instanceof ClientResponseError) || error.status !== 400) {
        throw error;
      }
      const existing = await findWishlistItem(entry.product, entry.variantId);
      if (!existing) throw error;
      byKey.set(key, existing);
    }
  }

  return [...byKey.values()].sort((a, b) => b.created.localeCompare(a.created));
}

export async function clearWishlist(): Promise<void> {
  const items = await listWishlist();
  await Promise.all(items.map((item) => removeWishlistItem(item.id)));
}

async function findWishlistItem(
  product: string,
  variantId = ""
): Promise<WishlistItem | null> {
  const pb = getPb();
  const result = await pb
    .collection(COLLECTIONS.wishlistItems)
    .getList<WishlistItem>(1, 1, {
      filter: pb.filter(
        "user = {:user} && product = {:product} && variantId = {:variantId}",
        {
          user: authedUserId(),
          product,
          variantId: normalizeVariantId(variantId),
        }
      ),
      expand: "product",
    });
  return result.items[0] ?? null;
}

function normalizeVariantId(variantId?: string): string {
  return variantId?.trim() ?? "";
}

function wishlistKey(item: { product: string; variantId?: string }): string {
  return `${item.product}:${normalizeVariantId(item.variantId)}`;
}
