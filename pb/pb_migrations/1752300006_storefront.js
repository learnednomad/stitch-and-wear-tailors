/// <reference path="../pb_data/types.d.ts" />
/**
 * Public storefront content and customer shopping state.
 *
 * Public tailor data intentionally lives in `tailor_profiles`. The auth
 * collection remains available to the account owner, superusers, and the
 * other party to an order/appointment only.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    const products = app.findCollectionByNameOrId("products")
    const catalogStyles = app.findCollectionByNameOrId("catalog_styles")
    const marketplaceOrders = app.findCollectionByNameOrId("marketplace_orders")

    // Never expose full auth records to anonymous storefront visitors. The
    // back-relations preserve the existing customer/tailor dashboard expands.
    const partyRule =
      'id = @request.auth.id || @request.auth.userType = "admin" || ' +
      '(@request.auth.userType = "tailor" && userType = "client" && ' +
      '(@collection.orders.customer ?= id && @collection.orders.tailor ?= @request.auth.id || ' +
      '@collection.appointments.customer ?= id && @collection.appointments.tailor ?= @request.auth.id)) || ' +
      '(@request.auth.userType = "client" && userType = "tailor" && ' +
      '(@collection.orders.tailor ?= id && @collection.orders.customer ?= @request.auth.id || ' +
      '@collection.appointments.tailor ?= id && @collection.appointments.customer ?= @request.auth.id))'
    users.listRule = partyRule
    users.viewRule = partyRule
    users.createRule =
      '(@request.body.userType = "client" || @request.body.userType = "tailor") && ' +
      '@request.body.status = "pending_verification"'
    users.updateRule =
      "id = @request.auth.id && @request.body.userType:changed = false && " +
      "@request.body.status:changed = false && @request.body.verified:changed = false"
    users.deleteRule = "id = @request.auth.id"
    app.save(users)

    marketplaceOrders.createRule =
      'buyer = @request.auth.id && status = "pending_payment"'
    marketplaceOrders.updateRule =
      '(buyer = @request.auth.id && @request.body.status = "cancelled" && ' +
      '@request.body.status:changed = true && @request.body.buyer:changed = false && ' +
      '@request.body.seller:changed = false && @request.body.orderNumber:changed = false && ' +
      '@request.body.items:changed = false && @request.body.subtotal:changed = false && ' +
      '@request.body.currency:changed = false && @request.body.contactName:changed = false && ' +
      '@request.body.contactPhone:changed = false && @request.body.shippingAddress:changed = false && ' +
      '@request.body.paymentMethod:changed = false && @request.body.paymentReference:changed = false && ' +
      '@request.body.notes:changed = false) || ' +
      '(seller = @request.auth.id && @request.body.buyer:changed = false && ' +
      '@request.body.seller:changed = false && @request.body.orderNumber:changed = false && ' +
      '@request.body.items:changed = false && @request.body.subtotal:changed = false && ' +
      '@request.body.currency:changed = false && @request.body.contactName:changed = false && ' +
      '@request.body.contactPhone:changed = false && @request.body.shippingAddress:changed = false && ' +
      '@request.body.paymentMethod:changed = false && @request.body.paymentReference:changed = false && ' +
      '@request.body.notes:changed = false)'
    app.save(marketplaceOrders)

    products.fields.add(
      new Field({ name: "slug", type: "text", max: 160, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
      new Field({ name: "compareAtPrice", type: "number", min: 0 }),
      new Field({ name: "variants", type: "json", maxSize: 20000 }),
      new Field({ name: "options", type: "json", maxSize: 10000 }),
      new Field({ name: "isFeatured", type: "bool" }),
      new Field({ name: "rating", type: "number", min: 0, max: 5 }),
      new Field({ name: "reviewCount", type: "number", min: 0, onlyInt: true }),
    )
    products.indexes = [
      ...products.indexes,
      // Existing installations can contain several products without a slug;
      // the seed/update path fills them without making this migration unsafe.
      "CREATE INDEX idx_products_slug ON products (slug)",
      "CREATE INDEX idx_products_featured ON products (isFeatured)",
    ]
    app.save(products)
    app.db()
      .newQuery(
        "CREATE UNIQUE INDEX idx_products_slug_unique ON products (slug) WHERE slug != ''",
      )
      .execute()

    catalogStyles.fields.add(
      new Field({ name: "slug", type: "text", max: 160, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
      new Field({ name: "fabricRequirements", type: "json", maxSize: 5000 }),
      new Field({ name: "customizationOptions", type: "json", maxSize: 20000 }),
      new Field({
        name: "estimatedProductionDays",
        type: "number",
        min: 0,
        onlyInt: true,
      }),
    )
    catalogStyles.indexes = [
      ...catalogStyles.indexes,
      "CREATE INDEX idx_catalog_styles_slug ON catalog_styles (slug)",
    ]
    app.save(catalogStyles)
    app.db()
      .newQuery(
        "CREATE UNIQUE INDEX idx_catalog_styles_slug_unique ON catalog_styles (slug) WHERE slug != ''",
      )
      .execute()

    // Prevent two active appointments from claiming the exact same start time.
    // Cancelled/completed history does not block a new booking.
    app.db()
      .newQuery(
        "CREATE UNIQUE INDEX idx_appointments_active_slot ON appointments (tailor, scheduledAt) " +
          "WHERE status IN ('requested', 'confirmed')",
      )
      .execute()

    const tailorProfiles = new Collection({
      type: "base",
      name: "tailor_profiles",
      listRule: "isActive = true || tailor = @request.auth.id",
      viewRule: "isActive = true || tailor = @request.auth.id",
      createRule:
        '@request.auth.userType = "tailor" && tailor = @request.auth.id && ' +
        "rating = 0 && reviewCount = 0 && completedOrders = 0 && " +
        "isVerified = false && isFeatured = false",
      updateRule:
        "tailor = @request.auth.id && @request.body.tailor:changed = false && " +
        "@request.body.rating:changed = false && @request.body.reviewCount:changed = false && " +
        "@request.body.completedOrders:changed = false && " +
        "@request.body.isVerified:changed = false && @request.body.isFeatured:changed = false",
      deleteRule: "tailor = @request.auth.id",
      fields: [
        {
          name: "tailor",
          type: "relation",
          required: true,
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: "slug",
          type: "text",
          required: true,
          max: 160,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        },
        { name: "displayName", type: "text", required: true, max: 150 },
        { name: "businessName", type: "text", max: 150 },
        { name: "headline", type: "text", max: 200 },
        { name: "bio", type: "text", max: 3000 },
        { name: "location", type: "text", max: 200 },
        { name: "specialties", type: "json", maxSize: 5000 },
        { name: "yearsExperience", type: "number", min: 0, onlyInt: true },
        {
          name: "avatar",
          type: "file",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        {
          name: "coverImage",
          type: "file",
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        { name: "rating", type: "number", min: 0, max: 5 },
        { name: "reviewCount", type: "number", min: 0, onlyInt: true },
        { name: "completedOrders", type: "number", min: 0, onlyInt: true },
        { name: "isVerified", type: "bool" },
        { name: "isFeatured", type: "bool" },
        { name: "isActive", type: "bool" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_tailor_profiles_tailor ON tailor_profiles (tailor)",
        "CREATE UNIQUE INDEX idx_tailor_profiles_slug ON tailor_profiles (slug)",
        "CREATE INDEX idx_tailor_profiles_featured ON tailor_profiles (isFeatured)",
        "CREATE INDEX idx_tailor_profiles_active ON tailor_profiles (isActive)",
      ],
    })
    app.save(tailorProfiles)

    // Keep existing installations usable before the richer storefront seed is
    // run. The public record contains no email, phone, auth, or status fields.
    const usedProfileSlugs = new Set()
    const existingTailors = app.findRecordsByFilter(
      "users",
      'userType = "tailor"',
      "created",
      10000,
      0,
    )
    for (const tailor of existingTailors) {
      const displayName = `${tailor.getString("firstName")} ${tailor.getString("lastName")}`.trim()
      const businessName = tailor.getString("businessName") || displayName
      const baseSlug =
        businessName
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || `tailor-${tailor.id.slice(0, 6)}`
      const slug = usedProfileSlugs.has(baseSlug)
        ? `${baseSlug}-${tailor.id.slice(0, 6)}`
        : baseSlug
      usedProfileSlugs.add(slug)

      const profile = new Record(tailorProfiles)
      profile.set("tailor", tailor.id)
      profile.set("slug", slug)
      profile.set("displayName", displayName || businessName)
      profile.set("businessName", businessName)
      profile.set("bio", tailor.getString("bio"))
      profile.set("location", tailor.getString("location"))
      profile.set("isVerified", tailor.getBool("verified"))
      profile.set("isActive", tailor.getString("status") === "active")
      app.save(profile)
    }

    const storefrontCollections = new Collection({
      type: "base",
      name: "storefront_collections",
      listRule: "isActive = true",
      viewRule: "isActive = true",
      fields: [
        {
          name: "slug",
          type: "text",
          required: true,
          max: 160,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        },
        { name: "name", type: "text", required: true, max: 150 },
        { name: "description", type: "text", max: 1500 },
        { name: "eyebrow", type: "text", max: 100 },
        {
          name: "audience",
          type: "select",
          maxSelect: 1,
          values: ["all", "male", "female", "unisex", "kids"],
        },
        {
          name: "coverImage",
          type: "file",
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        {
          name: "products",
          type: "relation",
          collectionId: products.id,
          maxSelect: 50,
          cascadeDelete: false,
        },
        { name: "sortOrder", type: "number", min: 0, onlyInt: true },
        { name: "isFeatured", type: "bool" },
        { name: "isActive", type: "bool" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_storefront_collections_slug ON storefront_collections (slug)",
        "CREATE INDEX idx_storefront_collections_sort ON storefront_collections (sortOrder)",
        "CREATE INDEX idx_storefront_collections_active ON storefront_collections (isActive)",
      ],
    })
    app.save(storefrontCollections)

    const journalPosts = new Collection({
      type: "base",
      name: "journal_posts",
      listRule: "isPublished = true && publishedAt <= @now",
      viewRule: "isPublished = true && publishedAt <= @now",
      fields: [
        {
          name: "slug",
          type: "text",
          required: true,
          max: 160,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "excerpt", type: "text", max: 600 },
        { name: "body", type: "editor", maxSize: 100000 },
        {
          name: "coverImage",
          type: "file",
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        {
          name: "category",
          type: "select",
          maxSelect: 1,
          values: ["style_guide", "behind_the_seams", "news", "weddings", "craftsmanship"],
        },
        {
          name: "author",
          type: "relation",
          collectionId: tailorProfiles.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: "publishedAt", type: "date" },
        { name: "readingMinutes", type: "number", min: 0, onlyInt: true },
        { name: "isFeatured", type: "bool" },
        { name: "isPublished", type: "bool" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_journal_posts_slug ON journal_posts (slug)",
        "CREATE INDEX idx_journal_posts_published ON journal_posts (isPublished, publishedAt)",
        "CREATE INDEX idx_journal_posts_category ON journal_posts (category)",
      ],
    })
    app.save(journalPosts)

    const storefrontPages = new Collection({
      type: "base",
      name: "storefront_pages",
      listRule: "isPublished = true",
      viewRule: "isPublished = true",
      fields: [
        {
          name: "slug",
          type: "text",
          required: true,
          max: 160,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "eyebrow", type: "text", max: 100 },
        { name: "summary", type: "text", max: 1000 },
        {
          name: "heroImage",
          type: "file",
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        { name: "content", type: "json", maxSize: 100000 },
        { name: "seoTitle", type: "text", max: 200 },
        { name: "seoDescription", type: "text", max: 500 },
        { name: "isPublished", type: "bool" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_storefront_pages_slug ON storefront_pages (slug)",
        "CREATE INDEX idx_storefront_pages_published ON storefront_pages (isPublished)",
      ],
    })
    app.save(storefrontPages)

    const wishlistItems = new Collection({
      type: "base",
      name: "wishlist_items",
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      createRule: "user = @request.auth.id && product.isActive = true",
      updateRule:
        "user = @request.auth.id && @request.body.user:changed = false && " +
        "@request.body.product:changed = false",
      deleteRule: "user = @request.auth.id",
      fields: [
        {
          name: "user",
          type: "relation",
          required: true,
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: "product",
          type: "relation",
          required: true,
          collectionId: products.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: "variantId", type: "text", max: 100 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_wishlist_unique_item ON wishlist_items (user, product, variantId)",
        "CREATE INDEX idx_wishlist_user ON wishlist_items (user)",
      ],
    })
    app.save(wishlistItems)

    const tailorAvailability = new Collection({
      type: "base",
      name: "tailor_availability",
      listRule: "isActive = true || tailor = @request.auth.id",
      viewRule: "isActive = true || tailor = @request.auth.id",
      createRule: '@request.auth.userType = "tailor" && tailor = @request.auth.id',
      updateRule: "tailor = @request.auth.id && @request.body.tailor:changed = false",
      deleteRule: "tailor = @request.auth.id",
      fields: [
        {
          name: "tailor",
          type: "relation",
          required: true,
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: "weekday", type: "number", required: true, min: 0, max: 6, onlyInt: true },
        {
          name: "startTime",
          type: "text",
          required: true,
          max: 5,
          pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
        },
        {
          name: "endTime",
          type: "text",
          required: true,
          max: 5,
          pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
        },
        { name: "slotDurationMinutes", type: "number", min: 15, onlyInt: true },
        { name: "location", type: "text", max: 300 },
        { name: "appointmentTypes", type: "json", maxSize: 2000 },
        { name: "timezone", type: "text", max: 100 },
        { name: "isActive", type: "bool" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_tailor_availability_window ON tailor_availability (tailor, weekday, startTime, endTime)",
        "CREATE INDEX idx_tailor_availability_active ON tailor_availability (tailor, isActive)",
      ],
    })
    app.save(tailorAvailability)
  },
  (app) => {
    app.db().newQuery("DROP INDEX IF EXISTS idx_catalog_styles_slug_unique").execute()
    app.db().newQuery("DROP INDEX IF EXISTS idx_products_slug_unique").execute()

    for (const name of [
      "tailor_availability",
      "wishlist_items",
      "storefront_pages",
      "journal_posts",
      "storefront_collections",
      "tailor_profiles",
    ]) {
      app.delete(app.findCollectionByNameOrId(name))
    }

    app.db().newQuery("DROP INDEX IF EXISTS idx_appointments_active_slot").execute()

    const catalogStyles = app.findCollectionByNameOrId("catalog_styles")
    catalogStyles.indexes = catalogStyles.indexes.filter(
      (index) => !index.includes("idx_catalog_styles_slug"),
    )
    for (const name of [
      "slug",
      "fabricRequirements",
      "customizationOptions",
      "estimatedProductionDays",
    ]) {
      catalogStyles.fields.removeByName(name)
    }
    app.save(catalogStyles)

    const products = app.findCollectionByNameOrId("products")
    products.indexes = products.indexes.filter(
      (index) => !index.includes("idx_products_slug") && !index.includes("idx_products_featured"),
    )
    for (const name of [
      "slug",
      "compareAtPrice",
      "variants",
      "options",
      "isFeatured",
      "rating",
      "reviewCount",
    ]) {
      products.fields.removeByName(name)
    }
    app.save(products)

    const users = app.findCollectionByNameOrId("users")
    users.listRule = 'id = @request.auth.id || userType = "tailor" || @request.auth.userType = "admin"'
    users.viewRule = 'id = @request.auth.id || userType = "tailor" || @request.auth.userType = "admin"'
    users.createRule = ""
    users.updateRule = "id = @request.auth.id"
    users.deleteRule = "id = @request.auth.id"
    app.save(users)

    const marketplaceOrders = app.findCollectionByNameOrId("marketplace_orders")
    marketplaceOrders.createRule = "buyer = @request.auth.id"
    marketplaceOrders.updateRule = "buyer = @request.auth.id || seller = @request.auth.id"
    app.save(marketplaceOrders)
  },
)
