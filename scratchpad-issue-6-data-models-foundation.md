# Scratchpad: Issue #6 - Core Data Models Foundation

**Issue Link:** https://github.com/learnednomad/StitchAndWearTailors/issues/6

## Problem Analysis

This is a CRITICAL priority issue to establish the data foundation for the Stitch & Wear Tailors app. Currently, the project only has an empty MobX State Tree RootStore with no data models defined. The issue requires implementing TypeScript interfaces and Zod validation schemas for 9 core business entities.

## Current State Assessment

- **Project Type:** React Native with Expo, using MobX State Tree for state management
- **Current Models:** Only an empty `RootStore.ts` exists
- **Dependencies Missing:** Zod is not installed for validation
- **Architecture:** Uses MobX State Tree (MST) pattern

## Technical Approach

Given the project uses MobX State Tree, I need to decide on the architecture pattern:

1. **Option A (Recommended):** Hybrid approach - Use TypeScript interfaces + Zod for data contracts and validation, integrate with MST models
2. **Option B:** Pure MST with runtime validation
3. **Option C:** Replace MST with pure TypeScript + Zod

**Decision:** Going with Option A to maintain existing MST architecture while adding robust type safety and validation.

## Core Data Models Required

### 1. User Model
- **Purpose:** Authentication, roles (client/tailor), profile data
- **Key Fields:** id, email, role, profile, preferences, createdAt, updatedAt
- **Validation:** Email format, required fields, role enum

### 2. Order Model  
- **Purpose:** Order lifecycle, status tracking, progress management
- **Key Fields:** id, clientId, tailorId, status, items, measurements, timeline, pricing
- **Validation:** Status transitions, required measurements, pricing constraints

### 3. Measurement Model
- **Purpose:** Body measurements, measurement history, validation rules
- **Key Fields:** id, clientId, measurements, date, notes, validatedBy
- **Validation:** Measurement ranges, required measurements per garment type

### 4. Fabric Model
- **Purpose:** Catalog items, inventory management, pricing
- **Key Fields:** id, name, category, material, price, stock, images, properties
- **Validation:** Price ranges, stock levels, category enums

### 5. Style Model
- **Purpose:** Garment templates, complexity levels, requirements
- **Key Fields:** id, name, category, complexity, requirements, basePrice, images
- **Validation:** Complexity levels, requirement constraints

### 6. Appointment Model
- **Purpose:** Scheduling, availability, reminders
- **Key Fields:** id, clientId, tailorId, dateTime, type, status, notes
- **Validation:** Date ranges, availability conflicts, status transitions

### 7. Invoice Model
- **Purpose:** Billing, payments, tax calculations
- **Key Fields:** id, orderId, amount, tax, discounts, status, dueDate, paidAt
- **Validation:** Amount calculations, tax rates, payment status

### 8. Notification Model
- **Purpose:** Push notifications, user preferences
- **Key Fields:** id, userId, type, title, message, read, createdAt
- **Validation:** Message length, notification types

### 9. Feedback Model
- **Purpose:** Reviews, ratings, responses
- **Key Fields:** id, orderId, rating, comment, response, createdAt
- **Validation:** Rating ranges, comment length

## Implementation Plan

### Phase 1: Foundation Setup
1. Install Zod dependency
2. Create base model structure
3. Set up utility functions

### Phase 2: Core Models Implementation
1. Create TypeScript interfaces for all 9 models
2. Implement Zod validation schemas
3. Create data transformation utilities
4. Add serialization/deserialization helpers

### Phase 3: Integration & Testing
1. Integrate with existing MobX State Tree
2. Create mock data generators
3. Write comprehensive tests
4. Update RootStore to include new models

### Phase 4: Documentation & Validation
1. Add JSDoc comments
2. Create usage examples
3. Validate all error handling
4. Test data transformations

## File Structure Plan

```
app/models/
├── types/
│   ├── User.ts
│   ├── Order.ts
│   ├── Measurement.ts
│   ├── Fabric.ts
│   ├── Style.ts
│   ├── Appointment.ts
│   ├── Invoice.ts
│   ├── Notification.ts
│   ├── Feedback.ts
│   └── index.ts
├── schemas/
│   ├── UserSchema.ts
│   ├── OrderSchema.ts
│   ├── MeasurementSchema.ts
│   ├── FabricSchema.ts
│   ├── StyleSchema.ts
│   ├── AppointmentSchema.ts
│   ├── InvoiceSchema.ts
│   ├── NotificationSchema.ts
│   ├── FeedbackSchema.ts
│   └── index.ts
├── utils/
│   ├── transformers.ts
│   ├── serializers.ts
│   ├── validators.ts
│   └── mockData.ts
├── mst/
│   ├── UserStore.ts
│   ├── OrderStore.ts
│   └── ... (MST model implementations)
├── RootStore.ts (updated)
└── index.ts (updated)
```

## Success Criteria Validation

- [ ] All 9 TypeScript interfaces created with comprehensive typing
- [ ] All 9 Zod validation schemas implemented with proper error handling
- [ ] Data transformation utilities for serialization/deserialization
- [ ] Mock data generators for testing
- [ ] Integration with existing MobX State Tree architecture
- [ ] Comprehensive test coverage
- [ ] Proper error handling for invalid data
- [ ] Type safety throughout the application

## Risk Mitigation

1. **Breaking Changes:** Ensure backward compatibility with existing code
2. **Performance:** Keep validation schemas lightweight
3. **Complexity:** Start with essential fields, expand iteratively
4. **Integration:** Test MST integration thoroughly

## Timeline Estimate

- **Setup & Dependencies:** 30 minutes
- **Core Models (TypeScript):** 2 hours
- **Validation Schemas (Zod):** 2 hours  
- **Utilities & Helpers:** 1 hour
- **MST Integration:** 1 hour
- **Testing & Documentation:** 1.5 hours
- **Total:** ~8 hours

## Next Steps

1. Create new branch: `feature/core-data-models-foundation`
2. Install Zod dependency
3. Begin with User and Order models (highest priority)
4. Implement remaining models incrementally
5. Test thoroughly before opening PR

---

**Created:** 2025-06-30
**Issue:** #6 - PRIORITY: As a developer, I want to set up core data models so that the app has a solid foundation for data management
**Status:** Planning Complete, Ready for Implementation