# Appwrite Realtime Implementation Guide

## Overview
Appwrite Realtime enables live updates through WebSocket connections, allowing instant synchronization between users without polling. This guide covers implementation for StitchAndWear's order management system.

## Core Concepts

### 1. Appwrite Realtime Channels
Appwrite uses a channel-based subscription model:
```typescript
// Channel format:
`databases.[databaseId].collections.[collectionId].documents.[documentId]`
```

### 2. Event Types
- `databases.*.collections.*.documents.*.create` - Document created
- `databases.*.collections.*.documents.*.update` - Document updated  
- `databases.*.collections.*.documents.*.delete` - Document deleted

---

## Implementation Strategy

### Phase 1: Basic Setup

#### 1.1 Initialize Realtime Client
```typescript
// app/services/realtime/realtimeClient.ts
import { Client, Databases, Account } from 'appwrite'
import Config from '../../config'

class RealtimeClient {
  private client: Client
  private databases: Databases
  private subscriptions: Map<string, () => void> = new Map()

  constructor() {
    this.client = new Client()
      .setEndpoint(Config.APPWRITE_ENDPOINT)
      .setProject(Config.APPWRITE_PROJECT_ID)
    
    this.databases = new Databases(this.client)
  }

  // Set session for authenticated realtime
  setSession(jwt: string) {
    this.client.setJWT(jwt)
    return this
  }

  // Generic subscription method
  subscribe(channel: string, callback: (payload: any) => void) {
    const unsubscribe = this.client.subscribe(channel, callback)
    this.subscriptions.set(channel, unsubscribe)
    return unsubscribe
  }

  // Unsubscribe from channel
  unsubscribe(channel: string) {
    const unsub = this.subscriptions.get(channel)
    if (unsub) {
      unsub()
      this.subscriptions.delete(channel)
    }
  }

  // Cleanup all subscriptions
  cleanup() {
    this.subscriptions.forEach(unsub => unsub())
    this.subscriptions.clear()
  }
}

export default new RealtimeClient()
```

#### 1.2 Connection Management
```typescript
// app/services/realtime/connectionManager.ts
import NetInfo from '@react-native-community/netinfo'
import realtimeClient from './realtimeClient'

class ConnectionManager {
  private isConnected: boolean = true
  private reconnectTimer: NodeJS.Timeout | null = null
  private subscriptions: Array<{ channel: string; callback: Function }> = []

  init() {
    // Monitor network connectivity
    NetInfo.addEventListener(state => {
      this.handleConnectionChange(state.isConnected)
    })
  }

  private handleConnectionChange(isConnected: boolean) {
    if (isConnected && !this.isConnected) {
      // Reconnected - restore subscriptions
      this.reconnect()
    } else if (!isConnected && this.isConnected) {
      // Disconnected - cleanup
      this.handleDisconnect()
    }
    this.isConnected = isConnected
  }

  private reconnect() {
    console.log('Reconnecting to Appwrite Realtime...')
    
    // Restore all subscriptions
    this.subscriptions.forEach(({ channel, callback }) => {
      realtimeClient.subscribe(channel, callback)
    })
  }

  private handleDisconnect() {
    console.log('Disconnected from Appwrite Realtime')
    realtimeClient.cleanup()
  }

  addSubscription(channel: string, callback: Function) {
    this.subscriptions.push({ channel, callback })
  }

  removeSubscription(channel: string) {
    this.subscriptions = this.subscriptions.filter(s => s.channel !== channel)
  }
}

export default new ConnectionManager()
```

---

### Phase 2: Order-Specific Implementation

#### 2.1 Order Realtime Service
```typescript
// app/services/realtime/orderRealtimeService.ts
import { RealtimeResponseEvent } from 'appwrite'
import realtimeClient from './realtimeClient'
import connectionManager from './connectionManager'
import { useStores } from '../../models'

class OrderRealtimeService {
  private DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID

  // Subscribe to specific order updates
  subscribeToOrder(orderId: string, onUpdate: (data: any) => void) {
    const channel = `databases.${this.DATABASE_ID}.collections.orders.documents.${orderId}`
    
    const callback = (response: RealtimeResponseEvent<any>) => {
      console.log('Order update received:', response)
      
      if (response.events.includes('databases.*.collections.*.documents.*.update')) {
        onUpdate(response.payload)
      }
    }

    connectionManager.addSubscription(channel, callback)
    return realtimeClient.subscribe(channel, callback)
  }

  // Subscribe to all orders for a user (customer view)
  subscribeToUserOrders(userId: string, onUpdate: (data: any) => void) {
    // Subscribe to orders collection with filter
    const channel = `databases.${this.DATABASE_ID}.collections.orders.documents`
    
    const callback = (response: RealtimeResponseEvent<any>) => {
      // Filter for user's orders
      if (response.payload.customerId === userId || response.payload.tailorId === userId) {
        onUpdate(response.payload)
      }
    }

    connectionManager.addSubscription(channel, callback)
    return realtimeClient.subscribe(channel, callback)
  }

  // Subscribe to order messages
  subscribeToOrderMessages(orderId: string, onNewMessage: (message: any) => void) {
    const channel = `databases.${this.DATABASE_ID}.collections.messages.documents`
    
    const callback = (response: RealtimeResponseEvent<any>) => {
      if (response.payload.orderId === orderId && 
          response.events.includes('databases.*.collections.*.documents.*.create')) {
        onNewMessage(response.payload)
      }
    }

    connectionManager.addSubscription(channel, callback)
    return realtimeClient.subscribe(channel, callback)
  }

  // Subscribe to order status changes (for notifications)
  subscribeToStatusChanges(orderId: string, onStatusChange: (status: string) => void) {
    const channel = `databases.${this.DATABASE_ID}.collections.orders.documents.${orderId}`
    
    const callback = (response: RealtimeResponseEvent<any>) => {
      if (response.events.includes('databases.*.collections.*.documents.*.update')) {
        const oldStatus = response.payload.$old?.status
        const newStatus = response.payload.status
        
        if (oldStatus !== newStatus) {
          onStatusChange(newStatus)
        }
      }
    }

    connectionManager.addSubscription(channel, callback)
    return realtimeClient.subscribe(channel, callback)
  }

  // Unsubscribe from all order channels
  unsubscribeAll() {
    realtimeClient.cleanup()
  }
}

export default new OrderRealtimeService()
```

