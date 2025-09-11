# Day 1 Development Tasks - Order Creation Flow
**Date**: September 2, 2025  
**Sprint Day**: 1 of 10  
**Focus**: Order Creation Frontend Implementation  
**Points**: 8 (ORD-002: 5pts, ORD-003: 3pts)

## 🎯 Day 1 Objectives

1. Connect OrderCreationScreen to OrderStore
2. Implement complete order form with validation
3. Add Nigerian garment type selection
4. Create order preview functionality
5. Begin backend integration

## 📋 Detailed Task Breakdown

### 🕐 9:00-10:30 AM: OrderCreationScreen Setup
**Duration**: 1.5 hours  
**Output**: Connected screen with basic form

#### Task 1.1: Connect OrderCreationScreen to OrderStore
```typescript
// File: app/screens/orders/OrderCreationScreen.tsx

// TODO: Import OrderStore and required dependencies
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models'

// TODO: Connect to OrderStore
const { orderStore, authStore } = useStores()

// TODO: Initialize form state
const [orderData, setOrderData] = useState({
  garmentType: '',
  fabric: '',
  measurements: {},
  priority: 'normal',
  notes: ''
})
```

#### Task 1.2: Set up form structure
```typescript
// TODO: Create form sections
- Customer Information (from authStore)
- Garment Selection
- Fabric Selection  
- Measurements Input
- Special Instructions
- Delivery Preferences
```

#### Checklist:
- [ ] Import necessary dependencies
- [ ] Connect to MobX stores
- [ ] Set up initial form state
- [ ] Create form section components
- [ ] Add navigation params handling

---

### 🕐 10:30 AM-12:00 PM: Form Validation & Garment Selection
**Duration**: 1.5 hours  
**Output**: Validated form with Nigerian garments

#### Task 1.3: Implement Form Validation
```typescript
// File: app/screens/orders/validation/orderValidation.ts

import { z } from 'zod'

export const orderSchema = z.object({
  garmentType: z.enum([
    'agbada', 'kaftan', 'senator', 'dashiki',
    'isiagu', 'babban_riga', 'buba', 'sokoto'
  ]),
  fabric: z.string().min(1, 'Fabric selection required'),
  measurements: z.object({
    chest: z.number().min(30).max(60),
    waist: z.number().min(25).max(55),
    height: z.number().min(140).max(220),
    // Add more measurements
  }),
  priority: z.enum(['normal', 'express', 'urgent']),
  deliveryDate: z.date().min(new Date()),
  notes: z.string().optional()
})

// TODO: Implement validation function
export const validateOrder = (data: OrderFormData) => {
  try {
    return orderSchema.parse(data)
  } catch (error) {
    // Handle validation errors
  }
}
```

#### Task 1.4: Create Garment Type Selector
```typescript
// File: app/components/orders/GarmentTypeSelector.tsx

const NIGERIAN_GARMENTS = [
  { id: 'agbada', name: 'Agbada', icon: '👔', description: 'Traditional flowing robe' },
  { id: 'kaftan', name: 'Kaftan', icon: '👘', description: 'Long dress-like garment' },
  { id: 'senator', name: 'Senator', icon: '🎽', description: 'Modern traditional style' },
  { id: 'dashiki', name: 'Dashiki', icon: '👕', description: 'Colorful African shirt' },
  { id: 'isiagu', name: 'Isi Agu', icon: '🦁', description: 'Lion head traditional' },
  { id: 'babban_riga', name: 'Babban Riga', icon: '🥻', description: 'Northern formal robe' }
]

// TODO: Create selection UI with images
// TODO: Add garment-specific options
```

#### Checklist:
- [ ] Create Zod validation schema
- [ ] Implement validation helper functions
- [ ] Build garment type selector component
- [ ] Add Nigerian garment descriptions
- [ ] Create visual selection UI
- [ ] Handle garment-specific requirements

---

### 🕐 1:00-2:30 PM: Nigerian Garment Implementation
**Duration**: 1.5 hours  
**Output**: Complete Nigerian garment support

