/**
 * Nigerian Languages Support
 * Yoruba, Hausa, Igbo translations for orders feature
 */

import { SupportedLanguage, MultiLanguageContent } from "../types/orders"

// Order-related translations
export const orderTranslations = {
  // Order Creation Flow
  customerInfo: {
    en: "Customer Information",
    yo: "Alaye Alabara",
    ha: "Bayanan Abokin Ciniki",
    ig: "Ozi Onye Ahia",
  },
  measurements: {
    en: "Measurements",
    yo: "Awon Iwon",
    ha: "Ma'auni",
    ig: "Nha",
  },
  fabricSelection: {
    en: "Fabric Selection",
    yo: "Yiyan Aso",
    ha: "Zabar Yadi",
    ig: "Nhoro Akwa",
  },
  styleSelection: {
    en: "Style Selection",
    yo: "Yiyan Iru Aso",
    ha: "Zabar Salon",
    ig: "Nhoro Udiri",
  },
  pricing: {
    en: "Pricing",
    yo: "Owo",
    ha: "Kudi",
    ig: "Onu Ego",
  },
  confirmation: {
    en: "Confirmation",
    yo: "Idaniloju",
    ha: "Tabbatarwa",
    ig: "Nkwenye",
  },

  // Garment Types
  garments: {
    agbada: {
      en: "Agbada (Traditional Flowing Robe)",
      yo: "Agbada",
      ha: "Agbada",
      ig: "Agbada",
    },
    kaftan: {
      en: "Kaftan",
      yo: "Kaftan",
      ha: "Kaftan",
      ig: "Kaftan",
    },
    isi_agu: {
      en: "Isi Agu (Traditional Igbo Shirt)",
      yo: "Isi Agu",
      ha: "Isi Agu",
      ig: "Isi Agu",
    },
    babban_riga: {
      en: "Babban Riga (Traditional Hausa Robe)",
      yo: "Babban Riga",
      ha: "Babban Riga",
      ig: "Babban Riga",
    },
    ankara_dress: {
      en: "Ankara Dress",
      yo: "Aṣọ Ankara",
      ha: "Rigar Ankara",
      ig: "Uwe Ankara",
    },
    senator: {
      en: "Senator Style",
      yo: "Iru Senator",
      ha: "Salon Senator",
      ig: "Udiri Senator",
    },
  },

  // Measurements
  measurementTypes: {
    chest: {
      en: "Chest",
      yo: "Ẹgbẹ",
      ha: "Kirji",
      ig: "Obi",
    },
    waist: {
      en: "Waist",
      yo: "Egbe",
      ha: "Kugu",
      ig: "Ukwu",
    },
    length: {
      en: "Length",
      yo: "Gigun",
      ha: "Tsawo",
      ig: "Ogologo",
    },
    shoulder: {
      en: "Shoulder",
      yo: "Ejika",
      ha: "Kafada",
      ig: "Ubu",
    },
    armLength: {
      en: "Arm Length",
      yo: "Gigun Apa",
      ha: "Tsawon Hannu",
      ig: "Ogologo Aka",
    },
    neck: {
      en: "Neck",
      yo: "Ọrun",
      ha: "Wuya",
      ig: "Olu",
    },
  },

  // Order Status
  orderStatus: {
    pending: {
      en: "Pending",
      yo: "Ti nduro",
      ha: "Ana Jira",
      ig: "Na-eche",
    },
    confirmed: {
      en: "Confirmed",
      yo: "Ti fi idi mule",
      ha: "An Tabbatar",
      ig: "Ekwenyere",
    },
    in_progress: {
      en: "In Progress",
      yo: "N lọ lọwọ",
      ha: "Ana Aiki",
      ig: "Na-aga n'ihu",
    },
    ready: {
      en: "Ready",
      yo: "Ti setan",
      ha: "Ya Shirya",
      ig: "Kwadoro",
    },
    delivered: {
      en: "Delivered",
      yo: "Ti fi ranṣẹ",
      ha: "An Kawo",
      ig: "Ewetara",
    },
    cancelled: {
      en: "Cancelled",
      yo: "Ti fagilee",
      ha: "An Soke",
      ig: "Kagburu",
    },
  },

  // Payment Methods
  paymentMethods: {
    bank_transfer: {
      en: "Bank Transfer",
      yo: "Gbigbe Owo Bank",
      ha: "Canja Kudin Bank",
      ig: "Mbufe Ego Bank",
    },
    mobile_money: {
      en: "Mobile Money (OPay, PalmPay)",
      yo: "Owo Foonu",
      ha: "Kudin Wayar Hannu",
      ig: "Ego Ekwenti",
    },
    cash: {
      en: "Cash",
      yo: "Owo lowo",
      ha: "Kudi",
      ig: "Ego nkiti",
    },
    card: {
      en: "Debit/Credit Card",
      yo: "Kaadi Bank",
      ha: "Katin Bank",
      ig: "Kaadi Bank",
    },
  },

  // Cities
  cities: {
    lagos: {
      en: "Lagos",
      yo: "Eko",
      ha: "Lagos",
      ig: "Lagos",
    },
    abuja: {
      en: "Abuja",
      yo: "Abuja",
      ha: "Abuja",
      ig: "Abuja",
    },
    kano: {
      en: "Kano",
      yo: "Kano",
      ha: "Kano",
      ig: "Kano",
    },
  },

  // Common Actions
  actions: {
    next: {
      en: "Next",
      yo: "To'kun",
      ha: "Na Gaba",
      ig: "Osote",
    },
    previous: {
      en: "Previous",
      yo: "Ti ko",
      ha: "Na Baya",
      ig: "Nke gara aga",
    },
    save: {
      en: "Save",
      yo: "Fi pamo",
      ha: "Ajiye",
      ig: "Chekwaa",
    },
    cancel: {
      en: "Cancel",
      yo: "Fagilee",
      ha: "Soke",
      ig: "Kagburu",
    },
    confirm: {
      en: "Confirm",
      yo: "Fi idi mule",
      ha: "Tabbatar",
      ig: "Kwenye",
    },
    edit: {
      en: "Edit",
      yo: "Ṣatunṣe",
      ha: "Gyara",
      ig: "Dezie",
    },
    delete: {
      en: "Delete",
      yo: "Pa rẹ",
      ha: "Share",
      ig: "Hichaa",
    },
  },

  // Measurement Tutorial
  measurementTutorial: {
    title: {
      en: "How to Take Measurements",
      yo: "Bi o ṣe le gba iwon",
      ha: "Yadda Za A Auna",
      ig: "Otu esi ewere nha",
    },
    introduction: {
      en: "Follow these steps to get accurate measurements for your garment",
      yo: "Tẹle awọn igbesẹ wọnyi lati gba iwon to peye fun aṣọ rẹ",
      ha: "Bi wadannan matakai don samun ingantaccen ma'auni don rigar ku",
      ig: "Soro usoro ndia iji nweta nha ziri ezi maka uwe gi",
    },
    tips: {
      en: "Tips for Accurate Measurements",
      yo: "Awọn imọran fun Iwon to peye",
      ha: "Shawarwari don Ingantaccen Ma'auni",
      ig: "Ndumodu maka Nha Ziri Ezi",
    },
  },

  // Error Messages
  errors: {
    required_field: {
      en: "This field is required",
      yo: "Aaye yi nilo",
      ha: "Ana bukatar wannan filin",
      ig: "Achoro oghere a",
    },
    invalid_measurement: {
      en: "Please enter a valid measurement",
      yo: "Jọwọ tẹ iwon to tọ",
      ha: "Da fatan za a shigar da ingantaccen ma'auni",
      ig: "Biko tinye nha ziri ezi",
    },
    network_error: {
      en: "Network error. Please try again.",
      yo: "Asise nẹtiwọọki. Jọwọ gbiyanju lẹẹkansi.",
      ha: "Kuskuren hanyar sadarwa. Da fatan a sake gwadawa.",
      ig: "Njehie netwook. Biko nwaa ozo.",
    },
  },

  // Success Messages
  success: {
    order_created: {
      en: "Order created successfully!",
      yo: "A ti ṣẹda ibere ni aṣeyọri!",
      ha: "An kirkiro oda cikin nasara!",
      ig: "Emere order nke oma!",
    },
    measurement_saved: {
      en: "Measurements saved successfully!",
      yo: "A ti fi iwon pamọ ni aṣeyọri!",
      ha: "An adana ma'auni cikin nasara!",
      ig: "Echekwara nha nke oma!",
    },
  },
} as const

