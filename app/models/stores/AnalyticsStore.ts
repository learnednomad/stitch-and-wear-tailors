/**
 * AnalyticsStore - Business Analytics and Reporting for Nigerian Luxury Tailors
 * Provides comprehensive analytics, insights, and reporting capabilities
 */

import { types, flow, Instance, SnapshotOut } from "mobx-state-tree"
import { createAsyncAction, generateId, createTimestamp } from "../mst"
import { OrderStatus, OrderPriority, NigerianGarmentType, NigerianCity } from "../../types/orders"

/**
 * MST model for revenue analytics
 */
const RevenueAnalyticsModel = types.model("RevenueAnalytics", {
  totalRevenue: types.number,
  monthlyRevenue: types.number,
  weeklyRevenue: types.number,
  dailyRevenue: types.number,
  averageOrderValue: types.number,
  revenueGrowth: types.number, // percentage
  projectedMonthlyRevenue: types.number,
  lastUpdated: types.string,
})

/**
 * MST model for order analytics
 */
const OrderAnalyticsModel = types.model("OrderAnalytics", {
  totalOrders: types.number,
  activeOrders: types.number,
  completedOrders: types.number,
  cancelledOrders: types.number,
  pendingOrders: types.number,
  avgCompletionTime: types.number, // in days
  onTimeDeliveryRate: types.number, // percentage
  orderGrowth: types.number, // percentage
  lastUpdated: types.string,
})

/**
 * MST model for customer analytics
 */
const CustomerAnalyticsModel = types.model("CustomerAnalytics", {
  totalCustomers: types.number,
  newCustomers: types.number,
  returningCustomers: types.number,
  customerRetentionRate: types.number, // percentage
  avgCustomerLifetimeValue: types.number,
  avgOrdersPerCustomer: types.number,
  customerSatisfactionScore: types.number, // 1-5 scale
  lastUpdated: types.string,
})

/**
 * MST model for garment type analytics
 */
const GarmentAnalyticsModel = types.model("GarmentAnalytics", {
  garmentType: types.enumeration("NigerianGarmentType", [
    "agbada", "kaftan", "isi_agu", "babban_riga", "ankara_dress", "senator", "traditional", "modern", "custom"
  ]),
  orderCount: types.number,
  revenue: types.number,
  avgPrice: types.number,
  avgCompletionTime: types.number,
  popularityRank: types.number,
  profitMargin: types.number, // percentage
  lastUpdated: types.string,
})

/**
 * MST model for city analytics
 */
const CityAnalyticsModel = types.model("CityAnalytics", {
  city: types.enumeration("NigerianCity", [
    "lagos", "abuja", "kano", "ibadan", "port_harcourt", "benin", "maiduguri", "zaria", "aba", "jos", "other"
  ]),
  orderCount: types.number,
  revenue: types.number,
  avgOrderValue: types.number,
  customerCount: types.number,
  marketShare: types.number, // percentage
  lastUpdated: types.string,
})

/**
 * MST model for performance metrics
 */
const PerformanceMetricsModel = types.model("PerformanceMetrics", {
  productivityScore: types.number, // 1-100 scale
  qualityScore: types.number, // 1-100 scale
  deliveryPerformance: types.number, // percentage on-time
  customerSatisfaction: types.number, // 1-5 scale
  operationalEfficiency: types.number, // percentage
  wasteReduction: types.number, // percentage
  skillDevelopmentScore: types.number, // 1-100 scale
  lastUpdated: types.string,
})

/**
 * MST model for trend analysis
 */
const TrendAnalysisModel = types.model("TrendAnalysis", {
  period: types.enumeration("Period", ["daily", "weekly", "monthly", "quarterly", "yearly"]),
  dataPoints: types.array(
    types.model("TrendDataPoint", {
      date: types.string,
      orders: types.number,
      revenue: types.number,
      customers: types.number,
      avgOrderValue: types.number,
    })
  ),
  trendDirection: types.enumeration("TrendDirection", ["up", "down", "stable"]),
  growthRate: types.number, // percentage
  lastUpdated: types.string,
})