#### Task 1.5: Implement Garment-Specific Options
```typescript
// File: app/models/orders/garmentSpecifications.ts

export const GARMENT_SPECIFICATIONS = {
  agbada: {
    embroideryStyles: ['simple', 'elaborate', 'royal'],
    defaultMeasurements: ['chest', 'length', 'sleeve', 'shoulder'],
    fabricRequirement: 5.5, // meters
    estimatedDays: 7
  },
  kaftan: {
    neckStyles: ['round', 'v-neck', 'embroidered'],
    length: ['short', 'medium', 'long'],
    fabricRequirement: 4,
    estimatedDays: 5
  },
  senator: {
    styles: ['plain', 'designed', 'stone-work'],
    matching: ['cap', 'shoe', 'walking-stick'],
    fabricRequirement: 3.5,
    estimatedDays: 4
  }
  // TODO: Add specifications for all garments
}
```

#### Task 1.6: Create Measurement Forms by Garment
```typescript
// File: app/components/orders/MeasurementForm.tsx

const getMeasurementFields = (garmentType: string) => {
  switch(garmentType) {
    case 'agbada':
      return ['chest', 'length', 'sleeve', 'shoulder', 'neck', 'armhole']
    case 'kaftan':
      return ['chest', 'length', 'hip', 'shoulder']
    case 'senator':
      return ['chest', 'waist', 'length', 'trouser_length']
    // TODO: Add all garment measurement requirements
  }
}

// TODO: Create dynamic measurement input form
// TODO: Add measurement guide/helper
```

#### Checklist:
- [ ] Define specifications for each garment
- [ ] Create measurement requirements map
- [ ] Build dynamic measurement form
- [ ] Add measurement guide images
- [ ] Implement fabric calculation
- [ ] Add delivery time estimation

---

### 🕐 2:30-4:00 PM: Order Preview Component
**Duration**: 1.5 hours  
**Output**: Complete order preview with summary

#### Task 1.7: Create Order Preview
```typescript
// File: app/components/orders/OrderPreview.tsx

export const OrderPreview = ({ orderData }) => {
  // TODO: Calculate pricing
  const calculatePrice = () => {
    const basePrice = GARMENT_SPECIFICATIONS[orderData.garmentType].basePrice
    const fabricCost = orderData.fabric.pricePerMeter * fabricRequired
    const priorityCharge = PRIORITY_CHARGES[orderData.priority]
    return basePrice + fabricCost + priorityCharge
  }

  // TODO: Create preview sections
  return (
    <ScrollView>
      <GarmentSummary />
      <FabricSummary />
      <MeasurementSummary />
      <PricingSummary />
      <DeliveryInfo />
      <ConfirmButton />
    </ScrollView>
  )
}
```

#### Task 1.8: Add Pricing Logic
```typescript
// File: app/models/orders/pricing.ts

export const PRICING = {
  garments: {
    agbada: { base: 25000, express: 5000, urgent: 10000 },
    kaftan: { base: 18000, express: 3000, urgent: 7000 },
    senator: { base: 15000, express: 3000, urgent: 6000 }
  },
  fabrics: {
    cotton: 3000, // per meter
    lace: 5000,
    ankara: 2500,
    guinea: 4000
  }
}

// TODO: Implement dynamic pricing calculation
// TODO: Add discount logic
// TODO: Include VAT calculation
```

#### Checklist:
- [ ] Build order preview component
- [ ] Implement pricing calculation
- [ ] Create order summary sections
- [ ] Add edit functionality
- [ ] Include terms and conditions
- [ ] Add order confirmation dialog

---

### 🕐 4:00-5:00 PM: Testing & Documentation
**Duration**: 1 hour  
**Output**: Tested code with documentation

#### Task 1.9: Create Test Orders
```typescript
// Manual Testing Checklist:
const testOrders = [
  { type: 'agbada', fabric: 'guinea', priority: 'normal' },
  { type: 'kaftan', fabric: 'lace', priority: 'express' },
  { type: 'senator', fabric: 'cotton', priority: 'urgent' }
]

// TODO: Test each order type
// TODO: Verify validation works
// TODO: Check pricing calculations
// TODO: Test error scenarios
```

#### Task 1.10: Update Documentation
```markdown
// File: docs/order-creation-flow.md

## Order Creation Flow
1. Customer selects garment type
2. Chooses fabric from available options
3. Enters measurements (guided)
4. Selects delivery priority
5. Reviews order preview
6. Confirms and submits order
```

