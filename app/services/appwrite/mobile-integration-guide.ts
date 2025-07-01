/**
 * Mobile App Integration Guide
 * 
 * This file provides examples of how to connect the mobile app screens
 * to the Appwrite database using the existing collection helpers.
 */

import { getAppwriteAuthAdapter, getAppwriteServiceBridge } from './index'
import { collections } from './collection-helpers'
import { Query } from 'appwrite'

// ==========================================
// AUTHENTICATION EXAMPLES
// ==========================================

/**
 * Login implementation for SignInScreen
 */
export async function loginUser(email: string, password: string) {
  const authAdapter = getAppwriteAuthAdapter()
  
  try {
    const result = await authAdapter.login(email, password)
    if (result.success && result.data) {
      // Store session data
      // Navigate to appropriate screen based on role
      const userRole = result.data.user.prefs?.role || 'client'
      return {
        success: true,
        role: userRole,
        user: result.data.user
      }
    }
    return result
  } catch (error) {
    return {
      success: false,
      error: 'Login failed'
    }
  }
}

/**
 * Register implementation for SignUpScreen
 */
export async function registerUser(
  email: string, 
  password: string, 
  name: string,
  role: 'client' | 'tailor'
) {
  const authAdapter = getAppwriteAuthAdapter()
  
  try {
    const result = await authAdapter.register(email, password, name)
    if (result.success && result.data) {
      // Create user profile in database
      await collections.users.create({
        email,
        role,
        profile: JSON.stringify({ name })
      })
      return result
    }
    return result
  } catch (error) {
    return {
      success: false,
      error: 'Registration failed'
    }
  }
}

// ==========================================
// HOME SCREEN DATA FETCHING
// ==========================================

/**
 * Fetch data for HomeScreen
 */
