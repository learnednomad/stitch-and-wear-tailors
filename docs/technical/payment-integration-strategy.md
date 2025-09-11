# Multi-Provider Payment Integration Strategy

## Overview
StitchAndWear requires a flexible payment system supporting multiple providers to serve different geographical markets. This document outlines the integration strategy for Stripe (international), Paystack (Africa), and Flutterwave (Nigeria focus).

## Payment Provider Matrix

| Provider | Primary Markets | Payment Methods | Key Features |
|----------|----------------|-----------------|--------------|
| **Stripe** | US, EU, Asia | Cards, Apple Pay, Google Pay, Bank transfers | Global reach, excellent docs, PCI compliant |
| **Paystack** | Nigeria, Ghana, South Africa | Cards, Bank transfers, USSD, Mobile Money | Local payment methods, NGN optimization |
| **Flutterwave** | Nigeria, Africa | Cards, Bank transfers, Mobile Money, USSD, Barter | Widest African coverage, multi-currency |

---

## Architecture Design

### Payment Abstraction Layer

```typescript
// app/services/payment/PaymentProvider.ts
export interface PaymentProvider {
  name: string
  initialize(config: PaymentConfig): Promise<void>
  createPaymentIntent(amount: number, currency: string): Promise<PaymentIntent>
  processPayment(paymentData: PaymentData): Promise<PaymentResult>
  verifyPayment(reference: string): Promise<VerificationResult>
  refundPayment(transactionId: string, amount?: number): Promise<RefundResult>
  getTransactionStatus(transactionId: string): Promise<TransactionStatus>
}

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  clientSecret?: string
  reference: string
  provider: string
}

export interface PaymentResult {
  success: boolean
  transactionId: string
  reference: string
  amount: number
  currency: string
  message?: string
  metadata?: Record<string, any>
}
```

### Provider Factory Pattern

```typescript
// app/services/payment/PaymentProviderFactory.ts
import { StripeProvider } from './providers/StripeProvider'
import { PaystackProvider } from './providers/PaystackProvider'
import { FlutterwaveProvider } from './providers/FlutterwaveProvider'

export class PaymentProviderFactory {
  private static providers = new Map<string, PaymentProvider>()

  static initialize() {
    // Initialize all providers
    this.providers.set('stripe', new StripeProvider())
    this.providers.set('paystack', new PaystackProvider())
    this.providers.set('flutterwave', new FlutterwaveProvider())
  }

  static getProvider(location: string, currency: string): PaymentProvider {
    // Provider selection logic
    if (currency === 'NGN') {
      // Nigerian Naira - prefer local providers
      return this.providers.get('paystack')!
    } else if (location === 'NG' || location.startsWith('AF')) {
      // African countries
      return this.providers.get('flutterwave')!
    } else {
      // International
      return this.providers.get('stripe')!
    }
  }

  static getProviderByName(name: string): PaymentProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Payment provider ${name} not found`)
    }
    return provider
  }
}
```

---

## Provider Implementations

### 1. Stripe Integration

```typescript
// app/services/payment/providers/StripeProvider.ts
import { StripeProvider as StripeSDK } from '@stripe/stripe-react-native'
import Config from '../../../config'

export class StripeProvider implements PaymentProvider {
  name = 'stripe'
  private publishableKey = Config.STRIPE_PUBLISHABLE_KEY
  private secretKey = Config.STRIPE_SECRET_KEY // Server-side only

  async initialize(config: PaymentConfig) {
    await StripeSDK.initialize({
      publishableKey: this.publishableKey,
      merchantIdentifier: 'merchant.com.stitchandwear',
      androidPayMode: 'test', // Change to 'production' for live
    })
  }

  async createPaymentIntent(amount: number, currency: string) {
    // Call your backend to create payment intent
    const response = await api.post('/payments/stripe/intent', {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
    })

    return {
      id: response.data.id,
      amount,
      currency,
      clientSecret: response.data.client_secret,
      reference: response.data.id,
      provider: this.name,
    }
  }