#### Checklist:
- [ ] Test all garment types
- [ ] Verify form validation
- [ ] Test pricing calculations
- [ ] Check error handling
- [ ] Update API documentation
- [ ] Write component documentation
- [ ] Commit code with clear message

---

## 🔧 Technical Implementation Details

### File Structure
```
app/
├── screens/
│   └── orders/
│       ├── OrderCreationScreen.tsx (UPDATE)
│       └── OrderPreview.tsx (CREATE)
├── components/
│   └── orders/
│       ├── GarmentTypeSelector.tsx (CREATE)
│       ├── FabricSelector.tsx (CREATE)
│       ├── MeasurementForm.tsx (CREATE)
│       └── OrderSummary.tsx (CREATE)
├── models/
│   └── orders/
│       ├── garmentSpecifications.ts (CREATE)
│       ├── pricing.ts (CREATE)
│       └── validation.ts (CREATE)
└── services/
    └── orders/
        └── orderService.ts (UPDATE)
```

### Dependencies to Install
```bash
# None required - all dependencies already installed
# Using existing: zod, mobx, react-native
```

### Environment Variables
```env
# Already configured in .env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://appwrite.learnednomad.com/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=tm-saas
EXPO_PUBLIC_APPWRITE_DATABASE_ID=stitch-and-wear-db
```

---

## 📝 Git Commits Plan

### Commit 1 (10:30 AM)
```bash
git add app/screens/orders/OrderCreationScreen.tsx
git commit -m "feat: Connect OrderCreationScreen to OrderStore with form setup"
```

### Commit 2 (12:00 PM)
```bash
git add app/components/orders/GarmentTypeSelector.tsx
git add app/models/orders/validation.ts
git commit -m "feat: Add Nigerian garment selection with form validation"
```

### Commit 3 (2:30 PM)
```bash
git add app/models/orders/garmentSpecifications.ts
git add app/components/orders/MeasurementForm.tsx
git commit -m "feat: Implement garment-specific options and measurements"
```

### Commit 4 (4:00 PM)
```bash
git add app/components/orders/OrderPreview.tsx
git add app/models/orders/pricing.ts
git commit -m "feat: Complete order preview with pricing calculation"
```

### Commit 5 (5:00 PM)
```bash
git add docs/
git commit -m "docs: Update documentation for Day 1 order creation flow"
```

---

## ✅ Day 1 Success Criteria

### Must Complete
- [ ] OrderCreationScreen connected to OrderStore
- [ ] Form validation working
- [ ] All Nigerian garment types selectable
- [ ] Measurement forms dynamic by garment
- [ ] Order preview showing correct data
- [ ] Basic pricing calculation working

### Nice to Have
- [ ] Fabric images displayed
- [ ] Measurement guide tooltips
- [ ] Animation transitions
- [ ] Offline draft saving

### End of Day Checklist
- [ ] All code committed
- [ ] No console errors
- [ ] Form submits successfully
- [ ] Data structure matches schema
- [ ] Documentation updated
- [ ] Ready for Day 2 backend integration

---

## 🚨 Potential Blockers & Solutions

| Potential Issue | Solution |
|----------------|----------|
| Form validation complex | Use existing Zod schemas |
| Garment specs unclear | Use OrderStore existing logic |
| Pricing calculation wrong | Reference existing PRICING constants |
| UI not matching design | Use existing screens as template |
| State management issues | Leverage MobX OrderStore |

---

## 📞 Support & Resources

- **OrderStore Implementation**: `app/models/stores/OrderStore.ts`
- **Existing Screens**: `app/screens/orders/`
- **Database Schema**: All collections ready
- **Authentication**: Working with 4 users
- **API Endpoint**: https://appwrite.learnednomad.com/v1

---

## 🎯 Day 1 Deliverable

By end of Day 1, we should have:
1. ✅ Fully functional order creation form
2. ✅ Nigerian garment types implemented
3. ✅ Dynamic measurement forms
4. ✅ Order preview with pricing
5. ✅ Ready for backend integration (Day 2)

**Next**: Day 2 will focus on connecting this frontend to Appwrite backend and creating orders in the database.