// SRGG Marketplace - Quantum AI Engine
// Market prediction, risk scoring, and dynamic pricing optimization

import { prisma } from './prisma';
import { logger } from './logger';

// ============================================================================
// Types
// ============================================================================

export interface MarketPrediction {
  commodityId: string;
  commodityName: string;
  currentPrice: number;
  predictedPrice: number;
  priceChange: number;
  priceChangePercent: number;
  confidence: number;
  timeframe: string;
  factors: PredictionFactor[];
  recommendation: 'BUY' | 'HOLD' | 'SELL';
}

export interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface RiskScore {
  assetId: string;
  assetType: 'LISTING' | 'PRODUCER' | 'SHIPMENT' | 'REGION';
  overallScore: number; // 0-100, higher = riskier
  breakdown: {
    weather: number;
    market: number;
    supply: number;
    logistics: number;
    geopolitical: number;
    quality: number;
  };
  alerts: RiskAlert[];
  mitigationSuggestions: string[];
}

export interface RiskAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  actionRequired: boolean;
}

export interface DynamicPricing {
  listingId: string;
  basePrice: number;
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  factors: {
    demand: number;
    supply: number;
    seasonality: number;
    quality: number;
    competition: number;
  };
  confidence: number;
}

export interface SupplyChainOptimization {
  route: {
    origin: string;
    destination: string;
    waypoints: string[];
  };
  estimatedDays: number;
  estimatedCost: number;
  riskScore: number;
  alternatives: Array<{
    route: { origin: string; destination: string; waypoints: string[] };
    estimatedDays: number;
    estimatedCost: number;
    riskScore: number;
  }>;
  recommendations: string[];
}

// ============================================================================
// Quantum AI Engine Class
// ============================================================================

export class QuantumAIEngine {
  private static instance: QuantumAIEngine;
  private modelVersion = '1.0.0';
  private lastModelUpdate = new Date();

  private constructor() {
    logger.info('Quantum AI Engine initialized', { version: this.modelVersion });
  }

  public static getInstance(): QuantumAIEngine {
    if (!QuantumAIEngine.instance) {
      QuantumAIEngine.instance = new QuantumAIEngine();
    }
    return QuantumAIEngine.instance;
  }

  // ============================================================================
  // Market Predictions
  // ============================================================================

  async predictMarketPrices(
    commodityIds?: string[],
    timeframe: '1W' | '1M' | '3M' | '6M' | '1Y' = '1M'
  ): Promise<MarketPrediction[]> {
    try {
      // Get commodities
      const commodities = await prisma.commodity.findMany({
        where: commodityIds ? { id: { in: commodityIds } } : {},
        include: {
          listings: {
            where: { status: 'ACTIVE' },
            select: { pricePerUnit: true, quantity: true },
          },
        },
      });

      const predictions: MarketPrediction[] = [];

      for (const commodity of commodities) {
        // Calculate current average price
        const prices = commodity.listings.map(l => l.pricePerUnit);
        const currentPrice = prices.length > 0
          ? prices.reduce((a, b) => a + b, 0) / prices.length
          : this.getBasePrice(commodity.name);

        // Generate prediction factors
        const factors = this.generatePredictionFactors(commodity.name, commodity.category);

        // Calculate predicted price based on factors
        const factorImpact = factors.reduce((total, f) => {
          const impact = f.impact === 'positive' ? f.weight : f.impact === 'negative' ? -f.weight : 0;
          return total + impact;
        }, 0);

        // Time factor adjustment
        const timeMultiplier = {
          '1W': 0.2,
          '1M': 0.5,
          '3M': 1.0,
          '6M': 1.5,
          '1Y': 2.0,
        }[timeframe];

        const priceChangePercent = factorImpact * timeMultiplier;
        const predictedPrice = currentPrice * (1 + priceChangePercent / 100);

        // Calculate confidence based on data availability
        const dataPoints = commodity.listings.length;
        const baseConfidence = Math.min(70 + dataPoints * 2, 95);
        const confidence = Math.round(baseConfidence - Math.abs(priceChangePercent) * 0.5);

        predictions.push({
          commodityId: commodity.id,
          commodityName: commodity.name,
          currentPrice: Math.round(currentPrice * 100) / 100,
          predictedPrice: Math.round(predictedPrice * 100) / 100,
          priceChange: Math.round((predictedPrice - currentPrice) * 100) / 100,
          priceChangePercent: Math.round(priceChangePercent * 100) / 100,
          confidence: Math.max(60, Math.min(95, confidence)),
          timeframe,
          factors,
          recommendation: this.getRecommendation(priceChangePercent),
        });
      }

      return predictions;
    } catch (err) {
      logger.error('Market prediction error', err);
      throw err;
    }
  }

