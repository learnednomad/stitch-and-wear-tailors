#!/usr/bin/env node
/**
 * Seed a PocketBase instance with Stitch & Wear demo data:
 * demo accounts, Nigerian garment catalog, fabrics, orders across all
 * statuses, invoices, payments, appointments, messages and measurements.
 *
 * Usage:
 *   PB_URL=http://127.0.0.1:8090 \
 *   PB_ADMIN_EMAIL=admin@stitchandwear.local \
 *   PB_ADMIN_PASSWORD='Admin12345!' \
 *   node scripts/seed-pocketbase.js
 *
 * Idempotent-ish: skips users/styles/fabrics that already exist by
 * email/name; orders and downstream records are only created when the
 * demo client has no orders yet.
 *
 * Optional storefront photography is loaded from web/public/storefront/seed.
 * Missing files are skipped so the content seed remains useful in CI.
 */

const fs = require("node:fs")
const path = require("node:path")

const PB_URL = process.env.PB_URL || "http://127.0.0.1:8090"
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@stitchandwear.local"
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || "Admin12345!"

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "Demo12345!"
const STOREFRONT_ASSET_DIR =
  process.env.STOREFRONT_ASSET_DIR || path.resolve(__dirname, "../web/public/storefront/seed")

let adminToken = ""

async function api(method, path, body) {
  const res = await fetch(`${PB_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(adminToken ? { Authorization: adminToken } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`)
  }
  return json
}

async function apiForm(method, requestPath, fields, files = {}) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue
    form.append(key, typeof value === "string" ? value : JSON.stringify(value))
  }
  for (const [field, filenames] of Object.entries(files)) {
    for (const filename of Array.isArray(filenames) ? filenames : [filenames]) {
      const fullPath = path.join(STOREFRONT_ASSET_DIR, filename)
      if (!fs.existsSync(fullPath)) continue
      const extension = path.extname(filename).toLowerCase()
      const type = extension === ".png" ? "image/png" : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/webp"
      form.append(field, new Blob([fs.readFileSync(fullPath)], { type }), path.basename(filename))
    }
  }
  const res = await fetch(`${PB_URL}${requestPath}`, {
    method,
    headers: adminToken ? { Authorization: adminToken } : {},
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`${method} ${requestPath} -> ${res.status}: ${JSON.stringify(json)}`)
  }
  return json
}

async function first(collection, filter) {
  const q = await api(
    "GET",
    `/api/collections/${collection}/records?perPage=1&filter=${encodeURIComponent(filter)}`,
  )
  return q.items[0] || null
}

