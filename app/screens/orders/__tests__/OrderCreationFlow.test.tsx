/**
 * Order Creation Flow Integration Test
 * Tests the complete order creation workflow from start to submission
 */

import React from "react"
import { render, fireEvent, waitFor } from "@testing-library/react-native"
import { NavigationContainer } from "@react-navigation/native"
import { OrderCreationScreen } from "../OrderCreationScreen"
import { RootStore, RootStoreProvider } from "../../../models"
import { getAppwriteClient } from "../../../services/appwrite/appwrite-client"

// Mock Appwrite
jest.mock("../../../services/appwrite/appwrite-client", () => ({
  getAppwriteClient: jest.fn(() => ({
    databases: {
      createDocument: jest.fn(),
      listDocuments: jest.fn(),
      getDocument: jest.fn(),
      updateDocument: jest.fn(),
    },
    account: {
      get: jest.fn(() =>
        Promise.resolve({
          $id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
        }),
      ),
    },
  })),
}))

// Mock navigation
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
}

describe("Order Creation Flow", () => {
  let rootStore: RootStore

  beforeEach(() => {
    rootStore = RootStore.create({})
    jest.clearAllMocks()
  })

  const renderScreen = () => {
    return render(
      <RootStoreProvider value={rootStore}>
        <NavigationContainer>
          <OrderCreationScreen navigation={mockNavigation} />
        </NavigationContainer>
      </RootStoreProvider>,
    )
  }

  describe("Step 1: Customer Information", () => {
    it("should display customer information form", () => {
      const { getByText, getByPlaceholderText } = renderScreen()

      expect(getByText("Customer Information")).toBeTruthy()
      expect(getByPlaceholderText("First Name")).toBeTruthy()
      expect(getByPlaceholderText("Last Name")).toBeTruthy()
      expect(getByPlaceholderText("Email")).toBeTruthy()
      expect(getByPlaceholderText("Phone")).toBeTruthy()
    })

    it("should validate required fields before proceeding", async () => {
      const { getByText } = renderScreen()
      const nextButton = getByText("Next")

      fireEvent.press(nextButton)

      // Should show error if customer info is not filled
      await waitFor(() => {
        expect(getByText(/Please fill in customer information/i)).toBeTruthy()
      })
    })

    it("should save customer data and proceed to measurements", async () => {
      const { getByPlaceholderText, getByText } = renderScreen()

      // Fill in customer information
      fireEvent.changeText(getByPlaceholderText("First Name"), "John")
      fireEvent.changeText(getByPlaceholderText("Last Name"), "Doe")
      fireEvent.changeText(getByPlaceholderText("Email"), "john@example.com")
      fireEvent.changeText(getByPlaceholderText("Phone"), "+2348012345678")
      fireEvent.changeText(getByPlaceholderText("Address"), "123 Victoria Island")

      // Save and proceed
      const nextButton = getByText("Next")
      fireEvent.press(nextButton)

      await waitFor(() => {
        expect(rootStore.orderStore.orderCreationData?.customerInfo).toMatchObject({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "+2348012345678",
        })
      })
    })
  })

  describe("Step 2: Measurements", () => {
    it("should allow skipping measurements step", async () => {
      const { getByText } = renderScreen()

      // Move to measurements step
      rootStore.orderStore.nextCreationStep()

      await waitFor(() => {
        expect(getByText("Measurements")).toBeTruthy()
      })

      // Should be able to proceed without measurements
      const nextButton = getByText("Next")
      fireEvent.press(nextButton)

      expect(rootStore.orderStore.orderCreationStep).toBe(2)
    })
  })

  describe("Step 3: Fabric Selection", () => {
    it("should display Nigerian fabric options", async () => {
      const { getByText } = renderScreen()

      // Move to fabric selection
      rootStore.orderStore.setOrderCreationStep(2)

      await waitFor(() => {
        expect(getByText("Fabric Selection")).toBeTruthy()
      })

      // Check for Nigerian fabrics
      expect(getByText(/Aso Oke/i)).toBeTruthy()
      expect(getByText(/Ankara/i)).toBeTruthy()
      expect(getByText(/Adire/i)).toBeTruthy()
    })

    it("should calculate fabric cost correctly", async () => {
      const { getByPlaceholderText, getByText } = renderScreen()

      rootStore.orderStore.setOrderCreationStep(2)

      // Set fabric details
      fireEvent.changeText(getByPlaceholderText("3"), "5") // Quantity
      fireEvent.changeText(getByPlaceholderText("5000"), "8000") // Price per meter

      await waitFor(() => {
        expect(getByText("₦40,000")).toBeTruthy() // Total fabric cost
      })
    })
  })

  describe("Step 4: Style Configuration", () => {
    it("should display Nigerian garment types", async () => {
      const { getByText } = renderScreen()

      rootStore.orderStore.setOrderCreationStep(3)

      await waitFor(() => {
        expect(getByText("Style Preferences")).toBeTruthy()
      })

      // Check for Nigerian garments
      expect(getByText("Agbada")).toBeTruthy()
      expect(getByText("Kaftan")).toBeTruthy()
      expect(getByText("Senator")).toBeTruthy()
      expect(getByText("Dashiki")).toBeTruthy()
    })

    it("should show embellishment options for selected garment", async () => {
      const { getByText } = renderScreen()

      rootStore.orderStore.setOrderCreationStep(3)

      // Select Agbada
      fireEvent.press(getByText("Agbada"))

      await waitFor(() => {
        expect(getByText("Simple")).toBeTruthy()
        expect(getByText("Elaborate")).toBeTruthy()
        expect(getByText("Royal")).toBeTruthy()
        expect(getByText("Cap")).toBeTruthy()
        expect(getByText("Shoe")).toBeTruthy()
      })
    })
  })

  describe("Step 5: Pricing", () => {
    it("should calculate pricing with VAT correctly", async () => {
      const { getByText } = renderScreen()

      // Set up order data
      rootStore.orderStore.setOrderStyleConfig({
        garmentType: "agbada",
        basePrice: 25000,
        embroideryStyle: "Elaborate",
        priority: "normal",
      })

      rootStore.orderStore.setOrderFabricSelection({
        totalPrice: 20000,
      })

      rootStore.orderStore.setOrderCreationStep(4)

      await waitFor(() => {
        expect(getByText(/Pricing & Payment/i)).toBeTruthy()
        expect(getByText(/Base Price/i)).toBeTruthy()
        expect(getByText(/₦25,000/i)).toBeTruthy()
        expect(getByText(/VAT \(7\.5%\)/i)).toBeTruthy()
      })
    })

    it("should apply priority charges correctly", async () => {
      const { getByText } = renderScreen()

      rootStore.orderStore.setOrderStyleConfig({
        garmentType: "senator",
        basePrice: 15000,
        priority: "express", // +25%
      })

      rootStore.orderStore.setOrderCreationStep(4)

      await waitFor(() => {
        expect(getByText(/Priority Charge/i)).toBeTruthy()
        expect(getByText(/₦3,750/i)).toBeTruthy() // 25% of 15000
      })
    })
  })

  describe("Step 6: Confirmation & Submission", () => {
    it("should display order summary", async () => {
      const { getByText } = renderScreen()

      // Set complete order data
      rootStore.orderStore.setOrderCustomerInfo({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+2348012345678",
        city: "Lagos",
      })

      rootStore.orderStore.setOrderStyleConfig({
        garmentType: "agbada",
        basePrice: 25000,
      })

      rootStore.orderStore.setOrderCreationStep(5)

      await waitFor(() => {
        expect(getByText("Order Ready!")).toBeTruthy()
        expect(getByText(/John Doe/i)).toBeTruthy()
        expect(getByText(/AGBADA/i)).toBeTruthy()
      })
    })

    it("should submit order to Appwrite", async () => {
      const { getByText } = renderScreen()
      const mockCreateDocument = jest.fn(() =>
        Promise.resolve({
          $id: "order-123",
          orderNumber: "NGR-ABC123",
        }),
      )

      getAppwriteClient().databases.createDocument = mockCreateDocument

      // Set up complete order
      rootStore.orderStore.createNigerianDraftOrder()
      rootStore.orderStore.setOrderCreationStep(5)

      // Submit order
      const submitButton = getByText("Submit Order")
      fireEvent.press(submitButton)

      await waitFor(() => {
        expect(mockCreateDocument).toHaveBeenCalledWith(
          expect.any(String), // Database ID
          "orders", // Collection ID
          expect.any(String), // Document ID
          expect.objectContaining({
            status: "pending",
          }),
        )
      })

      // Should show success message
      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith("orderDetail", {
          orderId: "order-123",
        })
      })
    })

    it("should handle submission errors", async () => {
      const { getByText } = renderScreen()
      const mockCreateDocument = jest.fn(() => Promise.reject(new Error("Network error")))

      getAppwriteClient().databases.createDocument = mockCreateDocument

      rootStore.orderStore.createNigerianDraftOrder()
      rootStore.orderStore.setOrderCreationStep(5)

      const submitButton = getByText("Submit Order")
      fireEvent.press(submitButton)

      await waitFor(() => {
        expect(getByText(/Failed to create order/i)).toBeTruthy()
      })
    })
  })

  describe("Navigation", () => {
    it("should navigate between steps correctly", async () => {
      const { getByText } = renderScreen()

      // Start at step 0
      expect(rootStore.orderStore.orderCreationStep).toBe(0)

      // Fill customer info and go next
      rootStore.orderStore.setOrderCustomerInfo({
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        phone: "+2348012345678",
      })

      fireEvent.press(getByText("Next"))
      await waitFor(() => {
        expect(rootStore.orderStore.orderCreationStep).toBe(1)
      })

      // Go back
      fireEvent.press(getByText("Previous"))
      await waitFor(() => {
        expect(rootStore.orderStore.orderCreationStep).toBe(0)
      })
    })

    it("should disable Previous button on first step", () => {
      const { getByText } = renderScreen()
      const previousButton = getByText("Previous")

      expect(previousButton.props.disabled).toBe(true)
    })

    it("should show Submit Order on last step", async () => {
      const { getByText } = renderScreen()

      rootStore.orderStore.setOrderCreationStep(5)

      await waitFor(() => {
        expect(getByText("Submit Order")).toBeTruthy()
      })
    })
  })
})
