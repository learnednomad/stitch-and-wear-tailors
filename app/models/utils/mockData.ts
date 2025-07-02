/**
 * Mock Data Generators for Testing
 * Generates realistic test data for all models
 */

import type {
  User,
  Order,
  Measurement,
  Fabric,
  Style,
  Appointment,
  Invoice,
  Notification,
  Feedback,
  UserRole,
  OrderStatus,
  FabricCategory,
  StyleComplexity,
  AppointmentType,
  NotificationType,
} from "../types"

/**
 * Utility functions for generating mock data
 */
const generateId = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const randomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)]
}

const randomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const randomDate = (start: Date, end: Date): string => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString()
}

const futureDate = (daysFromNow: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString()
}

const pastDate = (daysAgo: number): string => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

/**
 * Mock data generators
 */
export const mockData = {
  user: (overrides?: Partial<User>): User => {
    const roles: UserRole[] = ["client", "tailor", "admin"]
    const firstName = randomElement([
      "John",
      "Jane",
      "Michael",
      "Sarah",
      "David",
      "Emily",
      "Robert",
      "Lisa",
    ])
    const lastName = randomElement([
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
    ])

    return {
      id: generateId(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      role: randomElement(roles),
      status: "active",
      profile: {
        firstName,
        lastName,
        phone: `+1${randomNumber(2000000000, 9999999999)}`,
        avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}`,
        dateOfBirth: randomDate(new Date("1950-01-01"), new Date("2000-01-01")),
        address: {
          street: `${randomNumber(100, 9999)} ${randomElement(["Main", "Oak", "Pine", "Maple", "Cedar"])} St`,
          city: randomElement(["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"]),
          state: randomElement(["NY", "CA", "IL", "TX", "AZ"]),
          zipCode: randomNumber(10000, 99999).toString(),
          country: "USA",
        },
      },
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        language: "en",
        timezone: "America/New_York",
        currency: "USD",
      },
      emailVerified: true,
      lastLoginAt: pastDate(randomNumber(0, 30)),
      createdAt: pastDate(randomNumber(30, 365)),
      updatedAt: pastDate(randomNumber(0, 30)),
      ...overrides,
    }
  },

  order: (overrides?: Partial<Order>): Order => {
    const statuses: OrderStatus[] = [
      "pending",
      "confirmed",
      "measuring",
      "cutting",
      "stitching",
      "fitting",
      "ready",
    ]
    const status = randomElement(statuses)

    return {
      id: generateId(),
      orderNumber: `ORD-${randomNumber(10000, 99999)}`,
      clientId: generateId(),
      tailorId: generateId(),
      status,
      priority: randomElement(["normal", "high", "urgent"]),
      items: [
        {
          id: generateId(),
          styleId: generateId(),
          fabricId: generateId(),
          quantity: 1,
          measurements: {
            chest: randomNumber(90, 110),
            waist: randomNumber(80, 100),
            armLength: randomNumber(60, 75),
          },
          customizations: [],
          unitPrice: randomNumber(200, 800),
          totalPrice: randomNumber(200, 800),
        },
      ],
      timeline: {
        estimatedStartDate: futureDate(randomNumber(1, 7)),
        estimatedCompletionDate: futureDate(randomNumber(14, 30)),
        actualStartDate: status !== "pending" ? pastDate(randomNumber(1, 5)) : undefined,
        actualCompletionDate: status === "ready" ? pastDate(1) : undefined,
        milestones: [
          {
            id: generateId(),
            name: "Initial Consultation",
            description: "Meet with client to discuss requirements",
            estimatedDate: futureDate(2),
            status: "completed",
            actualDate: pastDate(1),
          },
        ],
      },
      pricing: {
        subtotal: randomNumber(200, 800),
        tax: randomNumber(20, 80),
        discount: 0,
        shipping: 0,
        total: randomNumber(220, 880),
        currency: "USD",
      },
      notes: "Standard order with custom measurements.",
      images: [],
      createdAt: pastDate(randomNumber(1, 30)),
      updatedAt: pastDate(randomNumber(0, 5)),
      ...overrides,
    }
  },

  measurement: (overrides?: Partial<Measurement>): Measurement => ({
    id: generateId(),
    clientId: generateId(),
    garmentTypes: ["shirt", "pants"],
    status: "validated",
    standardMeasurements: {
      chest: { value: randomNumber(90, 110), unit: "cm" },
      waist: { value: randomNumber(80, 100), unit: "cm" },
      hips: { value: randomNumber(90, 110), unit: "cm" },
      shoulders: { value: randomNumber(40, 50), unit: "cm" },
      armLength: { value: randomNumber(60, 75), unit: "cm" },
      neck: { value: randomNumber(35, 45), unit: "cm" },
      inseam: { value: randomNumber(75, 85), unit: "cm" },
      height: { value: randomNumber(160, 190), unit: "cm" },
    },
    customMeasurements: [],
    validation: {
      validatedBy: generateId(),
      validatedAt: pastDate(randomNumber(1, 7)),
      status: "approved",
      comments: "Measurements look accurate.",
    },
    takenBy: generateId(),
    takenAt: pastDate(randomNumber(1, 14)),
    notes: "Client prefers slightly loose fit.",
    images: [],
    createdAt: pastDate(randomNumber(1, 30)),
    updatedAt: pastDate(randomNumber(0, 5)),
    ...overrides,
  }),

  fabric: (overrides?: Partial<Fabric>): Fabric => {
    const categories: FabricCategory[] = ["cotton", "silk", "wool", "linen"]
    const category = randomElement(categories)
    const fabricNames: Record<FabricCategory, string[]> = {
      cotton: ["Premium Cotton", "Egyptian Cotton", "Organic Cotton"],
      silk: ["Pure Silk", "Mulberry Silk", "Charmeuse Silk"],
      wool: ["Merino Wool", "Cashmere", "Wool Blend"],
      linen: ["Irish Linen", "Belgian Linen", "Linen Blend"],
      polyester: ["Premium Polyester", "Microfiber", "Stretch Polyester"],
      denim: ["Raw Denim", "Stretch Denim", "Organic Denim"],
      velvet: ["Cotton Velvet", "Silk Velvet", "Crushed Velvet"],
      leather: ["Genuine Leather", "Premium Leather", "Soft Leather"],
      synthetic: ["Synthetic Blend", "Performance Fabric", "Technical Fabric"],
    }

    return {
      id: generateId(),
      name: randomElement(fabricNames[category]),
      description: `High-quality ${category} fabric perfect for formal wear.`,
      category,
      material: `100% ${category}`,
      properties: {
        weight: randomElement(["lightweight", "medium", "heavyweight"]),
        pattern: randomElement(["solid", "striped", "checkered"]),
        stretch: Math.random() > 0.5,
        breathable: true,
        washable: category !== "silk",
        ironingTemp: "medium",
        dryCleanOnly: category === "silk",
        fadeResistant: true,
        wrinkleResistant: Math.random() > 0.5,
      },
      colors: {
        primary: randomElement(["Navy", "Black", "White", "Gray", "Brown"]),
        colorCode: randomElement(["#000080", "#000000", "#FFFFFF", "#808080", "#8B4513"]),
        colorName: randomElement([
          "Navy Blue",
          "Jet Black",
          "Pure White",
          "Charcoal Gray",
          "Chocolate Brown",
        ]),
      },
      inventory: {
        totalQuantity: randomNumber(50, 200),
        availableQuantity: randomNumber(30, 150),
        reservedQuantity: randomNumber(0, 20),
        unit: "meters",
        minimumStock: 10,
        reorderPoint: 20,
      },
      pricing: {
        basePrice: randomNumber(50, 200),
        currency: "USD",
        pricePerUnit: randomNumber(50, 200),
      },
      supplier: {
        id: generateId(),
        name: "Premium Fabrics Inc.",
        contactInfo: {
          email: "contact@premiumfabrics.com",
          phone: "+1-555-0100",
          address: "123 Textile Ave, New York, NY 10001",
        },
        leadTime: randomNumber(7, 21),
        minimumOrder: 10,
      },
      availability: randomElement(["in_stock", "low_stock"]),
      images: [`https://picsum.photos/400/300?random=${randomNumber(1, 100)}`],
      careInstructions: ["Machine wash cold", "Tumble dry low", "Iron on medium heat"],
      suitableFor: ["shirts", "dresses", "suits"],
      tags: [category, "premium", "formal"],
      featured: Math.random() > 0.8,
      active: true,
      createdAt: pastDate(randomNumber(30, 365)),
      updatedAt: pastDate(randomNumber(0, 30)),
      ...overrides,
    }
  },

  style: (overrides?: Partial<Style>): Style => {
    const complexities: StyleComplexity[] = ["basic", "intermediate", "advanced"]
    const styleNames = [
      "Classic Suit",
      "Business Shirt",
      "Casual Dress",
      "Formal Jacket",
      "Custom Blazer",
    ]

    return {
      id: generateId(),
      name: randomElement(styleNames),
      description: "Timeless design perfect for any occasion.",
      category: randomElement(["formal", "business", "casual"]),
      complexity: randomElement(complexities),
      gender: randomElement(["men", "women", "unisex"]),
      season: randomElement(["spring", "summer", "autumn", "winter", "all_season"]),
      measurements: {
        required: ["chest", "waist", "armLength"],
        optional: ["hips", "shoulders"],
        critical: ["chest", "waist"],
      },
      fabricRequirements: {
        recommendedTypes: ["cotton", "wool"],
        unsuitableTypes: ["denim"],
        minimumQuantity: randomNumber(2, 5),
        unit: "meters",
        properties: {
          stretch: false,
          weight: "medium",
          drape: "structured",
        },
      },
      customizations: [],
      instructions: {
        cutting: ["Cut according to pattern", "Leave seam allowances"],
        stitching: ["Use French seams", "Reinforce stress points"],
        fitting: ["Check shoulder fit first", "Adjust as needed"],
        finishing: ["Press all seams", "Final quality check"],
        qualityChecks: ["Check stitch quality", "Verify measurements"],
      },
      pricing: {
        basePrice: randomNumber(300, 1000),
        currency: "USD",
        laborHours: randomNumber(8, 24),
        difficultyMultiplier: 1.2,
        rushOrderMultiplier: 1.5,
      },
      images: [`https://picsum.photos/400/600?random=${randomNumber(101, 200)}`],
      technicalDrawings: [],
      estimatedCompletionDays: randomNumber(7, 21),
      tags: ["premium", "custom"],
      popularityScore: randomNumber(0, 100),
      featured: Math.random() > 0.7,
      active: true,
      createdBy: generateId(),
      createdAt: pastDate(randomNumber(30, 365)),
      updatedAt: pastDate(randomNumber(0, 30)),
      ...overrides,
    }
  },

  appointment: (overrides?: Partial<Appointment>): Appointment => {
    const types: AppointmentType[] = ["consultation", "measurement", "fitting", "delivery"]

    return {
      id: generateId(),
      clientId: generateId(),
      tailorId: generateId(),
      orderId: generateId(),
      type: randomElement(types),
      status: "scheduled",
      services: {
        primaryService: randomElement(types),
        additionalServices: [],
        estimatedDuration: randomNumber(60, 120),
        requirements: ["Bring previous measurements", "Comfortable clothing"],
      },
      scheduledAt: futureDate(randomNumber(1, 14)),
      startTime: futureDate(randomNumber(1, 14)),
      endTime: futureDate(randomNumber(1, 14)),
      location: {
        type: "shop",
        address: {
          street: "123 Tailor St",
          city: "New York",
          state: "NY",
          zipCode: "10001",
          country: "USA",
        },
        instructions: "Enter through main entrance",
      },
      reminders: [
        {
          type: "email",
          timeBeforeMinutes: 1440, // 24 hours
          sent: false,
        },
      ],
      preparation: {
        clientInstructions: ["Bring comfortable shoes", "Avoid heavy meals"],
        tailorInstructions: ["Prepare measurement tools", "Review client history"],
        materialsNeeded: ["Measuring tape", "Pins", "Notebook"],
      },
      createdAt: pastDate(randomNumber(1, 30)),
      updatedAt: pastDate(randomNumber(0, 5)),
      ...overrides,
    }
  },

  invoice: (overrides?: Partial<Invoice>): Invoice => {
    const subtotal = randomNumber(200, 800)
    const tax = subtotal * 0.1
    const total = subtotal + tax

    return {
      id: generateId(),
      invoiceNumber: `INV-${randomNumber(10000, 99999)}`,
      orderId: generateId(),
      clientId: generateId(),
      tailorId: generateId(),
      status: randomElement(["pending", "sent", "paid"]),
      lineItems: [
        {
          id: generateId(),
          description: "Custom Suit Tailoring",
          quantity: 1,
          unitPrice: subtotal,
          totalPrice: subtotal,
          taxable: true,
          category: "service",
        },
      ],
      discounts: [],
      taxes: [
        {
          name: "Sales Tax",
          rate: 10,
          amount: tax,
          taxId: "ST001",
        },
      ],
      totals: {
        subtotal,
        discountAmount: 0,
        taxAmount: tax,
        total,
        amountPaid: 0,
        amountDue: total,
        currency: "USD",
      },
      terms: {
        paymentDue: futureDate(30),
        paymentTerms: "Net 30",
        lateFeesApply: true,
        lateFeePercent: 1.5,
        gracePeriodDays: 5,
      },
      payments: [],
      billingAddress: {
        name: "John Doe",
        street: "123 Client St",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        country: "USA",
      },
      issuedAt: pastDate(randomNumber(0, 5)),
      dueDate: futureDate(30),
      remindersSent: 0,
      attachments: [],
      metadata: {
        generatedBy: generateId(),
      },
      createdAt: pastDate(randomNumber(1, 30)),
      updatedAt: pastDate(randomNumber(0, 5)),
      ...overrides,
    }
  },

  notification: (overrides?: Partial<Notification>): Notification => {
    const types: NotificationType[] = ["order_update", "appointment_reminder", "payment_due"]
    const type = randomElement(types)

    const messages: Record<NotificationType, string> = {
      order_update: "Your order status has been updated",
      appointment_reminder: "You have an appointment tomorrow",
      payment_due: "Payment is due for your recent order",
      measurement_required: "Please schedule a measurement appointment",
      fitting_scheduled: "Your fitting appointment has been scheduled",
      order_completed: "Your order has been completed",
      promotional: "Special offer available for you",
      system_maintenance: "System maintenance scheduled",
      account_update: "Your account information has been updated",
    }

    return {
      id: generateId(),
      userId: generateId(),
      type,
      channel: "push",
      priority: "normal",
      status: "sent",
      title: "Order Update",
      message: messages[type],
      actions: [],
      data: {
        orderId: generateId(),
      },
      tracking: {
        sentAt: pastDate(1),
        retryCount: 0,
      },
      read: Math.random() > 0.5,
      dismissed: false,
      createdAt: pastDate(randomNumber(1, 7)),
      updatedAt: pastDate(randomNumber(0, 2)),
      ...overrides,
    }
  },

  feedback: (overrides?: Partial<Feedback>): Feedback => ({
    id: generateId(),
    orderId: generateId(),
    clientId: generateId(),
    tailorId: generateId(),
    type: "review",
    status: "pending",
    rating: {
      overall: randomNumber(3, 5),
      quality: randomNumber(3, 5),
      timeliness: randomNumber(3, 5),
      communication: randomNumber(3, 5),
      value: randomNumber(3, 5),
    },
    aspects: [
      {
        aspect: "Fit",
        rating: randomNumber(4, 5),
        comment: "Perfect fit, very satisfied",
      },
    ],
    title: "Great experience!",
    comment: "The tailor did an excellent job. Highly recommend!",
    tags: ["quality", "professional", "timely"],
    responses: [],
    attachments: [],
    metadata: {
      source: "app",
      platform: "ios",
      version: "1.0.0",
    },
    anonymous: false,
    verified: true,
    helpful: randomNumber(0, 10),
    reported: false,
    featured: Math.random() > 0.9,
    public: true,
    createdAt: pastDate(randomNumber(1, 30)),
    updatedAt: pastDate(randomNumber(0, 5)),
    ...overrides,
  }),
}

/**
 * Generate arrays of mock data
 */
export const generateMockArray = <T>(
  generator: (overrides?: Partial<T>) => T,
  count: number,
  overrides?: Partial<T>,
): T[] => {
  return Array.from({ length: count }, () => generator(overrides))
}

/**
 * Generate related mock data (e.g., orders for a specific client)
 */
export const generateRelatedData = {
  ordersForClient: (clientId: string, count: number = 3): Order[] => {
    return generateMockArray(mockData.order, count, { clientId })
  },

  measurementsForClient: (clientId: string, count: number = 2): Measurement[] => {
    return generateMockArray(mockData.measurement, count, { clientId })
  },

  appointmentsForTailor: (tailorId: string, count: number = 5): Appointment[] => {
    return generateMockArray(mockData.appointment, count, { tailorId })
  },

  notificationsForUser: (userId: string, count: number = 10): Notification[] => {
    return generateMockArray(mockData.notification, count, { userId })
  },
}