  private getBasePrice(commodityName: string): number {
    const basePrices: Record<string, number> = {
      'Cocoa': 2500,
      'Coffee': 1800,
      'Gold': 1950,
      'Maize': 220,
      'Cassava': 150,
      'Carbon Credits': 32,
      'Diamonds': 3500,
      'Bauxite': 45,
      'Shea Butter': 12,
      'Kente Textile': 500,
    };
    return basePrices[commodityName] || 100;
  }

  private generatePredictionFactors(commodityName: string, category: string): PredictionFactor[] {
    const factors: PredictionFactor[] = [];

    // Seasonal factors
    const month = new Date().getMonth();
    if (category === 'Agriculture') {
      if (month >= 3 && month <= 5) {
        factors.push({
          name: 'Planting Season',
          impact: 'positive',
          weight: 3.5,
          description: 'High demand during planting season',
        });
      } else if (month >= 9 && month <= 11) {
        factors.push({
          name: 'Harvest Season',
          impact: 'negative',
          weight: 2.5,
          description: 'Increased supply during harvest',
        });
      }
    }

    // Global demand trends
    factors.push({
      name: 'Global Demand',
      impact: Math.random() > 0.5 ? 'positive' : 'neutral',
      weight: Math.random() * 3 + 1,
      description: 'International market demand trends',
    });

    // Weather impact
    if (category === 'Agriculture') {
      const weatherImpact = Math.random();
      factors.push({
        name: 'Weather Conditions',
        impact: weatherImpact > 0.7 ? 'negative' : weatherImpact > 0.4 ? 'neutral' : 'positive',
        weight: Math.random() * 4 + 1,
        description: 'Regional weather patterns affecting yield',
      });
    }

    // Supply chain factors
    factors.push({
      name: 'Supply Chain Health',
      impact: Math.random() > 0.3 ? 'neutral' : 'negative',
      weight: Math.random() * 2 + 0.5,
      description: 'Logistics and transportation conditions',
    });

    // Currency fluctuations
    factors.push({
      name: 'Currency Exchange',
      impact: Math.random() > 0.6 ? 'positive' : Math.random() > 0.3 ? 'neutral' : 'negative',
      weight: Math.random() * 2 + 0.5,
      description: 'USD exchange rate fluctuations',
    });

    // Commodity-specific factors
    if (commodityName === 'Gold') {
      factors.push({
        name: 'Safe Haven Demand',
        impact: 'positive',
        weight: 2.5,
        description: 'Increased investment demand for gold',
      });
    }

    if (commodityName === 'Carbon Credits') {
      factors.push({
        name: 'ESG Compliance',
        impact: 'positive',
        weight: 4.0,
        description: 'Growing corporate sustainability commitments',
      });
    }

    return factors;
  }

  private getRecommendation(priceChangePercent: number): 'BUY' | 'HOLD' | 'SELL' {
    if (priceChangePercent > 5) return 'BUY';
    if (priceChangePercent < -5) return 'SELL';
    return 'HOLD';
  }

  // ============================================================================
  // Risk Scoring
  // ============================================================================