#### 2.2 React Hook for Realtime Orders
```typescript
// app/hooks/useOrderRealtime.ts
import { useEffect, useRef } from 'react'
import { useStores } from '../models'
import orderRealtimeService from '../services/realtime/orderRealtimeService'
import { showNotification } from '../utils/notifications'

export function useOrderRealtime(orderId?: string) {
  const { orderStore, authStore } = useStores()
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!authStore.isAuthenticated) return

    // Subscribe to updates
    if (orderId) {
      // Single order subscription
      unsubscribeRef.current = orderRealtimeService.subscribeToOrder(
        orderId,
        (orderData) => {
          // Update store with new data
          orderStore.updateOrder(orderData)
          
          // Show notification if status changed
          if (orderData.status !== orderStore.getOrderById(orderId)?.status) {
            showNotification({
              title: 'Order Updated',
              body: `Your order #${orderData.orderNumber} status: ${orderData.status}`,
            })
          }
        }
      )
    } else {
      // All user orders subscription
      unsubscribeRef.current = orderRealtimeService.subscribeToUserOrders(
        authStore.userId!,
        (orderData) => {
          orderStore.updateOrder(orderData)
        }
      )
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [orderId, authStore.isAuthenticated])

  return {
    isConnected: true, // Can be enhanced with connection status
  }
}
```

#### 2.3 Integration with MobX Store
```typescript
// app/models/OrderStore.ts
import { types, flow, Instance } from 'mobx-state-tree'
import orderRealtimeService from '../services/realtime/orderRealtimeService'

export const OrderStore = types
  .model('OrderStore', {
    orders: types.array(OrderModel),
    isRealtimeConnected: false,
  })
  .actions(self => ({
    // Update order from realtime event
    updateOrder(orderData: any) {
      const existingOrder = self.orders.find(o => o.id === orderData.$id)
      
      if (existingOrder) {
        // Update existing order
        Object.assign(existingOrder, orderData)
      } else {
        // Add new order
        self.orders.push(OrderModel.create(orderData))
      }
    },

    // Initialize realtime subscriptions
    initRealtime: flow(function* (userId: string) {
      try {
        // Subscribe to user's orders
        orderRealtimeService.subscribeToUserOrders(userId, (data) => {
          self.updateOrder(data)
        })
        
        self.isRealtimeConnected = true
      } catch (error) {
        console.error('Failed to init realtime:', error)
        self.isRealtimeConnected = false
      }
    }),

    // Cleanup realtime
    cleanupRealtime() {
      orderRealtimeService.unsubscribeAll()
      self.isRealtimeConnected = false
    },
  }))
```

---

### Phase 3: UI Integration

#### 3.1 Order List Screen with Realtime
```tsx
// app/screens/orders/OrderListScreen.tsx
import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { FlatList, View } from 'react-native'
import { useStores } from '../../models'
import { useOrderRealtime } from '../../hooks/useOrderRealtime'
import { OrderCard } from '../../components/OrderCard'
import { RealtimeIndicator } from '../../components/RealtimeIndicator'

