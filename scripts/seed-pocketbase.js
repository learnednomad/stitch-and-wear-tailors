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
 */

const PB_URL = process.env.PB_URL || "http://127.0.0.1:8090"
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@stitchandwear.local"
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || "Admin12345!"

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "Demo12345!"

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
  for (const [name, category, price, stock, description] of PRODUCTS) {
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
    productIds.push(rec.id)
  }
  console.log(`Products: ${productIds.length}`)

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