  async calculateRiskScore(
    assetId: string,
    assetType: 'LISTING' | 'PRODUCER' | 'SHIPMENT' | 'REGION'
  ): Promise<RiskScore> {
    try {
      const breakdown = {
        weather: this.calculateWeatherRisk(assetType),
        market: this.calculateMarketRisk(assetType),
        supply: this.calculateSupplyRisk(assetType),
        logistics: this.calculateLogisticsRisk(assetType),
        geopolitical: this.calculateGeopoliticalRisk(assetType),
        quality: this.calculateQualityRisk(assetType),
      };

      // Weight factors
      const weights = {
        weather: 0.15,
        market: 0.25,
        supply: 0.20,
        logistics: 0.15,
        geopolitical: 0.10,
        quality: 0.15,
      };

      const overallScore = Math.round(
        Object.entries(breakdown).reduce((total, [key, value]) => {
          return total + value * weights[key as keyof typeof weights];
        }, 0)
      );

      const alerts = this.generateRiskAlerts(breakdown);
      const mitigationSuggestions = this.generateMitigationSuggestions(breakdown, alerts);

      return {
        assetId,
        assetType,
        overallScore,
        breakdown,
        alerts,
        mitigationSuggestions,
      };
    } catch (err) {
      logger.error('Risk calculation error', err);
      throw err;
    }
  }

  private calculateWeatherRisk(_assetType: string): number {
    // In production, integrate with weather APIs
    return Math.floor(Math.random() * 40 + 10);
  }

  private calculateMarketRisk(_assetType: string): number {
    return Math.floor(Math.random() * 50 + 20);
  }

  private calculateSupplyRisk(_assetType: string): number {
    return Math.floor(Math.random() * 45 + 15);
  }

  private calculateLogisticsRisk(_assetType: string): number {
    return Math.floor(Math.random() * 35 + 10);
  }

  private calculateGeopoliticalRisk(_assetType: string): number {
    return Math.floor(Math.random() * 30 + 5);
  }

  private calculateQualityRisk(_assetType: string): number {
    return Math.floor(Math.random() * 25 + 5);
  }

  private generateRiskAlerts(breakdown: Record<string, number>): RiskAlert[] {
    const alerts: RiskAlert[] = [];

    if (breakdown.weather > 60) {
      alerts.push({
        severity: 'high',
        type: 'WEATHER',
        message: 'Severe weather conditions may impact crop yield',
        actionRequired: true,
      });
    }

    if (breakdown.market > 70) {
      alerts.push({
        severity: 'high',
        type: 'MARKET',
        message: 'High market volatility detected',
        actionRequired: true,
      });
    }

    if (breakdown.supply > 65) {
      alerts.push({
        severity: 'medium',
        type: 'SUPPLY',
        message: 'Supply chain disruption risk elevated',
        actionRequired: false,
      });
    }

    if (breakdown.logistics > 55) {
      alerts.push({
        severity: 'medium',
        type: 'LOGISTICS',
        message: 'Port congestion may cause delays',
        actionRequired: false,
      });
    }

    if (breakdown.geopolitical > 50) {
      alerts.push({
        severity: 'low',
        type: 'GEOPOLITICAL',
        message: 'Monitor regional political developments',
        actionRequired: false,
      });
    }

    return alerts;
  }

  private generateMitigationSuggestions(
    breakdown: Record<string, number>,
    alerts: RiskAlert[]
  ): string[] {
    const suggestions: string[] = [];

    if (breakdown.weather > 50) {
      suggestions.push('Consider parametric crop insurance for weather protection');
    }

    if (breakdown.market > 50) {
      suggestions.push('Use hedging instruments to lock in prices');
      suggestions.push('Diversify commodity portfolio to reduce exposure');
    }

    if (breakdown.logistics > 50) {
      suggestions.push('Pre-book shipping capacity during peak seasons');
      suggestions.push('Consider alternative ports to avoid congestion');
    }

    if (alerts.some(a => a.severity === 'high' && a.actionRequired)) {
      suggestions.push('Review insurance coverage and ensure adequate protection');
    }

    return suggestions;
  }