export async function getHomeScreenData(userId: string) {
  try {
    // Fetch user's recent orders
    const ordersResult = await collections.orders.list({
      queries: [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(5)
      ]
    })

    // Fetch user's measurements
    const measurementsResult = await collections.measurements.list({
      queries: [
        Query.equal('clientId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(3)
      ]
    })

    // Fetch notifications count
    const notificationsResult = await collections.notifications.list({
      queries: [
        Query.equal('userId', userId),
        Query.equal('isRead', false),
        Query.limit(10)
      ]
    })

    return {
      success: true,
      data: {
        orders: ordersResult.data?.documents || [],
        measurements: measurementsResult.data?.documents || [],
        unreadNotifications: notificationsResult.data?.total || 0
      }
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch home screen data'
    }
  }
}

// ==========================================
// ORDER MANAGEMENT
// ==========================================

/**
 * Create a new order
 */
export async function createOrder(orderData: {
  userId: string
  style: 'agbada' | 'kaftan' | 'plain_kaftan' | 'senator' | 'traditional' | 'modern' | 'custom'
  fabric?: string
  measurements?: any
  notes?: string
  deliveryDate: string
}) {
  try {
    // Generate order number
    const orderNumber = `ORD-${Date.now()}`
    
    // Create the order
    const result = await collections.orders.create({
      orderNumber,
      userId: orderData.userId,
      type: 'custom',
      status: 'pending',
      priority: 'normal',
      totalAmount: 0, // To be calculated
      currency: 'NGN',
      style: orderData.style,
      notes: orderData.notes,
      dueDate: orderData.deliveryDate
    })

    if (result.success && result.data) {
      // Create initial order stage
      await collections.order_stages?.create({
        orderId: result.data.$id,
        stage: 'received',
        status: 'completed',
        completedAt: new Date().toISOString()
      })
    }

    return result
  } catch (error) {
    return {
      success: false,
      error: 'Failed to create order'
    }
  }
}

/**
 * Track order status
 */
export async function getOrderTracking(orderId: string) {
  try {
    // Get order details
    const orderResult = await collections.orders.get(orderId)
    
    // Get order stages
    const stagesResult = await collections.order_stages?.list({
      queries: [
        Query.equal('orderId', orderId),
        Query.orderAsc('$createdAt')
      ]
    })

    return {
      success: true,
      data: {
        order: orderResult.data,
        stages: stagesResult?.data?.documents || []
      }
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch order tracking'
    }
  }
}

// ==========================================
// MEASUREMENTS
// ==========================================

/**
 * Save new measurements
 */
export async function saveMeasurements(measurementData: {
  clientId: string
  garmentType: string
  name: string
  measurements: any
  unit: 'cm' | 'inches'
  notes?: string
}) {
  try {
    const result = await collections.measurements.create({
      ...measurementData,
      measurements: JSON.stringify(measurementData.measurements)
    })
    
    return result
  } catch (error) {
    return {
      success: false,
      error: 'Failed to save measurements'
    }
  }
}

// ==========================================
// FABRICS
// ==========================================

/**
 * Search fabrics catalog
 */
export async function searchFabrics(params: {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
}) {
  try {
    const queries = [Query.equal('isActive', true)]
    
    if (params.search) {
      queries.push(Query.search('name', params.search))
    }
    
    if (params.category) {
      queries.push(Query.equal('category', params.category))
    }
    
    if (params.minPrice) {
      queries.push(Query.greaterThanEqual('pricePerMeter', params.minPrice))
    }
    
    if (params.maxPrice) {
      queries.push(Query.lessThanEqual('pricePerMeter', params.maxPrice))
    }
    
    const result = await collections.fabrics.list({ queries })
    
    return result
  } catch (error) {
    return {
      success: false,
      error: 'Failed to search fabrics'
    }
  }
}

// ==========================================
// APPOINTMENTS
// ==========================================

/**
 * Book an appointment
 */
export async function bookAppointment(appointmentData: {
  clientId: string
  tailorId: string
  type: string
  scheduledDate: string
  duration: number
  title: string
  description?: string
}) {
  try {
    const result = await collections.appointments.create({
      ...appointmentData,
      status: 'scheduled'
    })
    
    // Create notification for the appointment
    if (result.success && result.data) {
      await collections.notifications.create({
        userId: appointmentData.clientId,
        type: 'appointment_reminder',
        priority: 'medium',
        title: 'Appointment Scheduled',
        body: `Your ${appointmentData.type} appointment is scheduled for ${appointmentData.scheduledDate}`,
        actionUrl: `/appointments/${result.data.$id}`
      })
    }
    
    return result
  } catch (error) {
    return {
      success: false,
      error: 'Failed to book appointment'
    }
  }
}

// ==========================================
// USAGE IN SCREENS
// ==========================================

/**
 * Example: HomeScreen.tsx
 * 
 * import { getHomeScreenData } from '@/services/appwrite/mobile-integration-guide'
 * 
 * const HomeScreen = () => {
 *   const [data, setData] = useState(null)
 *   const [loading, setLoading] = useState(true)
 *   
 *   useEffect(() => {
 *     loadData()
 *   }, [])
 *   
 *   const loadData = async () => {
 *     setLoading(true)
 *     const result = await getHomeScreenData(currentUser.id)
 *     if (result.success) {
 *       setData(result.data)
 *     }
 *     setLoading(false)
 *   }
 *   
 *   if (loading) return <LoadingScreen />
 *   
 *   return (
 *     <Screen>
 *       {data?.orders.map(order => (
 *         <OrderCard key={order.$id} order={order} />
 *       ))}
 *     </Screen>
 *   )
 * }
 */

/**
 * Example: SignInScreen.tsx
 * 
 * import { loginUser } from '@/services/appwrite/mobile-integration-guide'
 * 
 * const SignInScreen = () => {
 *   const [email, setEmail] = useState('')
 *   const [password, setPassword] = useState('')
 *   
 *   const handleLogin = async () => {
 *     const result = await loginUser(email, password)
 *     if (result.success) {
 *       if (result.role === 'client') {
 *         navigation.navigate('ClientTab')
 *       } else if (result.role === 'tailor') {
 *         navigation.navigate('TailorTab')
 *       }
 *     } else {
 *       showError(result.error)
 *     }
 *   }
 * }
 */