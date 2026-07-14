import type { ListResult } from "pocketbase";
import { COLLECTIONS, getPb } from "@/lib/pb";
import type {
  JournalCategory,
  JournalPost,
  StorefrontAudience,
  StorefrontCollection,
  StorefrontPage,
  TailorProfile,
} from "@/lib/types";

export interface StorefrontCollectionFilters {
  audience?: StorefrontAudience;
  featured?: boolean;
  page?: number;
  perPage?: number;
}

export async function listStorefrontCollections(
  filters: StorefrontCollectionFilters = {}
): Promise<ListResult<StorefrontCollection>> {
  const pb = getPb();
  const { audience, featured, page = 1, perPage = 24 } = filters;
  const parts = ["isActive = true"];
  if (audience && audience !== "all") {
    parts.push(
      pb.filter('(audience = "all" || audience = {:audience})', { audience })
    );
  }
  if (featured !== undefined) {
    parts.push(pb.filter("isFeatured = {:featured}", { featured }));
  }

  return pb
    .collection(COLLECTIONS.storefrontCollections)
    .getList<StorefrontCollection>(page, perPage, {
      filter: parts.join(" && "),
      sort: "sortOrder,name",
      expand: "products",
    });
}

export async function getStorefrontCollection(
  slug: string
): Promise<StorefrontCollection> {
  const pb = getPb();
  return pb
    .collection(COLLECTIONS.storefrontCollections)
    .getFirstListItem<StorefrontCollection>(
      pb.filter("slug = {:slug} && isActive = true", { slug }),
      { expand: "products" }
    );
}

export interface TailorProfileFilters {
  search?: string;
  featured?: boolean;
  location?: string;
  page?: number;
  perPage?: number;
}

export async function listTailorProfiles(
  filters: TailorProfileFilters = {}
): Promise<ListResult<TailorProfile>> {
  const pb = getPb();
  const {
    search,
    featured,
    location,
    page = 1,
    perPage = 24,
  } = filters;
  const parts = ["isActive = true"];
  if (search) {
    parts.push(
      pb.filter(
        "(displayName ~ {:query} || businessName ~ {:query} || headline ~ {:query} || location ~ {:query})",
        { query: search }
      )
    );
  }
  if (featured !== undefined) {
    parts.push(pb.filter("isFeatured = {:featured}", { featured }));
  }
  if (location) {
    parts.push(pb.filter("location ~ {:location}", { location }));
  }

  return pb
    .collection(COLLECTIONS.tailorProfiles)
    .getList<TailorProfile>(page, perPage, {
      filter: parts.join(" && "),
      sort: "-isFeatured,-rating,displayName",
    });
}

export async function getTailorProfile(
  slugOrId: string
): Promise<TailorProfile> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.tailorProfiles).getFirstListItem<TailorProfile>(
    pb.filter(
      "isActive = true && (id = {:value} || slug = {:value} || tailor = {:value})",
      { value: slugOrId }
    )
  );
}

export interface JournalPostFilters {
  category?: JournalCategory;
  featured?: boolean;
  search?: string;
  page?: number;
  perPage?: number;
}

export async function listJournalPosts(
  filters: JournalPostFilters = {}
): Promise<ListResult<JournalPost>> {
  const pb = getPb();
  const {
    category,
    featured,
    search,
    page = 1,
    perPage = 12,
  } = filters;
  const now = new Date().toISOString().replace("T", " ");
  const parts = [
    pb.filter("isPublished = true && publishedAt <= {:now}", { now }),
  ];
  if (category) {
    parts.push(pb.filter("category = {:category}", { category }));
  }
  if (featured !== undefined) {
    parts.push(pb.filter("isFeatured = {:featured}", { featured }));
  }
  if (search) {
    parts.push(
      pb.filter("(title ~ {:query} || excerpt ~ {:query})", { query: search })
    );
  }

  return pb.collection(COLLECTIONS.journalPosts).getList<JournalPost>(
    page,
    perPage,
    {
      filter: parts.join(" && "),
      sort: "-isFeatured,-publishedAt",
      expand: "author",
    }
  );
}

export async function getJournalPost(slug: string): Promise<JournalPost> {
  const pb = getPb();
  const now = new Date().toISOString().replace("T", " ");
  return pb.collection(COLLECTIONS.journalPosts).getFirstListItem<JournalPost>(
    pb.filter(
      "slug = {:slug} && isPublished = true && publishedAt <= {:now}",
      { slug, now }
    ),
    { expand: "author" }
  );
}

export async function getStorefrontPage(slug: string): Promise<StorefrontPage> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.storefrontPages).getFirstListItem<StorefrontPage>(
    pb.filter("slug = {:slug} && isPublished = true", { slug })
  );
}
