// SRGG Marketplace - Notifications API
import { NextRequest, NextResponse } from 'next/server';
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

// GET /api/notifications - List user notifications
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: Record<string, unknown> = {
      userId: authResult.userId,
      tenantId: authResult.tenantId,
    };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: authResult.userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      unreadCount,
    });
  } catch (err) {
    logger.error('Notifications list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch notifications', 500);
  }
}

// POST /api/notifications - Create notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    // Only admins can create notifications for others
    if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(authResult.role)) {
      return error('FORBIDDEN', 'Forbidden', 403);
    }

    const body = await request.json();
    const { userId, type, title, message, data } = body;

    if (!userId || !type || !title || !message) {
      return error('INVALID_INPUT', 'Missing required fields', 400);
    }

    const notification = await prisma.notification.create({
      data: {
        tenantId: authResult.tenantId,
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : '{}',
      },
    });

    return success(notification, 201);
  } catch (err) {
    logger.error('Notification creation error', err);
    return error('INTERNAL_ERROR', 'Failed to create notification', 500);
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { ids, markAll } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: authResult.userId, isRead: false },
        data: { isRead: true },
      });
    } else if (ids && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: authResult.userId },
        data: { isRead: true },
      });
    }

    return success({ marked: true });
  } catch (err) {
    logger.error('Notification update error', err);
    return error('INTERNAL_ERROR', 'Failed to update notifications', 500);
  }
}