/**
 * MST model for financial insights
 */
const FinancialInsightsModel = types.model("FinancialInsights", {
  totalIncome: types.number,
  totalExpenses: types.number,
  netProfit: types.number,
  profitMargin: types.number, // percentage
  fabricCosts: types.number,
  laborCosts: types.number,
  overheadCosts: types.number,
  taxLiabilities: types.number,
  cashFlow: types.number,
  breakEvenPoint: types.number,
  returnOnInvestment: types.number, // percentage
  lastUpdated: types.string,
})

/**
 * Main AnalyticsStore model
 */
export const AnalyticsStoreModel = types
  .model("AnalyticsStore", {
    // Core analytics
    revenueAnalytics: types.optional(RevenueAnalyticsModel, {
      totalRevenue: 0,
      monthlyRevenue: 0,
      weeklyRevenue: 0,
      dailyRevenue: 0,
      averageOrderValue: 0,
      revenueGrowth: 0,
      projectedMonthlyRevenue: 0,
      lastUpdated: createTimestamp(),
    }),

    orderAnalytics: types.optional(OrderAnalyticsModel, {
      totalOrders: 0,
      activeOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      pendingOrders: 0,
      avgCompletionTime: 0,
      onTimeDeliveryRate: 0,
      orderGrowth: 0,
      lastUpdated: createTimestamp(),
    }),

    customerAnalytics: types.optional(CustomerAnalyticsModel, {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      customerRetentionRate: 0,
      avgCustomerLifetimeValue: 0,
      avgOrdersPerCustomer: 0,
      customerSatisfactionScore: 0,
      lastUpdated: createTimestamp(),
    }),

    // Breakdown analytics
    garmentAnalytics: types.array(GarmentAnalyticsModel),
    cityAnalytics: types.array(CityAnalyticsModel),

    // Performance metrics
    performanceMetrics: types.optional(PerformanceMetricsModel, {
      productivityScore: 0,
      qualityScore: 0,
      deliveryPerformance: 0,
      customerSatisfaction: 0,
      operationalEfficiency: 0,
      wasteReduction: 0,
      skillDevelopmentScore: 0,
      lastUpdated: createTimestamp(),
    }),

    // Trend analysis
    trendAnalysis: types.optional(TrendAnalysisModel, {
      period: "monthly",
      dataPoints: [],
      trendDirection: "stable",
      growthRate: 0,
      lastUpdated: createTimestamp(),
    }),

    // Financial insights
    financialInsights: types.optional(FinancialInsightsModel, {
      totalIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      profitMargin: 0,
      fabricCosts: 0,
      laborCosts: 0,
      overheadCosts: 0,
      taxLiabilities: 0,
      cashFlow: 0,
      breakEvenPoint: 0,
      returnOnInvestment: 0,
      lastUpdated: createTimestamp(),
    }),

    // State management
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    lastFetched: types.maybeNull(types.string),
    selectedPeriod: types.optional(
      types.enumeration("AnalyticsPeriod", ["7d", "30d", "90d", "1y"]),
      "30d"
    ),
  })
  .actions((self) => {
    // Helper actions
    const setLoading = (loading: boolean) => {
      self.isLoading = loading
    }

    const setError = (error: string | null) => {
      self.error = error
    }

    const clearError = () => {
      self.error = null
    }

    const setLastFetched = (timestamp: string) => {
      self.lastFetched = timestamp
    }

    return {
      setLoading,
      setError,
      clearError,
      setLastFetched,

      /**
       * Set selected analytics period
       */
      setSelectedPeriod(period: "7d" | "30d" | "90d" | "1y") {
        self.selectedPeriod = period
      },

      /**
       * Update revenue analytics
       */
      updateRevenueAnalytics(data: Partial<typeof self.revenueAnalytics>) {
        Object.assign(self.revenueAnalytics, data, { lastUpdated: createTimestamp() })
      },

      /**
       * Update order analytics
       */
      updateOrderAnalytics(data: Partial<typeof self.orderAnalytics>) {
        Object.assign(self.orderAnalytics, data, { lastUpdated: createTimestamp() })
      },

      /**
       * Update customer analytics
       */
      updateCustomerAnalytics(data: Partial<typeof self.customerAnalytics>) {
        Object.assign(self.customerAnalytics, data, { lastUpdated: createTimestamp() })
      },

      /**
       * Update performance metrics
       */
      updatePerformanceMetrics(data: Partial<typeof self.performanceMetrics>) {
        Object.assign(self.performanceMetrics, data, { lastUpdated: createTimestamp() })
      },

      /**
       * Update financial insights
       */
      updateFinancialInsights(data: Partial<typeof self.financialInsights>) {
        Object.assign(self.financialInsights, data, { lastUpdated: createTimestamp() })
      },

      /**
       * Set garment analytics
       */
      setGarmentAnalytics(analytics: any[]) {
        self.garmentAnalytics.clear()
        analytics.forEach(item => {
          self.garmentAnalytics.push(GarmentAnalyticsModel.create({
            ...item,
            lastUpdated: createTimestamp(),
          }))
        })
      },

      /**
       * Set city analytics
       */
      setCityAnalytics(analytics: any[]) {
        self.cityAnalytics.clear()
        analytics.forEach(item => {
          self.cityAnalytics.push(CityAnalyticsModel.create({
            ...item,
            lastUpdated: createTimestamp(),
          }))
        })
      },

      /**
       * Update trend data
       */
      updateTrendAnalysis(data: {
        period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
        dataPoints: Array<{
          date: string
          orders: number
          revenue: number
          customers: number
          avgOrderValue: number
        }>
        trendDirection: "up" | "down" | "stable"
        growthRate: number
      }) {
        self.trendAnalysis.period = data.period
        self.trendAnalysis.dataPoints.clear()
        data.dataPoints.forEach(point => {
          self.trendAnalysis.dataPoints.push(point)
        })
        self.trendAnalysis.trendDirection = data.trendDirection
        self.trendAnalysis.growthRate = data.growthRate
        self.trendAnalysis.lastUpdated = createTimestamp()
      },

      /**
       * Calculate and update derived metrics
       */
      calculateDerivedMetrics() {
        // Calculate overall performance score
        const performanceScore = (
          self.performanceMetrics.productivityScore +
          self.performanceMetrics.qualityScore +
          self.performanceMetrics.deliveryPerformance +
          (self.performanceMetrics.customerSatisfaction * 20) +
          self.performanceMetrics.operationalEfficiency
        ) / 5

        // Update financial calculations
        const netProfit = self.financialInsights.totalIncome - self.financialInsights.totalExpenses
        const profitMargin = self.financialInsights.totalIncome > 0 
          ? (netProfit / self.financialInsights.totalIncome) * 100 
          : 0

        self.updateFinancialInsights({
          netProfit,
          profitMargin,
        })

        // Update performance score
        self.updatePerformanceMetrics({
          productivityScore: performanceScore,
        })
      },

      /**
       * Generate analytics summary
       */
      generateSummary() {
        return {
          totalRevenue: self.revenueAnalytics.totalRevenue,
          totalOrders: self.orderAnalytics.totalOrders,
          totalCustomers: self.customerAnalytics.totalCustomers,
          avgOrderValue: self.revenueAnalytics.averageOrderValue,
          onTimeDelivery: self.orderAnalytics.onTimeDeliveryRate,
          customerSatisfaction: self.customerAnalytics.customerSatisfactionScore,
          profitMargin: self.financialInsights.profitMargin,
          growthRate: self.revenueAnalytics.revenueGrowth,
          performance: {
            productivity: self.performanceMetrics.productivityScore,
            quality: self.performanceMetrics.qualityScore,
            efficiency: self.performanceMetrics.operationalEfficiency,
          },
          trends: {
            direction: self.trendAnalysis.trendDirection,
            growthRate: self.trendAnalysis.growthRate,
          },
        }
      },

      /**
       * Get top performing garments
       */
      getTopGarments(limit = 5) {
        return self.garmentAnalytics
          .slice()
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit)
      },

      /**
       * Get top performing cities
       */
      getTopCities(limit = 5) {
        return self.cityAnalytics
          .slice()
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit)
      },

      /**
       * Reset all analytics
       */
      resetAnalytics() {
        self.revenueAnalytics = RevenueAnalyticsModel.create({
          totalRevenue: 0,
          monthlyRevenue: 0,
          weeklyRevenue: 0,
          dailyRevenue: 0,
          averageOrderValue: 0,
          revenueGrowth: 0,
          projectedMonthlyRevenue: 0,
          lastUpdated: createTimestamp(),
        })

        self.orderAnalytics = OrderAnalyticsModel.create({
          totalOrders: 0,
          activeOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          pendingOrders: 0,
          avgCompletionTime: 0,
          onTimeDeliveryRate: 0,
          orderGrowth: 0,
          lastUpdated: createTimestamp(),
        })

        self.customerAnalytics = CustomerAnalyticsModel.create({
          totalCustomers: 0,
          newCustomers: 0,
          returningCustomers: 0,
          customerRetentionRate: 0,
          avgCustomerLifetimeValue: 0,
          avgOrdersPerCustomer: 0,
          customerSatisfactionScore: 0,
          lastUpdated: createTimestamp(),
        })

        self.garmentAnalytics.clear()
        self.cityAnalytics.clear()
      },
    }
  })
  .actions((self) => {
    // Async actions
    const fetchAnalytics = createAsyncAction(
      self,
      async (period: "7d" | "30d" | "90d" | "1y" = "30d") => {
        const response = await fetch(`/api/analytics?period=${period}`, {
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch analytics")
        }

        return response.json()
      },
      { errorPrefix: "Failed to load analytics" },
    )

    const generateReport = createAsyncAction(
      self,
      async (config: {
        type: "summary" | "detailed" | "financial" | "performance"
        period: "7d" | "30d" | "90d" | "1y"
        format: "json" | "pdf" | "csv"
      }) => {
        const response = await fetch("/api/analytics/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        })

        if (!response.ok) {
          throw new Error("Failed to generate report")
        }

        return response.json()
      },
      { errorPrefix: "Failed to generate report" },
    )

    return {
      /**
       * Load analytics data
       */
      loadAnalytics: flow(function* (period: "7d" | "30d" | "90d" | "1y" = "30d") {
        try {
          self.setSelectedPeriod(period)
          const result = yield fetchAnalytics(period)

          // Update all analytics data
          if (result.revenue) self.updateRevenueAnalytics(result.revenue)
          if (result.orders) self.updateOrderAnalytics(result.orders)
          if (result.customers) self.updateCustomerAnalytics(result.customers)
          if (result.performance) self.updatePerformanceMetrics(result.performance)
          if (result.financial) self.updateFinancialInsights(result.financial)
          if (result.garments) self.setGarmentAnalytics(result.garments)
          if (result.cities) self.setCityAnalytics(result.cities)
          if (result.trends) self.updateTrendAnalysis(result.trends)

          // Calculate derived metrics
          self.calculateDerivedMetrics()

          self.setLastFetched(createTimestamp())
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Generate and export report
       */
      exportReport: flow(function* (config: {
        type: "summary" | "detailed" | "financial" | "performance"
        period?: "7d" | "30d" | "90d" | "1y"
        format?: "json" | "pdf" | "csv"
      }) {
        try {
          const fullConfig = {
            period: self.selectedPeriod,
            format: "json",
            ...config,
          }

          const result = yield generateReport(fullConfig as any)
          return result
        } catch (error) {
          throw error
        }
      }),

      /**
       * Refresh analytics
       */
      refreshAnalytics: flow(function* () {
        try {
          yield self.loadAnalytics(self.selectedPeriod)
        } catch (error) {
          throw error
        }
      }),

      /**
       * Load real-time metrics
       */
      loadRealTimeMetrics: flow(function* () {
        try {
          const response = yield fetch("/api/analytics/real-time")
          if (!response.ok) throw new Error("Failed to load real-time metrics")
          
          const metrics = yield response.json()
          
          // Update with real-time data
          if (metrics.revenue) self.updateRevenueAnalytics(metrics.revenue)
          if (metrics.orders) self.updateOrderAnalytics(metrics.orders)
          if (metrics.performance) self.updatePerformanceMetrics(metrics.performance)

          return metrics
        } catch (error) {
          console.error("Real-time metrics update failed:", error)
          // Don't throw error for real-time updates
        }
      }),
    }
  })
  .views((self) => ({
    /**
     * Get analytics summary for dashboard
     */
    get dashboardSummary() {
      return self.generateSummary()
    },

    /**
     * Get revenue trend indicator
     */
    get revenueTrend() {
      return {
        current: self.revenueAnalytics.monthlyRevenue,
        growth: self.revenueAnalytics.revenueGrowth,
        direction: self.revenueAnalytics.revenueGrowth > 0 ? "up" : 
                   self.revenueAnalytics.revenueGrowth < 0 ? "down" : "stable",
      }
    },

    /**
     * Get order completion efficiency
     */
    get orderEfficiency() {
      return {
        avgCompletionTime: self.orderAnalytics.avgCompletionTime,
        onTimeRate: self.orderAnalytics.onTimeDeliveryRate,
        totalActive: self.orderAnalytics.activeOrders,
      }
    },

    /**
     * Get customer insights
     */
    get customerInsights() {
      return {
        total: self.customerAnalytics.totalCustomers,
        retention: self.customerAnalytics.customerRetentionRate,
        lifetimeValue: self.customerAnalytics.avgCustomerLifetimeValue,
        satisfaction: self.customerAnalytics.customerSatisfactionScore,
      }
    },

    /**
     * Get financial health score
     */
    get financialHealth() {
      let score = 0
      if (self.financialInsights.profitMargin > 20) score += 25
      else if (self.financialInsights.profitMargin > 10) score += 15
      else if (self.financialInsights.profitMargin > 0) score += 10

      if (self.financialInsights.cashFlow > 0) score += 25
      if (self.financialInsights.returnOnInvestment > 15) score += 25
      if (self.revenueAnalytics.revenueGrowth > 0) score += 25

      return {
        score,
        profitMargin: self.financialInsights.profitMargin,
        cashFlow: self.financialInsights.cashFlow,
        roi: self.financialInsights.returnOnInvestment,
      }
    },

    /**
     * Check if data is stale
     */
    get isDataStale() {
      if (!self.lastFetched) return true
      const hourAgo = Date.now() - 60 * 60 * 1000
      return new Date(self.lastFetched).getTime() < hourAgo
    },

    /**
     * Get period in milliseconds
     */
    get periodInMs() {
      switch (self.selectedPeriod) {
        case "7d": return 7 * 24 * 60 * 60 * 1000
        case "30d": return 30 * 24 * 60 * 60 * 1000
        case "90d": return 90 * 24 * 60 * 60 * 1000
        case "1y": return 365 * 24 * 60 * 60 * 1000
        default: return 30 * 24 * 60 * 60 * 1000
      }
    },
  }))

/**
 * Type definitions for AnalyticsStore
 */
export interface AnalyticsStore extends Instance<typeof AnalyticsStoreModel> {}
export interface AnalyticsStoreSnapshot extends SnapshotOut<typeof AnalyticsStoreModel> {}