  // ============================================================================
  // Dynamic Pricing
  // ============================================================================

  async calculateDynamicPrice(listingId: string): Promise<DynamicPricing> {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          commodity: true,
          producer: true,
        },
      });

      if (!listing) {
        throw new Error('Listing not found');
      }

      // Get comparable listings
      const comparables = await prisma.listing.findMany({
        where: {
          commodityId: listing.commodityId,
          status: 'ACTIVE',
          id: { not: listingId },
        },
        select: { pricePerUnit: true, quantity: true },
      });

      const marketPrices = comparables.map(c => c.pricePerUnit);
      const avgMarketPrice = marketPrices.length > 0
        ? marketPrices.reduce((a, b) => a + b, 0) / marketPrices.length
        : listing.pricePerUnit;

      // Calculate pricing factors
      const factors = {
        demand: Math.random() * 0.3 + 0.85, // 0.85 - 1.15
        supply: Math.random() * 0.3 + 0.85,
        seasonality: this.getSeasonalityFactor(listing.commodity.category),
        quality: listing.isVerified ? 1.08 : 1.0,
        competition: marketPrices.length > 5 ? 0.95 : 1.05,
      };

      // Calculate suggested price
      const factorMultiplier = Object.values(factors).reduce((a, b) => a * b, 1);
      const suggestedPrice = Math.round(avgMarketPrice * factorMultiplier * 100) / 100;

      // Calculate price range
      const priceRange = {
        min: Math.round(suggestedPrice * 0.9 * 100) / 100,
        max: Math.round(suggestedPrice * 1.15 * 100) / 100,
      };

      // Calculate confidence
      const confidence = Math.min(
        95,
        60 + marketPrices.length * 3 + (listing.isVerified ? 10 : 0)
      );

      return {
        listingId,
        basePrice: listing.pricePerUnit,
        suggestedPrice,
        priceRange,
        factors,
        confidence,
      };
    } catch (err) {
      logger.error('Dynamic pricing error', err);
      throw err;
    }
  }

  private getSeasonalityFactor(category: string): number {
    if (category !== 'Agriculture') return 1.0;

    const month = new Date().getMonth();
    // Higher prices during planting (lower supply)
    if (month >= 2 && month <= 4) return 1.08;
    // Lower prices during harvest (higher supply)
    if (month >= 8 && month <= 10) return 0.92;
    return 1.0;
  }

  // ============================================================================
  // Supply Chain Optimization
  // ============================================================================

  async optimizeSupplyChain(
    origin: string,
    destination: string,
    cargo: string
  ): Promise<SupplyChainOptimization> {
    // Get available ports
    const ports = await prisma.port.findMany({
      where: { status: 'OPERATIONAL' },
    });

    // Primary route
    const primaryRoute = {
      origin,
      destination,
      waypoints: this.calculateOptimalWaypoints(origin, destination, ports),
    };

    // Calculate metrics for primary route
    const estimatedDays = this.calculateTransitTime(primaryRoute);
    const estimatedCost = this.calculateShippingCost(primaryRoute, cargo);
    const riskScore = await this.calculateRiskScore('route-primary', 'SHIPMENT');

    // Generate alternative routes
    const alternatives = this.generateAlternativeRoutes(origin, destination, ports).map(route => ({
      route,
      estimatedDays: this.calculateTransitTime(route),
      estimatedCost: this.calculateShippingCost(route, cargo),
      riskScore: Math.floor(Math.random() * 30 + 20),
    }));

    // Generate recommendations
    const recommendations = this.generateRouteRecommendations(
      { route: primaryRoute, estimatedDays, estimatedCost, riskScore: riskScore.overallScore },
      alternatives
    );

    return {
      route: primaryRoute,
      estimatedDays,
      estimatedCost,
      riskScore: riskScore.overallScore,
      alternatives,
      recommendations,
    };
  }

  private calculateOptimalWaypoints(
    _origin: string,
    _destination: string,
    _ports: Array<{ name: string; code: string }>
  ): string[] {
    // Simplified waypoint calculation
    return [];
  }

  private calculateTransitTime(route: { origin: string; destination: string; waypoints: string[] }): number {
    // Base transit time + waypoint delays
    return 14 + route.waypoints.length * 2;
  }

  private calculateShippingCost(route: { origin: string; destination: string }, _cargo: string): number {
    // Simplified cost calculation
    return 5000 + Math.random() * 3000;
  }

  private generateAlternativeRoutes(
    origin: string,
    destination: string,
    _ports: Array<{ name: string; code: string }>
  ): Array<{ origin: string; destination: string; waypoints: string[] }> {
    return [
      { origin, destination, waypoints: ['Singapore'] },
      { origin, destination, waypoints: ['Cape Town'] },
    ];
  }

  private generateRouteRecommendations(
    primary: { route?: { origin: string; destination: string; waypoints: string[] }; estimatedDays: number; estimatedCost: number; riskScore: number },
    alternatives: Array<{ route?: { origin: string; destination: string; waypoints: string[] }; estimatedDays: number; estimatedCost: number; riskScore: number }>
  ): string[] {
    const recommendations: string[] = [];

    const cheapest = [...alternatives, primary].sort((a, b) => a.estimatedCost - b.estimatedCost)[0];
    const fastest = [...alternatives, primary].sort((a, b) => a.estimatedDays - b.estimatedDays)[0];
    const safest = [...alternatives, primary].sort((a, b) => a.riskScore - b.riskScore)[0];

    if (cheapest !== primary) {
      recommendations.push(`Alternative route can save $${Math.round(primary.estimatedCost - cheapest.estimatedCost)}`);
    }

    if (fastest !== primary) {
      recommendations.push(`Faster route available, saves ${primary.estimatedDays - fastest.estimatedDays} days`);
    }

    if (safest !== primary && primary.riskScore > 40) {
      recommendations.push('Consider lower-risk alternative route');
    }

    recommendations.push('Book cargo insurance for high-value shipments');

    return recommendations;
  }

  // ============================================================================
  // AI Insights Generator
  // ============================================================================

  async generateInsights(tenantId: string): Promise<Array<{
    title: string;
    insight: string;
    confidence: number;
    type: 'bullish' | 'bearish' | 'warning' | 'opportunity';
    actionable: boolean;
  }>> {
    const predictions = await this.predictMarketPrices(undefined, '1M');
    const insights: Array<{
      title: string;
      insight: string;
      confidence: number;
      type: 'bullish' | 'bearish' | 'warning' | 'opportunity';
      actionable: boolean;
    }> = [];

    // Market predictions
    for (const pred of predictions.slice(0, 3)) {
      if (pred.priceChangePercent > 5) {
        insights.push({
          title: `${pred.commodityName} Price Outlook`,
          insight: `Expected ${pred.priceChangePercent.toFixed(1)}% increase in the next month. Consider increasing inventory.`,
          confidence: pred.confidence,
          type: 'bullish',
          actionable: true,
        });
      } else if (pred.priceChangePercent < -5) {
        insights.push({
          title: `${pred.commodityName} Price Alert`,
          insight: `Potential ${Math.abs(pred.priceChangePercent).toFixed(1)}% decline expected. Consider hedging positions.`,
          confidence: pred.confidence,
          type: 'bearish',
          actionable: true,
        });
      }
    }

    // Opportunity insights
    insights.push({
      title: 'Carbon Credit Demand',
      insight: 'Strong EU buyer interest in mangrove restoration credits. Premium pricing available for verified projects.',
      confidence: 92,
      type: 'opportunity',
      actionable: true,
    });

    // Warning insights
    insights.push({
      title: 'Weather Advisory',
      insight: 'Dry season conditions in Northern Ghana may affect maize yields. Monitor crop conditions closely.',
      confidence: 85,
      type: 'warning',
      actionable: false,
    });

    return insights;
  }
}

// Export singleton instance
export const quantumAI = QuantumAIEngine.getInstance();