  async processPayment(paymentData: PaymentData) {
    const { confirmPayment } = await StripeSDK.confirmPayment(
      paymentData.clientSecret,
      {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            email: paymentData.email,
            name: paymentData.customerName,
          },
        },
      }
    )

    if (confirmPayment.error) {
      return {
        success: false,
        transactionId: '',
        reference: '',
        amount: paymentData.amount,
        currency: paymentData.currency,
        message: confirmPayment.error.message,
      }
    }

    return {
      success: true,
      transactionId: confirmPayment.paymentIntent.id,
      reference: confirmPayment.paymentIntent.id,
      amount: paymentData.amount,
      currency: paymentData.currency,
    }
  }

  async verifyPayment(reference: string) {
    // Verify with backend
    const response = await api.get(`/payments/stripe/verify/${reference}`)
    return response.data
  }

  async refundPayment(transactionId: string, amount?: number) {
    const response = await api.post('/payments/stripe/refund', {
      transactionId,
      amount,
    })
    return response.data
  }
}
```

### 2. Paystack Integration

```typescript
// app/services/payment/providers/PaystackProvider.ts
import RNPaystack from 'react-native-paystack-webview'
import Config from '../../../config'

export class PaystackProvider implements PaymentProvider {
  name = 'paystack'
  private publicKey = Config.PAYSTACK_PUBLIC_KEY
  private secretKey = Config.PAYSTACK_SECRET_KEY // Server-side only

  async initialize(config: PaymentConfig) {
    // Paystack doesn't require initialization
    return Promise.resolve()
  }

