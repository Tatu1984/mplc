// SRGG Marketplace - Cleanup Cron Job API
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { success, error } from '@/lib/api-response';

// GET /api/cron/cleanup - Cleanup expired sessions, old notifications, etc.
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return error('UNAUTHORIZED', 'Invalid cron secret', 401);
    }

    const now = new Date();
    const results = {
      expiredSessions: 0,
      oldNotifications: 0,
      expiredListings: 0,
      orphanedTokens: 0,
    };

    // 1. Delete expired sessions
    const expiredSessions = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    results.expiredSessions = expiredSessions.count;

    // 2. Delete old read notifications (older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oldNotifications = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: thirtyDaysAgo },
      },
    });
    results.oldNotifications = oldNotifications.count;

    // 3. Expire old draft listings (older than 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const expiredListings = await prisma.listing.updateMany({
      where: {
        status: 'DRAFT',
        createdAt: { lt: ninetyDaysAgo },
      },
      data: {
        status: 'EXPIRED',
      },
    });
    results.expiredListings = expiredListings.count;

    // 4. Clean up orphaned analytics events (older than 1 year)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    await prisma.analyticsEvent.deleteMany({
      where: {
        createdAt: { lt: oneYearAgo },
      },
    });

    logger.info('Cleanup cron completed', results);

    return success({
      message: 'Cleanup completed successfully',
      results,
      executedAt: now.toISOString(),
    });
  } catch (err) {
    logger.error('Cleanup cron error', err);
    return error('INTERNAL_ERROR', 'Cleanup job failed', 500);
  }
}