export const OrderListScreen = observer(() => {
  const { orderStore, authStore } = useStores()
  const { isConnected } = useOrderRealtime() // Subscribe to all orders

  useEffect(() => {
    // Initial fetch
    orderStore.fetchOrders()
    
    // Initialize realtime
    if (authStore.userId) {
      orderStore.initRealtime(authStore.userId)
    }

    return () => {
      // Cleanup realtime on unmount
      orderStore.cleanupRealtime()
    }
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <RealtimeIndicator connected={isConnected} />
      
      <FlatList
        data={orderStore.orders}
        renderItem={({ item }) => (
          <OrderCard 
            order={item}
            onPress={() => navigateToOrderDetail(item.id)}
          />
        )}
        keyExtractor={item => item.id}
      />
    </View>
  )
})
```

#### 3.2 Order Detail with Live Updates
```tsx
// app/screens/orders/OrderDetailScreen.tsx
import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { View, ScrollView } from 'react-native'
import { useStores } from '../../models'
import { useOrderRealtime } from '../../hooks/useOrderRealtime'
import { OrderProgress } from '../../components/OrderProgress'
import { OrderMessages } from '../../components/OrderMessages'

export const OrderDetailScreen = observer(({ route }) => {
  const { orderId } = route.params
  const { orderStore } = useStores()
  const order = orderStore.getOrderById(orderId)
  
  // Subscribe to this specific order
  useOrderRealtime(orderId)

  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = orderRealtimeService.subscribeToOrderMessages(
      orderId,
      (message) => {
        // Update messages in store
        orderStore.addMessage(orderId, message)
        
        // Show notification
        showNotification({
          title: 'New Message',
          body: message.content,
        })
      }
    )

    return () => unsubscribe()
  }, [orderId])

  if (!order) return <LoadingView />

  return (
    <ScrollView>
      <OrderProgress 
        status={order.status}
        progress={order.progressPercentage}
        isLive={true}
      />
      
      <OrderDetails order={order} />
      
      <OrderMessages 
        messages={order.messages}
        orderId={orderId}
      />
    </ScrollView>
  )
})
```

#### 3.3 Realtime Status Indicator Component
```tsx
// app/components/RealtimeIndicator.tsx
import React from 'react'
import { View, Text, Animated } from 'react-native'
import { colors } from '../theme'

interface Props {
  connected: boolean
}

export const RealtimeIndicator: React.FC<Props> = ({ connected }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (connected) {
      // Pulse animation when connected
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [connected])

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: connected ? colors.success : colors.error,
            transform: [{ scale: connected ? pulseAnim : 1 }],
          },
        ]}
      />
      <Text style={styles.text}>
        {connected ? 'Live' : 'Offline'}
      </Text>
    </View>
  )
}
```

---

## Best Practices

### 1. Connection Management
- Always handle reconnection scenarios
- Show connection status to users
- Queue updates when offline

### 2. Performance
- Limit subscriptions to necessary channels
- Unsubscribe when components unmount
- Batch updates to prevent UI thrashing

### 3. Error Handling
```typescript
try {
  const unsubscribe = realtimeClient.subscribe(channel, callback)
} catch (error) {
  console.error('Realtime subscription failed:', error)
  // Fallback to polling
  startPolling()
}
```

### 4. Security
- Validate permissions on channels
- Don't expose sensitive data in realtime events
- Use JWT authentication for private channels

---

## Testing Realtime

### 1. Manual Testing
```bash
# Terminal 1: Start the app
yarn ios

# Terminal 2: Use Appwrite CLI to trigger updates
appwrite databases updateDocument \
  --databaseId "stitch_and_wear_db" \
  --collectionId "orders" \
  --documentId "order123" \
  --data '{"status": "in_progress"}'
```

### 2. Automated Testing
```typescript
// __tests__/realtime.test.ts
import { renderHook } from '@testing-library/react-hooks'
import { useOrderRealtime } from '../app/hooks/useOrderRealtime'

describe('Order Realtime', () => {
  it('should update order on realtime event', async () => {
    const { result } = renderHook(() => useOrderRealtime('order123'))
    
    // Simulate realtime event
    mockRealtimeEvent({
      type: 'update',
      data: { status: 'completed' }
    })
    
    // Verify update
    expect(result.current.order.status).toBe('completed')
  })
})
```

---

## Troubleshooting

### Common Issues

1. **Connection drops frequently**
   - Check network stability
   - Implement exponential backoff for reconnection
   - Monitor WebSocket connection state

2. **Updates not received**
   - Verify channel subscription format
   - Check Appwrite permissions
   - Ensure JWT token is valid

3. **Performance issues**
   - Reduce number of active subscriptions
   - Implement debouncing for rapid updates
   - Use selective updates instead of full document

### Debug Mode
```typescript
// Enable debug logging
if (__DEV__) {
  realtimeClient.enableDebug()
}
```

---

## Migration from Polling

If starting with polling, here's how to migrate:

```typescript
// Before: Polling
useEffect(() => {
  const interval = setInterval(() => {
    fetchOrders()
  }, 5000)
  return () => clearInterval(interval)
}, [])

// After: Realtime
useEffect(() => {
  const unsubscribe = orderRealtimeService.subscribeToUserOrders(
    userId,
    (data) => updateOrder(data)
  )
  return () => unsubscribe()
}, [])
```

---

## Future Enhancements

1. **Optimistic Updates**: Update UI immediately, rollback on failure
2. **Conflict Resolution**: Handle concurrent updates
3. **Presence System**: Show who's viewing/editing an order
4. **Typing Indicators**: Show when someone is typing a message
5. **Read Receipts**: Track message read status