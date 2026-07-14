import type { ListResult } from "pocketbase";
import { COLLECTIONS, getPb } from "@/lib/pb";
import type {
  CatalogStyle,
  Fabric,
  FabricType,
  StyleCategory,
  TailorProfile,
  User,
} from "@/lib/types";
import { listTailorProfiles } from "@/lib/api/storefront";

export interface StyleListFilters {
  category?: StyleCategory;
  gender?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

export async function listStyles(
  filters: StyleListFilters = {}
): Promise<ListResult<CatalogStyle>> {
  const pb = getPb();
  const { category, gender, search, page = 1, perPage = 24 } = filters;

  const parts: string[] = ["isActive = true"];
  if (category) parts.push(pb.filter("category = {:category}", { category }));
  if (gender) parts.push(pb.filter("gender = {:gender}", { gender }));
  if (search) {
    parts.push(
      pb.filter("(name ~ {:q} || description ~ {:q})", { q: search })
    );
  }

  return pb
    .collection(COLLECTIONS.catalogStyles)
    .getList<CatalogStyle>(page, perPage, {
      filter: parts.join(" && "),
      sort: "name",
    });
}

export interface FabricListFilters {
  type?: FabricType;
  search?: string;
  page?: number;
  perPage?: number;
}

export async function listFabrics(
  filters: FabricListFilters = {}
): Promise<ListResult<Fabric>> {
  const pb = getPb();
  const { type, search, page = 1, perPage = 24 } = filters;

  const parts: string[] = ["isActive = true"];
  if (type) parts.push(pb.filter("type = {:type}", { type }));
  if (search) {
    parts.push(
      pb.filter("(name ~ {:q} || color ~ {:q} || pattern ~ {:q})", {
        q: search,
      })
    );
  }

  return pb.collection(COLLECTIONS.fabrics).getList<Fabric>(page, perPage, {
    filter: parts.join(" && "),
    sort: "name",
    expand: "owner",
  });
}

export interface TailorListFilters {
  search?: string;
  page?: number;
  perPage?: number;
}

export async function listTailors(
  filters: TailorListFilters = {}
): Promise<ListResult<User>> {
  const result = await listTailorProfiles(filters);
  return {
    ...result,
    items: result.items.map(publicProfileAsLegacyUser),
  };
}

export async function getStyle(id: string): Promise<CatalogStyle> {
  return getPb().collection(COLLECTIONS.catalogStyles).getOne<CatalogStyle>(id);
}

export async function getFabric(id: string): Promise<Fabric> {
  return getPb().collection(COLLECTIONS.fabrics).getOne<Fabric>(id);
}

/**
 * Keep the dashboard's established `listTailors(): User[]` contract while
 * sourcing only public-safe fields. `id` deliberately remains the underlying
 * user id because order and appointment relations target the auth collection.
 */
function publicProfileAsLegacyUser(profile: TailorProfile): User {
  const [firstName = profile.displayName, ...lastName] =
    profile.displayName.trim().split(/\s+/);
  return {
    id: profile.tailor,
    collectionId: profile.collectionId,
    collectionName: profile.collectionName,
    created: profile.created,
    updated: profile.updated,
    email: "",
    verified: profile.isVerified,
    firstName,
    lastName: lastName.join(" "),
    userType: "tailor",
    phone: "",
    status: profile.isActive ? "active" : "inactive",
    avatar: "",
    businessName: profile.businessName,
    bio: profile.bio,
    location: profile.location,
  };
}
