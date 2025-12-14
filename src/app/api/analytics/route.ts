// SRGG Marketplace - Analytics API
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { success, error } from '@/lib/api-response';

// Helper to extract token from request
async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') ||
                request.cookies.get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return payload;
}

// GET /api/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    if (type === 'overview') {
      // Get aggregate statistics
      const [
        totalProducers,
        verifiedProducers,
        totalListings,
        activeListings,
        totalOrders,
        completedOrders,
        totalTokens,
        totalPolicies,
        totalPositions,
        totalShipments,
      ] = await Promise.all([
        prisma.producer.count({ where: { tenantId: authResult.tenantId } }),
        prisma.producer.count({ where: { tenantId: authResult.tenantId, verificationStatus: 'VERIFIED' } }),
        prisma.listing.count({ where: { tenantId: authResult.tenantId } }),
        prisma.listing.count({ where: { tenantId: authResult.tenantId, status: 'ACTIVE' } }),
        prisma.order.count({ where: { tenantId: authResult.tenantId } }),
        prisma.order.count({ where: { tenantId: authResult.tenantId, status: 'COMPLETED' } }),
        prisma.token.count(),
        prisma.insurancePolicy.count({ where: { tenantId: authResult.tenantId, status: 'ACTIVE' } }),
        prisma.hedgePosition.count({ where: { tenantId: authResult.tenantId, status: 'OPEN' } }),
        prisma.shipment.count({ where: { tenantId: authResult.tenantId } }),
      ]);

      // Calculate revenue from completed orders
      const revenueData = await prisma.order.aggregate({
        where: { tenantId: authResult.tenantId, paymentStatus: 'COMPLETED' },
        _sum: { totalPrice: true },
      });

      // Get commodity distribution
      const commodityStats = await prisma.listing.groupBy({
        by: ['commodityId'],
        where: { tenantId: authResult.tenantId, status: 'ACTIVE' },
        _count: true,
        _sum: { totalPrice: true },
      });

      return success({
        overview: {
          producers: { total: totalProducers, verified: verifiedProducers },
          listings: { total: totalListings, active: activeListings },
          orders: { total: totalOrders, completed: completedOrders },
          tokens: { total: totalTokens, minted: totalTokens },
          insurance: { activePolicies: totalPolicies },
          hedging: { openPositions: totalPositions },
          logistics: { activeShipments: totalShipments },
          revenue: revenueData._sum.totalPrice || 0,
        },
        commodityDistribution: commodityStats,
        aiInsights: generateAIInsights(),
        riskMetrics: generateRiskMetrics(),
      });
    }

    if (type === 'commodities') {
      const commodities = await prisma.commodity.findMany({
        include: {
          listings: {
            where: { status: 'ACTIVE' },
          },
        },
      });

      const stats = commodities.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        listingCount: c.listings.length,
        totalVolume: c.listings.reduce((sum, l) => sum + l.quantity, 0),
        totalValue: c.listings.reduce((sum, l) => sum + l.totalPrice, 0),
      }));

      return success(stats);
    }

    return error('INVALID_INPUT', 'Invalid analytics type', 400);
  } catch (err) {
    logger.error('Analytics error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch analytics', 500);
  }
}

// Generate simulated AI insights
function generateAIInsights() {
  return [
    {
      title: 'Cocoa Price Prediction',
      insight: 'Expected 8% increase in Q1 2025 due to supply constraints in Ivory Coast',
      confidence: 92,
      type: 'bullish',
    },
    {
      title: 'Weather Alert - Ghana',
      insight: 'Dry season may affect maize yields in Northern region. Consider hedging positions.',
      confidence: 87,
      type: 'warning',
    },
    {
      title: 'Carbon Credit Opportunity',
      insight: 'Mangrove restoration projects showing 2.3x ROI. High demand from EU buyers.',
      confidence: 95,
      type: 'opportunity',
    },
  ];
}

// Generate simulated risk metrics
function generateRiskMetrics() {
  return {
    regions: [
      { region: 'Ghana', weather: 'low', market: 'medium', supply: 'low', logistics: 'low' },
      { region: 'DR', weather: 'medium', market: 'low', supply: 'low', logistics: 'medium' },
      { region: 'Nigeria', weather: 'high', market: 'medium', supply: 'medium', logistics: 'high' },
      { region: 'Kenya', weather: 'low', market: 'low', supply: 'low', logistics: 'medium' },
    ],
    portfolioMetrics: {
      var: 125000,
      beta: 0.85,
      sharpeRatio: 1.42,
    },
  };
}
