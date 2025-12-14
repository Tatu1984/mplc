// SRGG Marketplace - Webhooks API (Event Notifications)
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { success, error, paginated, badRequest } from '@/lib/api-response';
import { z } from 'zod';
import crypto from 'crypto';

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

// Webhook event types
const WEBHOOK_EVENTS = [
  'order.created',
  'order.confirmed',
  'order.shipped',
  'order.delivered',
  'order.completed',
  'order.cancelled',
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'listing.created',
  'listing.activated',
  'listing.sold',
  'token.minted',
  'token.transferred',
  'validation.completed',
  'insurance.activated',
  'insurance.claimed',
  'shipment.departed',
  'shipment.arrived',
  'iot.alert',
] as const;

const createWebhookSchema = z.object({
  url: z.string().url('Valid URL is required'),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, 'At least one event is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// In-memory webhook store (in production, use database table)
interface Webhook {
  id: string;
  tenantId: string;
  url: string;
  secret: string;
  events: string[];
  description?: string;
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  failureCount: number;
}

const webhookStore: Webhook[] = [];

// GET /api/webhooks - List webhooks
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    // Only admins can manage webhooks
    if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(authResult.role)) {
      return error('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const tenantWebhooks = webhookStore.filter(w =>
      authResult.role === 'SUPER_ADMIN' || w.tenantId === authResult.tenantId
    );

    // Mask secrets
    const sanitizedWebhooks = tenantWebhooks.map(w => ({
      ...w,
      secret: w.secret.slice(0, 8) + '...',
    }));

    return success({
      webhooks: sanitizedWebhooks,
      availableEvents: WEBHOOK_EVENTS,
    });
  } catch (err) {
    logger.error('Webhooks list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch webhooks', 500);
  }
}

// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(authResult.role)) {
      return error('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const body = await request.json();
    const validation = createWebhookSchema.safeParse(body);

    if (!validation.success) {
      return badRequest(validation.error.errors[0]?.message || 'Invalid input');
    }

    const { url, events, description, isActive } = validation.data;

    // Generate webhook secret
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const webhook: Webhook = {
      id: `wh_${Date.now().toString(36)}`,
      tenantId: authResult.tenantId,
      url,
      secret,
      events,
      description,
      isActive,
      createdAt: new Date().toISOString(),
      failureCount: 0,
    };

    webhookStore.push(webhook);

    return success({
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret, // Only shown once on creation
      events: webhook.events,
      description: webhook.description,
      isActive: webhook.isActive,
      message: 'Webhook created. Save the secret - it will only be shown once.',
    }, 201);
  } catch (err) {
    logger.error('Webhook creation error', err);
    return error('INTERNAL_ERROR', 'Failed to create webhook', 500);
  }
}

// PATCH /api/webhooks - Update webhook
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(authResult.role)) {
      return error('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const body = await request.json();
    const { webhookId, url, events, description, isActive } = body;

    if (!webhookId) {
      return badRequest('Webhook ID is required');
    }

    const webhookIndex = webhookStore.findIndex(w =>
      w.id === webhookId &&
      (authResult.role === 'SUPER_ADMIN' || w.tenantId === authResult.tenantId)
    );

    if (webhookIndex === -1) {
      return error('NOT_FOUND', 'Webhook not found', 404);
    }

    if (url) webhookStore[webhookIndex].url = url;
    if (events) webhookStore[webhookIndex].events = events;
    if (description !== undefined) webhookStore[webhookIndex].description = description;
    if (isActive !== undefined) webhookStore[webhookIndex].isActive = isActive;

    return success({
      ...webhookStore[webhookIndex],
      secret: webhookStore[webhookIndex].secret.slice(0, 8) + '...',
    });
  } catch (err) {
    logger.error('Webhook update error', err);
    return error('INTERNAL_ERROR', 'Failed to update webhook', 500);
  }
}

// DELETE /api/webhooks - Delete webhook
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(authResult.role)) {
      return error('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return badRequest('Webhook ID is required');
    }

    const webhookIndex = webhookStore.findIndex(w =>
      w.id === webhookId &&
      (authResult.role === 'SUPER_ADMIN' || w.tenantId === authResult.tenantId)
    );

    if (webhookIndex === -1) {
      return error('NOT_FOUND', 'Webhook not found', 404);
    }

    webhookStore.splice(webhookIndex, 1);

    return success({ message: 'Webhook deleted successfully' });
  } catch (err) {
    logger.error('Webhook deletion error', err);
    return error('INTERNAL_ERROR', 'Failed to delete webhook', 500);
  }
}

// Webhook dispatch function (called internally)
export async function dispatchWebhook(
  tenantId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const webhooks = webhookStore.filter(w =>
    w.tenantId === tenantId &&
    w.isActive &&
    w.events.includes(event)
  );

  for (const webhook of webhooks) {
    try {
      const timestamp = Date.now();
      const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(signaturePayload)
        .digest('hex');

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SRGG-Signature': `t=${timestamp},v1=${signature}`,
          'X-SRGG-Event': event,
        },
        body: JSON.stringify({
          id: `evt_${Date.now().toString(36)}`,
          event,
          timestamp: new Date().toISOString(),
          data: payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      webhook.lastTriggeredAt = new Date().toISOString();
      webhook.failureCount = 0;
    } catch (err) {
      logger.error('Webhook dispatch failed', {
        webhookId: webhook.id,
        event,
        error: err
      });
      webhook.failureCount++;

      // Disable webhook after 10 consecutive failures
      if (webhook.failureCount >= 10) {
        webhook.isActive = false;
        logger.warn('Webhook disabled due to failures', { webhookId: webhook.id });
      }
    }
  }
}