async function ensureUser(data) {
  const existing = await first("users", `email = '${data.email}'`)
  if (existing) return existing
  const user = await api("POST", "/api/collections/users/records", {
    ...data,
    password: DEMO_PASSWORD,
    passwordConfirm: DEMO_PASSWORD,
  })
  // demo accounts are pre-verified
  return api("PATCH", `/api/collections/users/records/${user.id}`, { verified: true })
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

async function upsertBySlug(collection, slug, fields, files) {
  const existing = await first(collection, `slug = '${slug}'`)
  const requestPath = existing
    ? `/api/collections/${collection}/records/${existing.id}`
    : `/api/collections/${collection}/records`
  return apiForm(existing ? "PATCH" : "POST", requestPath, { ...fields, slug }, files)
}

const CATALOG_STYLES = [
  ["Classic Agbada", "agbada", "male", 85000, "Three-piece flowing agbada with embroidered neckline"],
  ["Royal Agbada", "agbada", "male", 120000, "Premium agbada with hand-stitched gold embroidery"],
  ["Senator Suit", "senator", "male", 45000, "Slim-fit senator wear with mandarin collar"],
  ["Senator Deluxe", "senator", "male", 60000, "Senator suit with chest embroidery and covered buttons"],
  ["Kaftan Classic", "kaftan", "male", 38000, "Loose-fit kaftan with side pockets"],
  ["Embroidered Kaftan", "kaftan", "male", 55000, "Kaftan with tonal embroidery panel"],
  ["Dashiki Shirt", "dashiki", "unisex", 25000, "Vibrant dashiki with traditional Angelina print"],
  ["Buba & Sokoto", "buba_sokoto", "male", 42000, "Classic buba and sokoto two-piece"],
  ["Iro & Buba", "iro_buba", "female", 48000, "Traditional iro and buba with gele option"],
  ["Ankara Flare Gown", "ankara_gown", "female", 52000, "Floor-length ankara gown with flared skirt"],
  ["Ankara Pencil Dress", "ankara_gown", "female", 46000, "Fitted ankara pencil dress, knee length"],
  ["Ankara Two-Piece", "ankara_gown", "female", 50000, "Crop top and maxi skirt ankara set"],
  ["Business Suit", "suit", "male", 95000, "Two-piece tailored suit in wool blend"],
  ["Corporate Shirt", "shirt", "male", 18000, "Fitted dress shirt with French cuffs"],
  ["Tailored Trousers", "trouser", "unisex", 22000, "Straight-cut tailored trousers"],
]

// [name, category, price, stock, description]
const PRODUCTS = [
  ["Ready-made Agbada (Navy)", "menswear", 78000, 6, "Pre-tailored three-piece agbada, navy with silver embroidery. Ships in 2–3 days."],
  ["Senator Wear (Black)", "menswear", 42000, 12, "Classic slim-fit senator, ready to wear. Mandarin collar, covered buttons."],
  ["Embroidered Kaftan (White)", "menswear", 36000, 9, "Off-the-rack white kaftan with tonal embroidery panel."],
  ["Ankara Flare Gown", "womenswear", 49000, 5, "Floor-length ankara gown, flared skirt. Vibrant Angelina print."],
  ["Ankara Two-Piece Set", "womenswear", 45000, 7, "Crop top and maxi skirt ankara set, ready to wear."],
  ["Iro & Buba Set (Aso-Oke)", "womenswear", 62000, 4, "Traditional iro and buba in premium aso-oke, with matching gele."],
  ["Kids Dashiki (Ages 4–8)", "childrenswear", 14000, 15, "Colourful dashiki for children, soft cotton, machine washable."],
  ["Beaded Gele Headwrap", "accessories", 9500, 20, "Pre-tied beaded gele, adjustable. Gold and burgundy."],
  ["Leather Babouche Slippers", "footwear", 18000, 10, "Handmade leather slippers, tan. Sizes 40–46."],
  ["Ankara Fabric (6 yards)", "fabric", 12000, 25, "Premium wax ankara, 6-yard bundle. Assorted prints."],
  ["Aso-Oke Bundle (Gold)", "fabric", 34000, 8, "Handwoven aso-oke, gold. Enough for a full iro & buba."],
  ["Kente Stole", "accessories", 15000, 14, "Authentic kente stole, graduation-ready."],
]

const STOREFRONT_TAILORS = [
  {
    email: "amina@stitchandwear.ng",
    firstName: "Amina",
    lastName: "Yusuf",
    businessName: "Amina Yusuf Atelier",
    headline: "Contemporary occasionwear, shaped by Northern craft",
    location: "Abuja, Nigeria",
    specialties: ["Kaftan", "Bridal", "Embroidery"],
    yearsExperience: 14,
  },
  {
    email: "dapo@stitchandwear.ng",
    firstName: "Dapo",
    lastName: "Adeyemi",
    businessName: "Dapo Adeyemi",
    headline: "Modern suiting with an unmistakably Nigerian point of view",
    location: "Lagos, Nigeria",
    specialties: ["Suits", "Senator", "Menswear"],
    yearsExperience: 18,
  },
  {
    email: "mai@stitchandwear.ng",
    firstName: "Mai",
    lastName: "Couture",
    businessName: "Mai Couture",
    headline: "Sculptural womenswear for life’s landmark moments",
    location: "Lagos, Nigeria",
    specialties: ["Bridal", "Ankara", "Eveningwear"],
    yearsExperience: 12,
  },
  {
    email: "nkiru@stitchandwear.ng",
    firstName: "Nkiru",
    lastName: "Okoye",
    businessName: "The Native Atelier",
    headline: "Heritage textiles finished with a quiet, modern hand",
    location: "Enugu, Nigeria",
    specialties: ["Iro & Buba", "Aso Oke", "Adire"],
    yearsExperience: 16,
  },
  {
    email: "hassan@stitchandwear.ng",
    firstName: "Hassan",
    lastName: "Bello",
    businessName: "House of Reign",
    headline: "Ceremonial agbada and hand-finished embroidery",
    location: "Kano, Nigeria",
    specialties: ["Agbada", "Kaftan", "Embroidery"],
    yearsExperience: 22,
  },
]

const JOURNAL_POSTS = [
  {
    slug: "story-behind-agbada",
    title: "The Story Behind Agbada",
    excerpt: "A garment of presence, lineage and meticulous proportion.",
    category: "craftsmanship",
    readingMinutes: 6,
    body: "<p>Agbada is more than a silhouette. Its volume, embroidery and movement communicate occasion and identity. We trace how master cutters balance heritage with a distinctly modern ease.</p><h2>The language of the neckline</h2><p>Every motif starts as a conversation between wearer and maker, then becomes a map for the embroiderer’s hand.</p>",
  },
  {
    slug: "choosing-the-perfect-fabric",
    title: "How to Choose the Perfect Fabric",
    excerpt: "A practical guide to drape, climate, colour and occasion.",
    category: "style_guide",
    readingMinutes: 5,
    body: "<p>The right cloth supports the shape of the garment and the rhythm of the day. Begin with climate and movement, then consider finish, weight and how the colour behaves in natural light.</p>",
  },
  {
    slug: "wedding-style-inspiration",
    title: "Wedding Style Inspiration",
    excerpt: "Thoughtful looks for the couple, family and wedding party.",
    category: "weddings",
    readingMinutes: 4,
    body: "<p>Start with a shared colour story, then let every look carry its own texture and proportion. Cohesion need not mean uniformity.</p>",
  },
  {
    slug: "bespoke-versus-ready-to-wear",
    title: "Bespoke vs Ready-to-Wear",
    excerpt: "When to commission a piece and when an atelier finish is enough.",
    category: "behind_the_seams",
    readingMinutes: 7,
    body: "<p>Ready-to-wear offers immediacy. Bespoke offers a garment drawn around your measurements, preferences and purpose. Both belong in a considered wardrobe.</p>",
  },
]

const FABRICS = [
  ["Premium Ankara Wax", "ankara", "Multicolor", "Geometric", 4500, 120],
  ["Hollandais Ankara", "ankara", "Blue/Gold", "Floral", 6500, 80],
  ["Aso Oke Sanyan", "aso_oke", "Beige", "Stripe", 12000, 40],
  ["Aso Oke Etu", "aso_oke", "Indigo", "Stripe", 11000, 35],
  ["Adire Eleko", "adire", "Indigo/White", "Batik", 5500, 60],
  ["Adire Oniko", "adire", "Blue", "Tie-dye", 5000, 55],
  ["French Lace", "lace", "Champagne", "Floral", 15000, 45],
  ["Cord Lace", "lace", "Wine", "Cord", 13500, 50],
  ["George Wrapper", "george", "Green/Gold", "Embellished", 18000, 30],
  ["Intorica George", "george", "Red", "Classic", 14000, 25],
  ["Senator Material Premium", "senator_material", "Navy", "Plain", 8000, 100],
  ["Senator Material Classic", "senator_material", "Charcoal", "Plain", 6500, 110],
  ["Kente Cloth", "kente", "Multicolor", "Woven", 16000, 20],
  ["Egyptian Cotton", "cotton", "White", "Plain", 7000, 150],
  ["Plain Cotton", "cotton", "Sky Blue", "Plain", 4000, 200],
  ["Raw Silk", "silk", "Ivory", "Plain", 20000, 25],
  ["Cashmere Wool", "wool", "Grey", "Plain", 22000, 30],
  ["Irish Linen", "linen", "Sand", "Plain", 9500, 70],
  ["Suiting Polyester", "polyester", "Black", "Plain", 5500, 130],
  ["TR Blend", "mixed", "Brown", "Check", 6000, 90],
]

async function seedStorefront({ tailor, additionalTailors, productIds }) {
  const profileInputs = [
    {
      user: tailor,
      businessName: "Adeyemi Bespoke",
      headline: "Master tailoring for modern Nigerian ceremony",
      specialties: ["Agbada", "Senator", "Suits", "Wedding"],
      yearsExperience: 20,
    },
    ...additionalTailors.map((user, index) => ({
      user,
      businessName: STOREFRONT_TAILORS[index].businessName,
      headline: STOREFRONT_TAILORS[index].headline,
      specialties: STOREFRONT_TAILORS[index].specialties,
      yearsExperience: STOREFRONT_TAILORS[index].yearsExperience,
    })),
  ]

  const profileIds = []
  for (const [index, input] of profileInputs.entries()) {
    const displayName = `${input.user.firstName} ${input.user.lastName}`
    const slug = slugify(input.businessName)
    const profile = await upsertBySlug(
      "tailor_profiles",
      slug,
      {
        tailor: input.user.id,
        displayName,
        businessName: input.businessName,
        headline: input.headline,
        bio: input.user.bio || input.headline,
        location: input.user.location,
        specialties: input.specialties,
        yearsExperience: input.yearsExperience,
        rating: Number((4.7 + (index % 3) * 0.1).toFixed(1)),
        reviewCount: 18 + index * 7,
        completedOrders: 80 + index * 43,
        isVerified: true,
        isFeatured: index < 4,
        isActive: true,
      },
      {
        avatar: [`tailor-${String(index + 1).padStart(2, "0")}.webp`],
        coverImage: [`tailor-${String(index + 1).padStart(2, "0")}-cover.webp`],
      },
    )
    profileIds.push(profile.id)

    for (const weekday of [1, 2, 3, 4, 5, 6]) {
      const existing = await first(
        "tailor_availability",
        `tailor = '${input.user.id}' && weekday = ${weekday}`,
      )
      const availability = {
        tailor: input.user.id,
        weekday,
        startTime: weekday === 6 ? "10:00" : "09:00",
        endTime: weekday === 6 ? "15:00" : "17:00",
        slotDurationMinutes: 60,
        location: input.user.location,
        appointmentTypes: ["consultation", "measurement", "fitting"],
        timezone: "Africa/Lagos",
        isActive: true,
      }
      if (existing) {
        await api(
          "PATCH",
          `/api/collections/tailor_availability/records/${existing.id}`,
          availability,
        )
      } else {
        await api("POST", "/api/collections/tailor_availability/records", availability)
      }
    }
  }

  const collectionInputs = [
    {
      slug: "agbada-heritage",
      name: "Agbada Heritage",
      eyebrow: "Men · Ceremony",
      description: "Commanding silhouettes, deliberate volume and hand-finished embroidery.",
      audience: "male",
      products: productIds.slice(0, 3),
    },
    {
      slug: "modern-womenswear",
      name: "Modern Womenswear",
      eyebrow: "Women · Occasion",
      description: "Ankara, aso-oke and lace cut for movement and memorable entrances.",
      audience: "female",
      products: productIds.slice(3, 6),
    },
    {
      slug: "finishing-touches",
      name: "Finishing Touches",
      eyebrow: "Accessories",
      description: "Small-batch accessories and footwear made to complete the story.",
      audience: "all",
      products: [productIds[7], productIds[8], productIds[11]],
    },
    {
      slug: "textiles-of-west-africa",
      name: "Textiles of West Africa",
      eyebrow: "Cloth · Craft",
      description: "Colour-rich wax, handwoven aso-oke and ceremonial cloth.",
      audience: "unisex",
      products: [productIds[9], productIds[10]],
    },
  ]
  for (const [index, collection] of collectionInputs.entries()) {
    await upsertBySlug(
      "storefront_collections",
      collection.slug,
      {
        ...collection,
        sortOrder: index + 1,
        isFeatured: index < 3,
        isActive: true,
      },
      { coverImage: [`collection-${collection.slug}.webp`] },
    )
  }

  for (const [index, post] of JOURNAL_POSTS.entries()) {
    await upsertBySlug(
      "journal_posts",
      post.slug,
      {
        ...post,
        author: profileIds[index % profileIds.length],
        publishedAt: new Date(Date.now() - index * 7 * 86400000).toISOString(),
        isFeatured: index === 0,
        isPublished: true,
      },
      { coverImage: [`journal-${post.slug}.webp`] },
    )
  }

  await upsertBySlug(
    "storefront_pages",
    "home",
    {
      title: "Bespoke, crafted for your legacy",
      eyebrow: "Made in Nigeria · Worn everywhere",
      summary: "Commission exceptional tailoring or discover ready-to-wear pieces from verified Nigerian ateliers.",
      content: {
        craftTitle: "The art of African tailoring",
        craftBody: "Measured with care, cut with confidence and finished by makers who understand the weight of every occasion.",
        statistics: [
          { value: "10+", label: "Years in craft" },
          { value: "5K+", label: "Happy clients" },
          { value: "50+", label: "Expert tailors" },
        ],
      },
      seoTitle: "Stitch & Wear — Bespoke Nigerian Tailoring",
      seoDescription: "Bespoke tailoring and ready-to-wear fashion from verified Nigerian designers.",
      isPublished: true,
    },
    { heroImage: ["hero-home.webp"] },
  )
  await upsertBySlug(
    "storefront_pages",
    "about",
    {
      title: "About Stitch & Wear",
      eyebrow: "Our story",
      summary: "A marketplace built to carry Nigerian tailoring heritage forward.",
      content: {
        body: "We connect discerning clients with independent makers, protecting the intimacy of bespoke service while making every step easier to follow.",
        values: ["Heritage", "Quality", "Craftsmanship", "Sustainability"],
      },
      seoTitle: "About Stitch & Wear",
      seoDescription: "Meet the makers and principles behind Stitch & Wear.",
      isPublished: true,
    },
    { heroImage: ["hero-about.webp"] },
  )

  console.log(
    `Storefront: ${profileIds.length} tailor profiles, ${collectionInputs.length} collections, ${JOURNAL_POSTS.length} journal posts`,
  )
}

async function main() {
  const auth = await api("POST", "/api/collections/_superusers/auth-with-password", {
    identity: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  adminToken = auth.token
  console.log(`Authenticated as superuser against ${PB_URL}`)

  // --- demo users ---
  const tailor = await ensureUser({
    email: "demo.tailor@stitchandwear.ng",
    firstName: "Tunde",
    lastName: "Adeyemi",
    userType: "tailor",
    status: "active",
    phone: "+2348012345678",
    businessName: "Adeyemi Bespoke",
    bio: "Master tailor specializing in traditional Nigerian attire and modern suits.",
    location: "Lagos, Nigeria",
  })
  const client = await ensureUser({
    email: "demo.client@stitchandwear.ng",
    firstName: "Ada",
    lastName: "Okafor",
    userType: "client",
    status: "active",
    phone: "+2348098765432",
    location: "Lagos, Nigeria",
  })
  const additionalTailors = []
  for (const profile of STOREFRONT_TAILORS) {
    additionalTailors.push(
      await ensureUser({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        userType: "tailor",
        status: "active",
        phone: "+2348000000000",
        businessName: profile.businessName,
        bio: profile.headline,
        location: profile.location,
      }),
    )
  }
  console.log(`Users: tailor=${tailor.id} client=${client.id}`)

  // --- catalog styles ---
  let styleIds = []
  for (const [name, category, gender, basePrice, description] of CATALOG_STYLES) {
    let rec = await first("catalog_styles", `name = '${name}'`)
    if (!rec) {
      rec = await api("POST", "/api/collections/catalog_styles/records", {
        name,
        category,
        gender,
        basePrice,
        currency: "NGN",
        description,
        isActive: true,
        tags: [category, gender],
      })
    }
    rec = await api("PATCH", `/api/collections/catalog_styles/records/${rec.id}`, {
      slug: slugify(name),
      fabricRequirements: { unit: "metres", amount: category === "agbada" ? 8 : 4 },
      customizationOptions: [
        {
          id: "fit",
          label: "Fit",
          type: "single",
          required: true,
          values: [
            { id: "classic", label: "Classic" },
            { id: "relaxed", label: "Relaxed" },
            { id: "tailored", label: "Tailored", priceDelta: 5000 },
          ],
        },
        {
          id: "embroidery",
          label: "Embroidery",
          type: "single",
          values: [
            { id: "none", label: "None" },
            { id: "tonal", label: "Tonal", priceDelta: 10000 },
            { id: "heritage", label: "Heritage", priceDelta: 18000 },
          ],
        },
      ],
      estimatedProductionDays: category === "agbada" ? 21 : 14,
    })
    styleIds.push(rec.id)
  }
  console.log(`Catalog styles: ${styleIds.length}`)

  // --- fabrics ---
  let fabricIds = []
  for (const [name, type, color, pattern, pricePerMeter, availableQuantity] of FABRICS) {
    let rec = await first("fabrics", `name = '${name}'`)
    if (!rec) {
      rec = await api("POST", "/api/collections/fabrics/records", {
        name,
        type,
        color,
        pattern,
        pricePerMeter,
        availableQuantity,
        owner: tailor.id,
        isActive: true,
        description: `${color} ${type} fabric, ${pattern.toLowerCase()} pattern`,
      })
    }
    fabricIds.push(rec.id)
  }
  console.log(`Fabrics: ${fabricIds.length}`)

  // --- marketplace products (sold by the demo tailor) ---
  let productIds = []
  for (const [productIndex, product] of PRODUCTS.entries()) {
    const [name, category, price, stock, description] = product
    let rec = await first("products", `name = '${name.replace(/'/g, "''")}'`)
    if (!rec) {
      rec = await api("POST", "/api/collections/products/records", {
        seller: tailor.id,
        name,
        category,
        price,
        stock,
        currency: "NGN",
        description,
        isActive: true,
        tags: [category],
      })
    }
    const sizeValues = category === "accessories" || category === "fabric" ? ["One size"] : ["S", "M", "L", "XL"]
    const variants = sizeValues.map((size, index) => ({
      id: `${slugify(name)}-${slugify(size)}`,
      label: size,
      size,
      sku: `SW-${String(productIndex + 1).padStart(3, "0")}-${index + 1}`,
      stock: Math.max(1, Math.floor(stock / sizeValues.length)),
      price,
    }))
    rec = await apiForm(
      "PATCH",
      `/api/collections/products/records/${rec.id}`,
      {
        slug: slugify(name),
        compareAtPrice: productIndex % 4 === 1 ? Math.round(price * 1.15) : 0,
        variants,
        options: [{ name: "Size", values: sizeValues }],
        isFeatured: productIndex < 6,
        rating: Number((4.6 + (productIndex % 4) * 0.1).toFixed(1)),
        reviewCount: 12 + productIndex * 3,
      },
      { images: [`product-${String(productIndex + 1).padStart(2, "0")}.webp`] },
    )
    productIds.push(rec.id)
  }
  console.log(`Products: ${productIds.length}`)

  await seedStorefront({ tailor, additionalTailors, productIds })

  // --- everything below only when the demo client has no orders yet ---
  const existingOrder = await first("orders", `customer = '${client.id}'`)
  if (existingOrder) {
    console.log("Demo orders already exist — skipping orders/invoices/payments/appointments.")
    return
  }

  // --- measurement profile ---
  const measurement = await api("POST", "/api/collections/measurements/records", {
    user: client.id,
    name: "My Standard Measurements",
    measurementType: "traditional",
    unit: "cm",
    chest: 98,
    waist: 84,
    hips: 100,
    shoulderWidth: 46,
    sleeveLength: 62,
    neck: 39,
    backLength: 74,
    inseam: 78,
    thigh: 58,
    isDefault: true,
    notes: "Prefers a slightly loose fit around the chest.",
  })

  // --- orders across the lifecycle ---
  const orderSpecs = [
    { status: "pending", type: "new_clothing", total: 85000, style: 0, note: "Agbada for a December wedding", assign: false },
    { status: "pending", type: "alteration", total: 12000, style: 13, note: "Take in shirt at the waist", assign: true },
    { status: "accepted", type: "new_clothing", total: 45000, style: 2, note: "Senator suit, navy senator material", assign: true },
    { status: "sewing", type: "new_clothing", total: 52000, style: 9, note: "Ankara gown, knee length version", assign: true },
    { status: "finishing", type: "new_clothing", total: 38000, style: 4, note: "Kaftan with side pockets", assign: true },
    { status: "ready", type: "new_clothing", total: 60000, style: 3, note: "Senator deluxe for conference", assign: true },
    { status: "delivered", type: "new_clothing", total: 120000, style: 1, note: "Royal agbada — chieftaincy ceremony", assign: true },
    { status: "cancelled", type: "repair", total: 8000, style: 14, note: "Replace trouser zip", assign: true },
  ]

  const orders = []
  for (const spec of orderSpecs) {
    const order = await api("POST", "/api/collections/orders/records", {
      customer: client.id,
      tailor: spec.assign ? tailor.id : "",
      status: "pending", // hooks stamp the initial stage; real status set below
      orderType: spec.type,
      measurement: measurement.id,
      style: styleIds[spec.style],
      totalAmount: spec.total,
      currency: "NGN",
      fabricSource: "tailor",
      paymentStatus: "pending",
      priority: "normal",
      specialInstructions: spec.note,
      estimatedDelivery: new Date(Date.now() + 14 * 86400000).toISOString(),
    })
    await api("POST", "/api/collections/order_items/records", {
      order: order.id,
      itemType: spec.type === "alteration" || spec.type === "repair" ? "other" : "traditional",
      quantity: 1,
      fabric: fabricIds[orders.length % fabricIds.length],
      designStyle: spec.note,
      itemPrice: spec.total,
      totalPrice: spec.total,
      status: "pending",
    })
    if (spec.status !== "pending") {
      await api("PATCH", `/api/collections/orders/records/${order.id}`, {
        status: spec.status,
        ...(spec.status === "cancelled" ? { cancellationReason: "Found a local repair shop" } : {}),
      })
    }
    orders.push(order)
  }
  console.log(`Orders: ${orders.length}`)

  // --- invoices: one part-paid (sewing order), one paid (delivered order) ---
  const sewingOrder = orders[3]
  const deliveredOrder = orders[6]

  await api("POST", "/api/collections/invoices/records", {
    order: sewingOrder.id,
    customer: client.id,
    tailor: tailor.id,
    invoiceNumber: "INV-2026-00001",
    lineItems: [{ description: "Ankara flare gown", quantity: 1, amount: 52000 }],
    subtotal: 52000,
    depositRequired: 26000,
    currency: "NGN",
    status: "sent",
    issuedAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  })
  await api("POST", "/api/collections/invoices/records", {
    order: deliveredOrder.id,
    customer: client.id,
    tailor: tailor.id,
    invoiceNumber: "INV-2026-00002",
    lineItems: [{ description: "Royal agbada (3-piece)", quantity: 1, amount: 120000 }],
    subtotal: 120000,
    depositRequired: 60000,
    currency: "NGN",
    status: "sent",
    issuedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    dueAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  })

  // --- payments: deposit on sewing order (part-paid), full on delivered ---
  await api("POST", "/api/collections/payments/records", {
    order: sewingOrder.id,
    user: client.id,
    amount: 26000,
    currency: "NGN",
    method: "bank_transfer",
    status: "confirmed",
    paymentType: "deposit",
    reference: "TRF/2026/07/48211",
    recordedBy: tailor.id,
  })
  await api("POST", "/api/collections/payments/records", {
    order: deliveredOrder.id,
    user: client.id,
    amount: 120000,
    currency: "NGN",
    method: "cash",
    status: "confirmed",
    paymentType: "full_payment",
    recordedBy: tailor.id,
  })
  console.log("Invoices + payments created")

  // --- appointments ---
  const appts = [
    { type: "measurement", days: 2, status: "requested", order: orders[0].id },
    { type: "fitting", days: 5, status: "confirmed", order: sewingOrder.id },
    { type: "pickup", days: 1, status: "confirmed", order: orders[5].id },
  ]
  for (const a of appts) {
    await api("POST", "/api/collections/appointments/records", {
      customer: client.id,
      tailor: tailor.id,
      order: a.order,
      type: a.type,
      scheduledAt: new Date(Date.now() + a.days * 86400000).toISOString(),
      durationMinutes: 45,
      status: a.status,
      location: "Adeyemi Bespoke, 12 Allen Avenue, Ikeja, Lagos",
    })
  }
  console.log(`Appointments: ${appts.length}`)

  // --- messages on the sewing order ---
  const chat = [
    [client.id, tailor.id, "Good afternoon! How is my gown coming along?"],
    [tailor.id, client.id, "Going well! The bodice is done, starting the skirt panels tomorrow."],
    [client.id, tailor.id, "Wonderful. Please remember the side pockets we discussed."],
    [tailor.id, client.id, "Noted — side seam pockets it is. Fitting on Friday still works?"],
  ]
  for (const [sender, recipient, content] of chat) {
    await api("POST", "/api/collections/messages/records", {
      order: sewingOrder.id,
      sender,
      recipient,
      messageType: "text",
      content,
      isRead: false,
    })
  }
  console.log(`Messages: ${chat.length}`)

  // --- a review on the delivered order ---
  await api("POST", "/api/collections/reviews/records", {
    order: deliveredOrder.id,
    customer: client.id,
    tailor: tailor.id,
    rating: 5,
    comment: "The agbada was magnificent — perfect fit and the embroidery drew compliments all day.",
  })

  console.log("Seed complete.")
  console.log(`Demo accounts (password: ${DEMO_PASSWORD}):`)
  console.log("  client: demo.client@stitchandwear.ng")
  console.log("  tailor: demo.tailor@stitchandwear.ng")
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
