"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { listFabrics, listStyles, listTailors } from "@/lib/api/catalog";
import { formatNaira } from "@/lib/format";
import { fileUrl, pbErrorMessage } from "@/lib/pb";
import type { CatalogStyle, Fabric, FabricType, StyleCategory, User } from "@/lib/types";
import { displayName } from "@/components/client/order-utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

type Tab = "styles" | "fabrics" | "tailors";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "styles", label: "Styles" },
  { key: "fabrics", label: "Fabrics" },
  { key: "tailors", label: "Tailors" },
];

const STYLE_CATEGORIES: StyleCategory[] = [
  "agbada",
  "senator",
  "kaftan",
  "dashiki",
  "buba_sokoto",
  "iro_buba",
  "ankara_gown",
  "suit",
  "shirt",
  "trouser",
  "dress",
  "other",
];

const FABRIC_TYPES: FabricType[] = [
  "ankara",
  "aso_oke",
  "adire",
  "lace",
  "george",
  "senator_material",
  "kente",
  "cotton",
  "silk",
  "wool",
  "linen",
  "polyester",
  "mixed",
  "other",
];

function useDebounced(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CatalogPage() {
  const [tab, setTab] = useState<Tab>("styles");

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Browse styles, fabrics and tailors to plan your next outfit."
      />

      <div
        role="tablist"
        aria-label="Catalog sections"
        className="mb-6 inline-flex rounded-xl border border-neutral-200 bg-white p-1 shadow-sm"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-brand-700 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "styles" && <StylesTab />}
      {tab === "fabrics" && <FabricsTab />}
      {tab === "tailors" && <TailorsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function StylesTab() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [styles, setStyles] = useState<CatalogStyle[] | null>(null);
  const [detail, setDetail] = useState<CatalogStyle | null>(null);
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    let active = true;
    listStyles({
      search: debouncedSearch || undefined,
      category: (category || undefined) as StyleCategory | undefined,
      gender: gender || undefined,
      perPage: 100,
    })
      .then((r) => {
        if (active) setStyles(r.items);
      })
      .catch((err) => {
        if (active) toast.show(pbErrorMessage(err), "error");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, gender]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <Input
            type="search"
            placeholder="Search styles…"
            aria-label="Search styles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {STYLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-36">
          <Select
            aria-label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Anyone</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="unisex">Unisex</option>
          </Select>
        </div>
      </div>

      {!styles ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : styles.length === 0 ? (
        <EmptyState
          title="No styles found"
          description="Try a different search or category."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {styles.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setDetail(s)}
              className="rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition-all hover:border-brand-400 hover:shadow"
            >
              {s.images?.[0] ? (
                <img
                  src={fileUrl(s, s.images[0], "300x300")}
                  alt={s.name}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-lg bg-brand-50 font-display text-3xl font-semibold text-brand-300">
                  {s.name.charAt(0)}
                </div>
              )}
              <p className="mt-2 truncate text-sm font-medium text-neutral-900">
                {s.name}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <Badge tone="brand" className="capitalize">
                  {s.category.replace(/_/g, " ")}
                </Badge>
                <span className="text-xs font-medium text-neutral-600">
                  {formatNaira(s.basePrice, s.currency)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name}
        footer={
          detail ? (
            <Link
              href={`/app/orders/new?styleId=${detail.id}`}
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Start order
            </Link>
          ) : undefined
        }
      >
        {detail && (
          <div>
            {detail.images?.[0] && (
              <img
                src={fileUrl(detail, detail.images[0], "600x0")}
                alt={detail.name}
                className="mb-4 max-h-64 w-full rounded-xl object-cover"
              />
            )}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="brand" className="capitalize">
                {detail.category.replace(/_/g, " ")}
              </Badge>
              {detail.gender && (
                <Badge className="capitalize">{detail.gender}</Badge>
              )}
              <span className="ml-auto font-display text-base font-semibold text-neutral-900">
                from {formatNaira(detail.basePrice, detail.currency)}
              </span>
            </div>
            {detail.description && (
              <p className="text-sm text-neutral-600">{detail.description}</p>
            )}
            {detail.tags && detail.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fabrics
// ---------------------------------------------------------------------------

function FabricsTab() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [fabrics, setFabrics] = useState<Fabric[] | null>(null);
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    let active = true;
    listFabrics({
      search: debouncedSearch || undefined,
      type: (type || undefined) as FabricType | undefined,
      perPage: 100,
    })
      .then((r) => {
        if (active) setFabrics(r.items);
      })
      .catch((err) => {
        if (active) toast.show(pbErrorMessage(err), "error");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, type]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <Input
            type="search"
            placeholder="Search fabrics, colours, patterns…"
            aria-label="Search fabrics"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            aria-label="Fabric type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            {FABRIC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {!fabrics ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : fabrics.length === 0 ? (
        <EmptyState
          title="No fabrics found"
          description="Try a different search or fabric type."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {fabrics.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
            >
              {f.images?.[0] ? (
                <img
                  src={fileUrl(f, f.images[0], "300x300")}
                  alt={f.name}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-lg bg-accent-50 font-display text-3xl font-semibold text-accent-300">
                  {f.name.charAt(0)}
                </div>
              )}
              <p className="mt-2 truncate text-sm font-medium text-neutral-900">
                {f.name}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {[f.color, f.pattern].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-neutral-800">
                  {formatNaira(f.pricePerMeter)}/m
                </span>
                {f.availableQuantity > 0 ? (
                  <Badge tone="success">{f.availableQuantity}m left</Badge>
                ) : (
                  <Badge tone="danger">Out of stock</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tailors
// ---------------------------------------------------------------------------

function TailorsTab() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [tailors, setTailors] = useState<User[] | null>(null);
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    let active = true;
    listTailors({ search: debouncedSearch || undefined, perPage: 100 })
      .then((r) => {
        if (active) setTailors(r.items);
      })
      .catch((err) => {
        if (active) toast.show(pbErrorMessage(err), "error");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div>
      <div className="mb-5 w-full sm:w-64">
        <Input
          type="search"
          placeholder="Search tailors or locations…"
          aria-label="Search tailors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!tailors ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : tailors.length === 0 ? (
        <EmptyState
          title="No tailors found"
          description="Try a different search."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tailors.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-800 text-sm font-semibold text-white">
                  {(displayName(t).charAt(0) || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {displayName(t)}
                  </p>
                  {t.location && (
                    <p className="truncate text-xs text-neutral-500">
                      {t.location}
                    </p>
                  )}
                </div>
              </div>
              {t.bio && (
                <p className="mt-3 line-clamp-3 text-sm text-neutral-600">
                  {t.bio}
                </p>
              )}
              <div className="mt-4 flex gap-2 pt-1">
                <Link
                  href={`/app/appointments?tailor=${t.id}`}
                  className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
                >
                  Book fitting
                </Link>
                <Link
                  href="/app/orders/new"
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Start order
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