  async createPaymentIntent(amount: number, currency: string) {
    // Generate reference
    const reference = `STW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id: reference,
      amount,
      currency,
      reference,
      provider: this.name,
    }
  }

  async processPayment(paymentData: PaymentData) {
    return new Promise((resolve) => {
      RNPaystack.PayWithCard({
        cardNumber: paymentData.cardNumber,
        expiryMonth: paymentData.expiryMonth,
        expiryYear: paymentData.expiryYear,
        cvc: paymentData.cvc,
        email: paymentData.email,
        amountInKobo: paymentData.amount * 100, // Convert to kobo
        publicKey: this.publicKey,
        currency: 'NGN',
        reference: paymentData.reference,
        firstName: paymentData.firstName,
        lastName: paymentData.lastName,
        onSuccess: (response) => {
          resolve({
            success: true,
            transactionId: response.reference,
            reference: response.reference,
            amount: paymentData.amount,
            currency: 'NGN',
            metadata: response,
          })
        },
        onCancel: () => {
          resolve({
            success: false,
            transactionId: '',
            reference: paymentData.reference,
            amount: paymentData.amount,
            currency: 'NGN',
            message: 'Payment cancelled by user',
          })
        },
        onError: (error) => {
          resolve({
            success: false,
            transactionId: '',
            reference: paymentData.reference,
            amount: paymentData.amount,
            currency: 'NGN',
            message: error.message,
          })
        },
      })
    })
  }

  async verifyPayment(reference: string) {
    // Verify with Paystack API (backend)
    const response = await api.get(`/payments/paystack/verify/${reference}`)
    return response.data
  }

  async refundPayment(transactionId: string, amount?: number) {
    const response = await api.post('/payments/paystack/refund', {
      transactionId,
      amount,
    })
    return response.data
  }
}
```

### 3. Flutterwave Integration

```typescript
// app/services/payment/providers/FlutterwaveProvider.ts
import FlutterwaveInit from 'flutterwave-react-native'
import Config from '../../../config'

export class FlutterwaveProvider implements PaymentProvider {
  name = 'flutterwave'
  private publicKey = Config.FLUTTERWAVE_PUBLIC_KEY
  private secretKey = Config.FLUTTERWAVE_SECRET_KEY // Server-side only

  async initialize(config: PaymentConfig) {
    // Flutterwave doesn't require initialization
    return Promise.resolve()
  }

  async createPaymentIntent(amount: number, currency: string) {
    const reference = `STW-FW-${Date.now()}`
    
    return {
      id: reference,
      amount,
      currency,
      reference,
      provider: this.name,
    }
  }

  async processPayment(paymentData: PaymentData) {
    try {
      const payment = await FlutterwaveInit({
        tx_ref: paymentData.reference,
        authorization: this.publicKey,
        amount: paymentData.amount,
        currency: paymentData.currency,
        payment_options: 'card, banktransfer, ussd',
        customer: {
          email: paymentData.email,
          name: paymentData.customerName,
          phonenumber: paymentData.phone,
        },
        customizations: {
          title: 'StitchAndWear Payment',
          description: `Payment for Order ${paymentData.orderId}`,
          logo: 'https://stitchandwear.com/logo.png',
        },
      })

      if (payment.status === 'successful') {
        return {
          success: true,
          transactionId: payment.transaction_id,
          reference: payment.tx_ref,
          amount: paymentData.amount,
          currency: paymentData.currency,
          metadata: payment,
        }
      } else {
        return {
          success: false,
          transactionId: '',
          reference: paymentData.reference,
          amount: paymentData.amount,
          currency: paymentData.currency,
          message: 'Payment failed',
        }
      }
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        reference: paymentData.reference,
        amount: paymentData.amount,
        currency: paymentData.currency,
        message: error.message,
      }
    }
  }

  async verifyPayment(reference: string) {
    const response = await api.get(`/payments/flutterwave/verify/${reference}`)
    return response.data
  }

  async refundPayment(transactionId: string, amount?: number) {
    const response = await api.post('/payments/flutterwave/refund', {
      transactionId,
      amount,
    })
    return response.data
  }
}
```

---

## Unified Payment Service

```typescript
// app/services/payment/PaymentService.ts
import { PaymentProviderFactory } from './PaymentProviderFactory'
import { useStores } from '../../models'
import AsyncStorage from '@react-native-async-storage/async-storage'

export class PaymentService {
  private currentProvider: PaymentProvider | null = null

  async initialize() {
    PaymentProviderFactory.initialize()
  }

  async processOrderPayment(order: Order, paymentMethod: PaymentMethod) {
    const { userStore } = useStores()
    
    // Determine provider based on user location and currency
    const provider = this.selectProvider(
      userStore.location,
      order.currency,
      paymentMethod
    )
    
    // Create payment intent
    const intent = await provider.createPaymentIntent(
      order.totalAmount,
      order.currency
    )
    
    // Process payment
    const result = await provider.processPayment({
      ...intent,
      email: userStore.email,
      customerName: userStore.fullName,
      phone: userStore.phone,
      orderId: order.id,
      cardNumber: paymentMethod.cardNumber,
      expiryMonth: paymentMethod.expiryMonth,
      expiryYear: paymentMethod.expiryYear,
      cvc: paymentMethod.cvc,
    })
    
    // Save payment record
    if (result.success) {
      await this.savePaymentRecord(order.id, result)
      
      // Update order status
      await orderStore.updateOrderPaymentStatus(order.id, 'paid')
    }
    
    return result
  }

  private selectProvider(location: string, currency: string, method: PaymentMethod) {
    // Allow user preference override
    const preferredProvider = AsyncStorage.getItem('preferredPaymentProvider')
    if (preferredProvider) {
      return PaymentProviderFactory.getProviderByName(preferredProvider)
    }
    
    // Auto-select based on location and currency
    return PaymentProviderFactory.getProvider(location, currency)
  }

  private async savePaymentRecord(orderId: string, result: PaymentResult) {
    // Save to Appwrite
    await databases.createDocument(
      DATABASE_ID,
      'payments',
      ID.unique(),
      {
        orderId,
        provider: result.provider,
        transactionId: result.transactionId,
        reference: result.reference,
        amount: result.amount,
        currency: result.currency,
        status: 'success',
        metadata: JSON.stringify(result.metadata),
        createdAt: new Date().toISOString(),
      }
    )
  }
}

export default new PaymentService()
```

---

## Payment UI Components

### Payment Method Selector

```tsx
// app/components/payment/PaymentMethodSelector.tsx
import React, { useState } from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import { RadioButton } from '../common/RadioButton'

export const PaymentMethodSelector = ({ onSelect, currency }) => {
  const [selected, setSelected] = useState('auto')
  
  const availableProviders = getAvailableProviders(currency)
  
  return (
    <View>
      <Text style={styles.title}>Select Payment Method</Text>
      
      <TouchableOpacity
        style={styles.option}
        onPress={() => {
          setSelected('auto')
          onSelect('auto')
        }}
      >
        <RadioButton selected={selected === 'auto'} />
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Recommended</Text>
          <Text style={styles.optionSubtitle}>
            We'll choose the best payment method for you
          </Text>
        </View>
      </TouchableOpacity>
      
      {availableProviders.map(provider => (
        <TouchableOpacity
          key={provider.id}
          style={styles.option}
          onPress={() => {
            setSelected(provider.id)
            onSelect(provider.id)
          }}
        >
          <RadioButton selected={selected === provider.id} />
          <View style={styles.optionContent}>
            <Image source={provider.logo} style={styles.logo} />
            <Text style={styles.optionTitle}>{provider.name}</Text>
            <Text style={styles.optionSubtitle}>{provider.methods}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function getAvailableProviders(currency: string) {
  if (currency === 'NGN') {
    return [
      {
        id: 'paystack',
        name: 'Paystack',
        logo: require('../../assets/paystack-logo.png'),
        methods: 'Cards, Bank Transfer, USSD',
      },
      {
        id: 'flutterwave',
        name: 'Flutterwave',
        logo: require('../../assets/flutterwave-logo.png'),
        methods: 'Cards, Bank Transfer, Mobile Money',
      },
    ]
  }
  
  return [
    {
      id: 'stripe',
      name: 'Stripe',
      logo: require('../../assets/stripe-logo.png'),
      methods: 'Cards, Apple Pay, Google Pay',
    },
  ]
}
```

### Payment Processing Screen

```tsx
// app/screens/payment/PaymentScreen.tsx
import React, { useState } from 'react'
import { View, ScrollView, Alert } from 'react-native'
import { observer } from 'mobx-react-lite'
import { useStores } from '../../models'
import { PaymentMethodSelector } from '../../components/payment/PaymentMethodSelector'
import { CardInput } from '../../components/payment/CardInput'
import { Button } from '../../components/common/Button'
import paymentService from '../../services/payment/PaymentService'

export const PaymentScreen = observer(({ route, navigation }) => {
  const { orderId } = route.params
  const { orderStore } = useStores()
  const order = orderStore.getOrderById(orderId)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('auto')
  const [cardDetails, setCardDetails] = useState({})

  const handlePayment = async () => {
    setIsProcessing(true)
    
    try {
      const result = await paymentService.processOrderPayment(
        order,
        {
          ...cardDetails,
          provider: paymentMethod,
        }
      )
      
      if (result.success) {
        Alert.alert(
          'Payment Successful',
          'Your payment has been processed successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('OrderDetail', { orderId }),
            },
          ]
        )
      } else {
        Alert.alert('Payment Failed', result.message || 'Please try again')
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred processing your payment')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <OrderSummary order={order} />
      
      <PaymentMethodSelector
        currency={order.currency}
        onSelect={setPaymentMethod}
      />
      
      <CardInput
        onCardChange={setCardDetails}
        provider={paymentMethod}
      />
      
      <Button
        title={`Pay ${order.currency} ${order.totalAmount}`}
        onPress={handlePayment}
        loading={isProcessing}
        disabled={!cardDetails.complete}
      />
    </ScrollView>
  )
})
```

---

## Backend Integration (Appwrite Functions)

### Payment Webhook Handler

```javascript
// appwrite-functions/payment-webhook/index.js
const sdk = require('node-appwrite')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const axios = require('axios')

module.exports = async function(req, res) {
  const { provider, event } = req.body
  
  let paymentData
  
  switch(provider) {
    case 'stripe':
      paymentData = await handleStripeWebhook(req.body)
      break
    case 'paystack':
      paymentData = await handlePaystackWebhook(req.body)
      break
    case 'flutterwave':
      paymentData = await handleFlutterwaveWebhook(req.body)
      break
  }
  
  // Update payment record in database
  if (paymentData) {
    await updatePaymentStatus(paymentData)
    await updateOrderStatus(paymentData.orderId, paymentData.status)
    await sendPaymentNotification(paymentData)
  }
  
  res.json({ success: true })
}

async function handleStripeWebhook(data) {
  // Verify webhook signature
  const sig = req.headers['stripe-signature']
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  )
  
  if (event.type === 'payment_intent.succeeded') {
    return {
      transactionId: event.data.object.id,
      orderId: event.data.object.metadata.orderId,
      status: 'success',
      amount: event.data.object.amount / 100,
    }
  }
}

async function handlePaystackWebhook(data) {
  // Verify with Paystack
  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${data.reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  )
  
  if (response.data.data.status === 'success') {
    return {
      transactionId: response.data.data.reference,
      orderId: response.data.data.metadata.orderId,
      status: 'success',
      amount: response.data.data.amount / 100,
    }
  }
}
```

---

## Security Considerations

### 1. PCI Compliance
- Never store card details in your database
- Use provider tokenization
- Implement proper SSL/TLS

### 2. API Key Management
```typescript
// config/payment.config.ts
export const PaymentConfig = {
  stripe: {
    publicKey: process.env.EXPO_PUBLIC_STRIPE_KEY,
    // Secret key only on backend
  },
  paystack: {
    publicKey: process.env.EXPO_PUBLIC_PAYSTACK_KEY,
  },
  flutterwave: {
    publicKey: process.env.EXPO_PUBLIC_FLUTTERWAVE_KEY,
  },
}
```

### 3. Transaction Verification
Always verify payments server-side before fulfilling orders:

```typescript
// Always verify before marking order as paid
const verified = await paymentService.verifyPayment(reference)
if (verified.status === 'success') {
  await orderStore.markAsPaid(orderId)
}
```

---

## Testing

### Test Cards

**Stripe Test Cards:**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002

**Paystack Test Cards:**
- Success: 5060 6666 6666 6666 44
- PIN Required: 5060 6666 6666 6666 60

**Flutterwave Test Cards:**
- Success: 5531 8866 5214 2950
- Failed: 5143 0105 2233 9965

### Integration Tests

```typescript
// __tests__/payment.test.ts
describe('Payment Integration', () => {
  it('should select correct provider for NGN', () => {
    const provider = PaymentProviderFactory.getProvider('NG', 'NGN')
    expect(provider.name).toBe('paystack')
  })
  
  it('should process payment successfully', async () => {
    const result = await paymentService.processOrderPayment(
      mockOrder,
      mockPaymentMethod
    )
    expect(result.success).toBe(true)
  })
})
```

---

## Monitoring & Analytics

Track payment metrics:
- Success rate by provider
- Average processing time
- Failed payment reasons
- Geographic distribution
- Payment method preferences

```typescript
// Track payment events
Analytics.track('Payment Initiated', {
  provider: provider.name,
  amount: order.totalAmount,
  currency: order.currency,
})

Analytics.track('Payment Completed', {
  provider: provider.name,
  success: result.success,
  duration: endTime - startTime,
})
```

---

## Future Enhancements

1. **Saved Cards**: Tokenize and save cards for repeat customers
2. **Subscription Payments**: Recurring payments for premium services
3. **Split Payments**: Allow partial payments
4. **Cryptocurrency**: Accept crypto payments
5. **Buy Now Pay Later**: Integrate with BNPL providers
6. **QR Code Payments**: Support for QR-based payments