/**
 * Order mapper tests — PB→domain and domain→PB round trip.
 *
 * The PB→domain mapper must always produce a valid Nigerian-order domain
 * snapshot, even for sparse seeded records. The `domainOrderSnapshotSchema`
 * below is the validation oracle (formerly `NigerianOrderModel.create`, now MST
 * is gone): every enum in `mapPBOrderToDomain` must stay within these
 * vocabularies or a mapped server record would be invalid downstream.
 */

import { z } from "zod"

import {
  mapPBOrderToDomain,
  mapPBOrderItemToDomain,
  mapDomainOrderToPB,
  domainStatusToPB,
  PBOrderRecord,
  PBOrderItemRecord,
  PBOrderStageRecord,
} from "../order-api"

// --- Domain-snapshot oracle (mirrors the former NigerianOrder MST vocab) -----

const nigerianGarmentType = z.enum([
  "agbada",
  "kaftan",
  "isi_agu",
  "babban_riga",
  "ankara_dress",
  "senator",
  "traditional",
  "modern",
  "custom",
])
const fabricType = z.enum([
  "aso_oke",
  "adire",
  "ankara",
  "lace",
  "cotton",
  "silk",
  "linen",
  "brocade",
  "george",
  "custom",
])
const orderStage = z.enum([
  "received",
  "measured",
  "cutting",
  "sewing",
  "finishing",
  "quality_check",
  "completed",
])
const orderStatus = z.enum([
  "pending",
  "confirmed",
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
])
const fitPreference = z.enum(["slim", "regular", "loose"])

