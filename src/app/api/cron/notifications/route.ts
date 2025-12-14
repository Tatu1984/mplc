// SRGG Marketplace - Notifications Cron Job API
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { success, error } from '@/lib/api-response';

// GET /api/cron/notifications - Process pending notifications
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return error('UNAUTHORIZED', 'Invalid cron secret', 401);
    }

    const results = {
      orderReminders: 0,
      shipmentAlerts: 0,
      insuranceExpiry: 0,
      hedgeExpiry: 0,
    };

    // 1. Notify about orders pending for more than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: oneDayAgo },
      },
      include: {
        buyer: true,
        listing: { include: { producer: true } },
      },
      take: 50,
    });

    for (const order of pendingOrders) {
      // Notify buyer
      await prisma.notification.create({
        data: {
          tenantId: order.tenantId,
          userId: order.buyerId,
          type: 'ORDER',
          title: 'Order Pending Payment',
          message: `Your order ${order.orderNumber} is awaiting payment. Please complete payment to proceed.`,
          data: JSON.stringify({ orderId: order.id }),
        },
      });
      results.orderReminders++;
    }

    // 2. Shipment arrival alerts
    const shipmentsInTransit = await prisma.shipment.findMany({
      where: {
        status: 'IN_TRANSIT',
      },
      take: 50,
    });

    for (const shipment of shipmentsInTransit) {
      // Parse ETA and check if arriving soon
      const etaDays = parseInt(shipment.eta?.replace(/\D/g, '') || '0');
      if (etaDays <= 2 && etaDays > 0) {
        // Find related order and notify
        // (simplified - in production, you'd link shipments to orders)
        results.shipmentAlerts++;
      }
    }

    // 3. Insurance expiry notifications
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringPolicies = await prisma.insurancePolicy.findMany({
      where: {
        status: 'ACTIVE',
        coverageEnd: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
      },
      include: {
        listing: { include: { producer: true } },
      },
      take: 50,
    });

    for (const policy of expiringPolicies) {
      if (policy.listing?.producer) {
        await prisma.notification.create({
          data: {
            tenantId: policy.tenantId,
            userId: policy.listing.producer.userId,
            type: 'INSURANCE',
            title: 'Insurance Policy Expiring Soon',
            message: `Your insurance policy ${policy.policyNumber} will expire on ${policy.coverageEnd.toLocaleDateString()}. Consider renewing.`,
            data: JSON.stringify({ policyId: policy.id }),
          },
        });
        results.insuranceExpiry++;
      }
    }

    // 4. Hedge position expiry notifications
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiringHedges = await prisma.hedgePosition.findMany({
      where: {
        status: 'OPEN',
        expiryDate: {
          lte: sevenDaysFromNow,
          gte: new Date(),
        },
      },
      take: 50,
    });

    for (const hedge of expiringHedges) {
      // Create notification (would need user association in production)
      results.hedgeExpiry++;
    }

    logger.info('Notifications cron completed', results);

    return success({
      message: 'Notification processing completed',
      results,
      executedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Notifications cron error', err);
    return error('INTERNAL_ERROR', 'Notification job failed', 500);
  }
}