// Helper function to get translation
export function getTranslation(
  key: keyof typeof orderTranslations,
  subKey: string,
  language: SupportedLanguage = "en",
): string {
  const translations = orderTranslations[key] as any
  const translation = translations[subKey] as MultiLanguageContent

  if (!translation) return subKey

  return translation[language] || translation.en || subKey
}

// Helper function for formatted strings
export function getFormattedTranslation(
  content: MultiLanguageContent,
  language: SupportedLanguage = "en",
  replacements?: Record<string, string>,
): string {
  let text = content[language] || content.en || ""

  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      text = text.replace(new RegExp(`{${key}}`, "g"), value)
    })
  }

  return text
}

// Default Nigerian Business Configuration
export const nigerianBusinessConfig = {
  cities: {
    lagos: {
      name: { en: "Lagos", yo: "Eko", ha: "Lagos", ig: "Lagos" },
      currency: "NGN" as const,
      deliveryFee: 2000,
      rushFeeMultiplier: 1.5,
      workingHours: { start: "08:00", end: "18:00" },
      closedDays: ["sunday"],
      majorLanguages: ["en", "yo", "ig"] as SupportedLanguage[],
    },
    abuja: {
      name: { en: "Abuja", yo: "Abuja", ha: "Abuja", ig: "Abuja" },
      currency: "NGN" as const,
      deliveryFee: 1500,
      rushFeeMultiplier: 1.3,
      workingHours: { start: "08:00", end: "17:00" },
      closedDays: ["sunday"],
      majorLanguages: ["en", "ha", "ig"] as SupportedLanguage[],
    },
    kano: {
      name: { en: "Kano", yo: "Kano", ha: "Kano", ig: "Kano" },
      currency: "NGN" as const,
      deliveryFee: 1000,
      rushFeeMultiplier: 1.2,
      workingHours: { start: "08:00", end: "17:00" },
      closedDays: ["friday", "sunday"],
      majorLanguages: ["en", "ha"] as SupportedLanguage[],
    },
  },
  traditionalGarments: {
    agbada: {
      name: orderTranslations.garments.agbada,
      description: {
        en: "Traditional flowing robe worn across West Africa",
        yo: "Aṣọ agbada ibile ti won ma n wọ ni Iwọ Oorun Afrika",
        ha: "Rigawar gargajiya da ake sawa a yammacin Afrika",
        ig: "Uwe omenala nke ana-eyi n'Osimiri Afrika",
      },
      culturalSignificance: {
        en: "Symbol of status and elegance in Nigerian culture",
        yo: "Ami ipo ati ẹwa ni aṣa Naijiria",
        ha: "Alamar matsayi da kyakkyawa a al'adun Najeriya",
        ig: "Ihe ngosi ọkwa na mma n'omenala Naijirịa",
      },
      requiredMeasurements: ["chest", "waist", "length", "shoulder", "armLength"],
      basePrice: 25000,
      complexityLevel: 4,
      estimatedDays: 7,
    },
    kaftan: {
      name: orderTranslations.garments.kaftan,
      description: {
        en: "Comfortable loose-fitting garment",
        yo: "Aṣọ ti ko ni ihamọra ti o tẹẹrẹ",
        ha: "Rigar jin dadi mai saukin sawa",
        ig: "Uwe di mfe ma chaa",
      },
      culturalSignificance: {
        en: "Popular everyday and formal wear",
        yo: "Aṣọ ojoojumo ati aṣọ iṣẹ pataki",
        ha: "Tufafin yau da kullun da na bikin",
        ig: "Uwe ubochi niile na ememe",
      },
      requiredMeasurements: ["chest", "waist", "length"],
      basePrice: 15000,
      complexityLevel: 2,
      estimatedDays: 4,
    },
  },
}