const domainOrderItemSchema = z.object({
  id: z.string(),
  garmentType: nigerianGarmentType,
  fabricType,
  fabricColor: z.string(),
  fabricQuantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  measurements: z.record(z.string(), z.number()),
  customizations: z.record(z.string(), z.string()),
  culturalSpecifications: z.string().nullable(),
  notes: z.string().nullable(),
  status: orderStage,
  estimatedDays: z.number(),
  actualDays: z.number().nullable(),
  tailorId: z.string().nullable(),
  qualityScore: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const domainOrderSnapshotSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  userId: z.string(),
  tailorId: z.string().nullable(),
  locationId: z.string(),
  type: z.enum(["custom", "alteration", "repair"]),
  garmentType: nigerianGarmentType,
  city: z.enum(["lagos", "abuja", "kano"]),
  customerLanguage: z.enum(["en", "yo", "ha", "ig"]),
  items: z.array(domainOrderItemSchema),
  status: orderStatus,
  priority: z.enum(["low", "normal", "high", "urgent"]),
  customerInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
  }),
  measurementId: z.string().nullable(),
  fabricSelection: z.object({
    type: fabricType,
    color: z.string(),
    pattern: z.string().nullable(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    supplier: z.string().nullable(),
    inStock: z.boolean(),
  }),
  styleConfig: z.object({
    designNotes: z.string().nullable(),
    embellishments: z.array(z.string()),
    fitPreference,
    necklineStyle: z.string().nullable(),
    sleeveStyle: z.string().nullable(),
    hemStyle: z.string().nullable(),
    culturalSpecifications: z.string().nullable(),
  }),
  pricing: z.object({
    basePrice: z.number(),
    fabricCost: z.number(),
    complexityMultiplier: z.number(),
    urgencyFee: z.number(),
    totalPrice: z.number(),
    depositRequired: z.number(),
    balanceAmount: z.number(),
    currency: z.literal("NGN"),
  }),
  paymentMethod: z.enum(["bank_transfer", "mobile_money", "cash", "card", "pos"]),
  orderDate: z.string(),
  estimatedDeliveryDate: z.string(),
  actualDeliveryDate: z.string().nullable(),
  progress: z.object({
    currentStage: orderStage,
    status: orderStatus,
    percentage: z.number(),
    estimatedCompletion: z.string().nullable(),
    actualCompletion: z.string().nullable(),
    stageProgress: z.array(
      z.object({
        stage: orderStage,
        status: z.enum(["pending", "in_progress", "completed"]),
        startedAt: z.string().nullable(),
        completedAt: z.string().nullable(),
        tailorId: z.string().nullable(),
        qualityScore: z.number().nullable(),
        notes: z.string().nullable(),
      }),
    ),
    lastUpdated: z.string(),
  }),
  notes: z.string().nullable(),
  internalNotes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const baseOrder: PBOrderRecord = {
  id: "ord123456789012",
  orderNumber: "ORD-2026-00042",
  customer: "usr123456789012",
  tailor: "tlr123456789012",
  status: "sewing",
  priority: "express",
  orderType: "new_clothing",
  measurement: "mea123456789012",
  style: "sty123456789012",
  totalAmount: 55000,
  depositAmount: 27500,
  balanceAmount: 27500,
  currency: "NGN",
  estimatedDelivery: "2026-08-01 00:00:00.000Z",
  actualDelivery: "",
  specialInstructions: "Extra long sleeves",
  internalNotes: "",
  cancellationReason: "",
  created: "2026-07-01 10:00:00.000Z",
  updated: "2026-07-05 09:30:00.000Z",
  expand: {
    customer: {
      id: "usr123456789012",
      firstName: "Ade",
      lastName: "Okafor",
      email: "ade@example.com",
      phone: "+2348000000000",
      location: "12 Marina Rd, Lagos",
    },
  },
}

const richItem: PBOrderItemRecord = {
  id: "itm123456789012",
  order: "ord123456789012",
  itemType: "traditional",
  quantity: 1,
  designStyle: "Gold embroidery on neckline",
  itemPrice: 55000,
  totalPrice: 55000,
  status: "in_progress",
  created: "2026-07-01 10:00:01.000Z",
  updated: "2026-07-05 09:30:00.000Z",
  specifications: {
    garmentType: "agbada",
    city: "lagos",
    customerLanguage: "yo",
    customerInfo: {
      firstName: "Ade",
      lastName: "Okafor",
      email: "ade@example.com",
      phone: "+2348000000000",
      address: "12 Marina Rd, Lagos",
    },
    fabricSelection: {
      type: "ankara",
      color: "Royal Blue",
      quantity: 4,
      unitPrice: 3500,
      totalPrice: 14000,
      inStock: true,
    },
    styleConfig: {
      designNotes: "Gold embroidery on neckline",
      embellishments: ["embroidery"],
      fitPreference: "regular",
      culturalSpecifications: "Yoruba ceremonial",
    },
    pricing: {
      basePrice: 25000,
      fabricCost: 14000,
      complexityMultiplier: 1.8,
      urgencyFee: 0,
      totalPrice: 55000,
      depositRequired: 27500,
      balanceAmount: 27500,
      currency: "NGN",
    },
    paymentMethod: "bank_transfer",
  },
}

const stages: PBOrderStageRecord[] = [
  { id: "stg1", order: "ord123456789012", status: "pending", created: "2026-07-01 10:00:01.000Z" },
  {
    id: "stg2",
    order: "ord123456789012",
    status: "sewing",
    note: "Started sewing",
    changedBy: "tlr123456789012",
    created: "2026-07-05 09:30:00.000Z",
  },
]

describe("mapPBOrderToDomain", () => {
  it("maps a realistic PB record with specifications to a valid domain snapshot", () => {
    const domain = mapPBOrderToDomain(baseOrder, [richItem], stages)

    expect(domain.id).toBe("ord123456789012")
    expect(domain.orderNumber).toBe("ORD-2026-00042")
    expect(domain.userId).toBe("usr123456789012")
    expect(domain.tailorId).toBe("tlr123456789012")
    expect(domain.type).toBe("custom")
    // sewing → in_progress, stage sewing at 50%
    expect(domain.status).toBe("in_progress")
    expect(domain.progress.currentStage).toBe("sewing")
    expect(domain.progress.percentage).toBe(50)
    // express → high
    expect(domain.priority).toBe("high")
    // Nigerian fields from the first item's specifications
    expect(domain.garmentType).toBe("agbada")
    expect(domain.city).toBe("lagos")
    expect(domain.customerLanguage).toBe("yo")
    expect(domain.customerInfo.firstName).toBe("Ade")
    expect(domain.fabricSelection.type).toBe("ankara")
    expect(domain.fabricSelection.totalPrice).toBe(14000)
    expect(domain.styleConfig.fitPreference).toBe("regular")
    expect(domain.pricing.totalPrice).toBe(55000)
    expect(domain.pricing.currency).toBe("NGN")
    expect(domain.paymentMethod).toBe("bank_transfer")
    expect(domain.notes).toBe("Extra long sleeves")
    // stage history folded into progress
    expect(domain.progress.stageProgress.length).toBe(2)
    expect(domain.progress.stageProgress[1].stage).toBe("sewing")
    expect(domain.progress.stageProgress[1].notes).toBe("Started sewing")
    // items mapped
    expect(domain.items.length).toBe(1)
    expect(domain.items[0].garmentType).toBe("agbada")
    expect(domain.items[0].status).toBe("sewing")

    // and the MST model accepts it
    expect(() => domainOrderSnapshotSchema.parse(domain)).not.toThrow()
  })

  it("applies safe defaults for sparse seeded records (no items, no specs)", () => {
    const sparse: PBOrderRecord = {
      id: "ord000000000001",
      orderNumber: "ORD-2026-00001",
      customer: "usr000000000001",
      status: "pending",
      created: "2026-07-01 10:00:00.000Z",
      updated: "2026-07-01 10:00:00.000Z",
      totalAmount: 30000,
      depositAmount: 0,
      balanceAmount: 30000,
    }

    const domain = mapPBOrderToDomain(sparse, [])

    expect(domain.status).toBe("pending")
    expect(domain.tailorId).toBeNull()
    expect(domain.garmentType).toBe("traditional")
    expect(domain.city).toBe("lagos")
    expect(domain.customerLanguage).toBe("en")
    expect(domain.fabricSelection.type).toBe("ankara")
    expect(domain.fabricSelection.inStock).toBe(false)
    expect(domain.styleConfig.fitPreference).toBe("regular")
    expect(domain.pricing.basePrice).toBe(30000)
    expect(domain.pricing.totalPrice).toBe(30000)
    expect(domain.pricing.balanceAmount).toBe(30000)
    expect(domain.paymentMethod).toBe("bank_transfer")
    // estimatedDeliveryDate falls back to created (model requires a string)
    expect(domain.estimatedDeliveryDate).toBe(sparse.created)
    expect(domain.progress.currentStage).toBe("received")
    expect(domain.progress.percentage).toBe(0)

    expect(() => domainOrderSnapshotSchema.parse(domain)).not.toThrow()
  })

  it("validates unknown enum values against the model vocabularies", () => {
    const weirdItem: PBOrderItemRecord = {
      ...richItem,
      status: "???",
      specifications: {
        garmentType: "tuxedo", // not a Nigerian garment type
        city: "port_harcourt", // not a supported city
        customerLanguage: "fr",
        fabricSelection: { type: "denim" },
        styleConfig: { fitPreference: "baggy" },
        paymentMethod: "crypto",
      },
    }
    const domain = mapPBOrderToDomain({ ...baseOrder, status: "nonsense" }, [weirdItem])

    expect(domain.status).toBe("pending")
    expect(domain.garmentType).toBe("traditional")
    expect(domain.city).toBe("lagos")
    expect(domain.customerLanguage).toBe("en")
    expect(domain.fabricSelection.type).toBe("ankara")
    expect(domain.styleConfig.fitPreference).toBe("regular")
    expect(domain.paymentMethod).toBe("bank_transfer")
    expect(domain.items[0].status).toBe("received")

    expect(() => domainOrderSnapshotSchema.parse(domain)).not.toThrow()
  })
})

describe("mapPBOrderItemToDomain", () => {
  it("maps item statuses pending/in_progress/completed to domain stages", () => {
    expect(mapPBOrderItemToDomain({ ...richItem, status: "pending" }).status).toBe("received")
    expect(mapPBOrderItemToDomain({ ...richItem, status: "in_progress" }).status).toBe("sewing")
    expect(mapPBOrderItemToDomain({ ...richItem, status: "completed" }).status).toBe("completed")
  })
})

describe("mapDomainOrderToPB", () => {
  const draft = {
    id: "local-draft-id",
    orderNumber: "NGR-LOCAL",
    userId: "ignored-local-user",
    tailorId: null,
    locationId: "main",
    type: "custom",
    garmentType: "kaftan",
    city: "abuja",
    customerLanguage: "ha",
    items: [],
    status: "pending",
    priority: "urgent",
    customerInfo: {
      firstName: "Bola",
      lastName: "Ahmed",
      email: "bola@example.com",
      phone: "+2348111111111",
      address: "3 Wuse Zone, Abuja",
    },
    measurementId: "mea000000000001",
    fabricSelection: {
      type: "silk",
      color: "Cream",
      pattern: null,
      quantity: 3,
      unitPrice: 8500,
      totalPrice: 25500,
      supplier: null,
      inStock: true,
    },
    styleConfig: {
      designNotes: "Slim collar",
      embellishments: [],
      fitPreference: "slim",
      necklineStyle: null,
      sleeveStyle: null,
      hemStyle: null,
      culturalSpecifications: null,
    },
    pricing: {
      basePrice: 15000,
      fabricCost: 25500,
      complexityMultiplier: 1.4,
      urgencyFee: 7500,
      totalPrice: 64200,
      depositRequired: 32100,
      balanceAmount: 32100,
      currency: "NGN",
    },
    paymentMethod: "mobile_money",
    orderDate: "2026-07-10T00:00:00.000Z",
    estimatedDeliveryDate: "2026-07-20T00:00:00.000Z",
    actualDeliveryDate: null,
    notes: "Needed before wedding",
    internalNotes: null,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
  }

  it("maps a domain draft to PB order + order_item payloads", () => {
    const { order, item } = mapDomainOrderToPB(draft)

    expect(order.orderType).toBe("new_clothing")
    expect(order.priority).toBe("urgent")
    expect(order.totalAmount).toBe(64200)
    expect(order.currency).toBe("NGN")
    expect(order.measurement).toBe("mea000000000001")
    expect(order.specialInstructions).toBe("Needed before wedding")
    expect(order.fabricSource).toBe("tailor")
    // server-computed fields must not be sent
    expect(order.orderNumber).toBeUndefined()
    expect(order.status).toBeUndefined()
    expect(order.depositAmount).toBeUndefined()
    expect(order.balanceAmount).toBeUndefined()
    expect(order.paymentStatus).toBeUndefined()

    expect(item.itemType).toBe("traditional")
    expect(item.quantity).toBe(1)
    expect(item.itemPrice).toBe(64200)
    expect(item.totalPrice).toBe(64200)
    expect(item.designStyle).toBe("Slim collar")
    expect(item.specifications.garmentType).toBe("kaftan")
    expect(item.specifications.city).toBe("abuja")
    expect(item.specifications.paymentMethod).toBe("mobile_money")
  })

  it("round trips: domain → PB payload → domain preserves the Nigerian fields", () => {
    const { order, item } = mapDomainOrderToPB(draft)

    // simulate the record the server would return
    const pbOrder: PBOrderRecord = {
      id: "ordroundtrip0001",
      orderNumber: "ORD-2026-00099",
      customer: "usrroundtrip0001",
      status: "pending",
      created: "2026-07-10 00:00:01.000Z",
      updated: "2026-07-10 00:00:01.000Z",
      ...order,
    }
    const pbItem: PBOrderItemRecord = {
      id: "itmroundtrip0001",
      order: "ordroundtrip0001",
      created: "2026-07-10 00:00:01.000Z",
      updated: "2026-07-10 00:00:01.000Z",
      ...item,
    }

    const domain = mapPBOrderToDomain(pbOrder, [pbItem])

    expect(domain.type).toBe("custom")
    expect(domain.priority).toBe("urgent")
    expect(domain.garmentType).toBe("kaftan")
    expect(domain.city).toBe("abuja")
    expect(domain.customerLanguage).toBe("ha")
    expect(domain.customerInfo.firstName).toBe("Bola")
    expect(domain.fabricSelection.type).toBe("silk")
    expect(domain.fabricSelection.totalPrice).toBe(25500)
    expect(domain.styleConfig.fitPreference).toBe("slim")
    expect(domain.pricing.totalPrice).toBe(64200)
    expect(domain.pricing.urgencyFee).toBe(7500)
    expect(domain.paymentMethod).toBe("mobile_money")
    expect(domain.notes).toBe("Needed before wedding")

    expect(() => domainOrderSnapshotSchema.parse(domain)).not.toThrow()
  })
})

describe("domainStatusToPB", () => {
  it("maps domain statuses to PB statuses for updates", () => {
    expect(domainStatusToPB("pending")).toBe("pending")
    expect(domainStatusToPB("confirmed")).toBe("accepted")
    expect(domainStatusToPB("in_progress")).toBe("sewing")
    expect(domainStatusToPB("ready")).toBe("ready")
    expect(domainStatusToPB("delivered")).toBe("delivered")
    expect(domainStatusToPB("cancelled")).toBe("cancelled")
  })
})
