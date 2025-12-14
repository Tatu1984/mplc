// SRGG Marketplace - Dashboard Statistics API (Production-Ready)
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  success,
  unauthorized,
  withErrorHandler,
} from '@/lib/api-response';

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') ||
                request.cookies.get('token')?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return payload;
}

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized('Authentication required');
    }

    // Build tenant filter for non-super-admins
    const tenantFilter = user.role === 'SUPER_ADMIN' ? {} : { tenantId: user.tenantId };

    try {
      // Fetch all stats in parallel
      const [
        producerStats,
        listingStats,
        orderStats,
        tokenStats,
        recentOrders,
        topCommodities,
        validationStats,
        insuranceStats,
        hedgeStats,
        shipmentStats,
      ] = await Promise.all([
        // Producer stats
        prisma.producer.groupBy({
          by: ['verificationStatus'],
          where: tenantFilter,
          _count: true,
        }),

        // Listing stats
        prisma.listing.aggregate({
          where: { ...tenantFilter, status: 'ACTIVE' },
          _count: true,
          _sum: { totalPrice: true },
        }),

        // Order stats
        prisma.order.groupBy({
          by: ['status'],
          where: tenantFilter,
          _count: true,
          _sum: { totalPrice: true },
        }),

        // Token stats
        prisma.token.groupBy({
          by: ['status'],
          where: tenantFilter.tenantId ? {
            listing: { tenantId: tenantFilter.tenantId },
          } : {},
          _count: true,
        }),

        // Recent orders
        prisma.order.findMany({
          where: tenantFilter,
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            listing: {
              include: { commodity: true },
            },
            buyer: {
              select: { name: true, email: true },
            },
          },
        }),

        // Top commodities by listing count
        prisma.listing.groupBy({
          by: ['commodityId'],
          where: { ...tenantFilter, status: 'ACTIVE' },
          _count: true,
          _sum: { totalPrice: true },
          orderBy: { _count: { commodityId: 'desc' } },
          take: 5,
        }),

        // Validation stats
        prisma.validation.groupBy({
          by: ['status'],
          where: tenantFilter,
          _count: true,
        }),

        // Insurance stats
        prisma.insurancePolicy.aggregate({
          where: { ...tenantFilter, status: 'ACTIVE' },
          _count: true,
          _sum: { coverageAmount: true, premium: true },
        }),

        // Hedge stats
        prisma.hedgePosition.aggregate({
          where: { ...tenantFilter, status: 'OPEN' },
          _count: true,
          _sum: { pnl: true },
        }),

        // Shipment stats
        prisma.shipment.groupBy({
          by: ['status'],
          where: tenantFilter,
          _count: true,
        }),
      ]);

      // Process producer stats
      const producerCounts = producerStats.reduce((acc, item) => {
        acc[item.verificationStatus.toLowerCase()] = item._count;
        return acc;
      }, {} as Record<string, number>);

      // Process order stats
      const orderCounts = orderStats.reduce((acc, item) => {
        acc.byStatus[item.status.toLowerCase()] = item._count;
        acc.revenue += item._sum.totalPrice || 0;
        return acc;
      }, { byStatus: {} as Record<string, number>, revenue: 0 });

      // Process token stats
      const tokenCounts = tokenStats.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count;
        return acc;
      }, {} as Record<string, number>);

      // Process validation stats
      const validationCounts = validationStats.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count;
        return acc;
      }, {} as Record<string, number>);

      // Process shipment stats
      const shipmentCounts = shipmentStats.reduce((acc, item) => {
        acc[item.status.toLowerCase().replace(/_/g, '')] = item._count;
        return acc;
      }, {} as Record<string, number>);

      // Fetch commodity names for top commodities
      const commodityIds = topCommodities.map(c => c.commodityId);
      const commodities = await prisma.commodity.findMany({
        where: { id: { in: commodityIds } },
      });
      const commodityMap = new Map(commodities.map(c => [c.id, c]));

      const topCommoditiesWithNames = topCommodities.map(c => ({
        commodity: commodityMap.get(c.commodityId),
        listingCount: c._count,
        totalValue: c._sum.totalPrice || 0,
      }));

      // Build response
      const stats = {
        producers: {
          total: Object.values(producerCounts).reduce((a, b) => a + b, 0),
          verified: producerCounts.verified || 0,
          pending: producerCounts.pending || 0,
          rejected: producerCounts.rejected || 0,
        },
        listings: {
          total: listingStats._count || 0,
          active: listingStats._count || 0,
          totalValue: listingStats._sum.totalPrice || 0,
        },
        orders: {
          total: Object.values(orderCounts.byStatus).reduce((a, b) => a + b, 0),
          pending: orderCounts.byStatus.pending || 0,
          confirmed: orderCounts.byStatus.confirmed || 0,
          completed: orderCounts.byStatus.completed || 0,
          cancelled: orderCounts.byStatus.cancelled || 0,
          revenue: orderCounts.revenue,
        },
        tokens: {
          total: Object.values(tokenCounts).reduce((a, b) => a + b, 0),
          active: tokenCounts.active || 0,
          pending: tokenCounts.pending || 0,
          minted: tokenCounts.minted || tokenCounts.active || 0,
        },
        validations: {
          total: Object.values(validationCounts).reduce((a, b) => a + b, 0),
          queued: validationCounts.queued || 0,
          inProgress: validationCounts.in_progress || validationCounts.inprogress || 0,
          completed: validationCounts.completed || 0,
        },
        insurance: {
          activePolicies: insuranceStats._count || 0,
          totalCoverage: insuranceStats._sum.coverageAmount || 0,
          totalPremiums: insuranceStats._sum.premium || 0,
        },
        hedging: {
          openPositions: hedgeStats._count || 0,
          totalPnL: hedgeStats._sum.pnl || 0,
        },
        logistics: {
          total: Object.values(shipmentCounts).reduce((a, b) => a + b, 0),
          inTransit: shipmentCounts.intransit || 0,
          delivered: shipmentCounts.delivered || 0,
          loading: shipmentCounts.loading || 0,
          customs: shipmentCounts.customs || 0,
        },
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          buyer: order.buyer?.name || 'Unknown',
          commodity: order.listing?.commodity?.name || 'Unknown',
          quantity: order.quantity,
          totalPrice: order.totalPrice,
          currency: order.currency,
          status: order.status,
          createdAt: order.createdAt,
        })),
        topCommodities: topCommoditiesWithNames,
        generatedAt: new Date().toISOString(),
      };

      return success(stats);
    } catch (err) {
      logger.error('Dashboard stats error', err);
      throw err;
    }
  });
}
