// SRGG Marketplace - Validations API
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { success, error, paginated } from '@/lib/api-response';

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

// GET /api/validations - List validations
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');

    const where: Record<string, unknown> = {
      tenantId: authResult.tenantId,
    };
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;

    const [validations, total] = await Promise.all([
      prisma.validation.findMany({
        where,
        include: {
          producer: true,
          listing: true,
          commodity: true,
          certificates: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.validation.count({ where }),
    ]);

    return paginated(validations, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Validation list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch validations', 500);
  }
}

// POST /api/validations - Create new validation request
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { type, producerId, listingId, commodityId, assetName, priority = 'MEDIUM', notes } = body;

    if (!type || !assetName) {
      return error('INVALID_INPUT', 'Type and asset name are required', 400);
    }

    const validTypes = ['LAB_TEST', 'PORT_INSPECTION', 'ORIGIN_VERIFICATION', 'CARBON_AUDIT', 'QUALITY_TEST'];
    if (!validTypes.includes(type)) {
      return error('INVALID_INPUT', 'Invalid validation type', 400);
    }

    // Generate validation ID
    const validationId = `VAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    // Calculate ETA based on type
    const etaMap: Record<string, string> = {
      LAB_TEST: '2 hours',
      PORT_INSPECTION: '4 hours',
      ORIGIN_VERIFICATION: '1 day',
      CARBON_AUDIT: '6 hours',
      QUALITY_TEST: '3 hours',
    };

    const validation = await prisma.validation.create({
      data: {
        tenantId: authResult.tenantId,
        validationId,
        type,
        producerId,
        listingId,
        commodityId,
        assetName,
        priority,
        status: 'QUEUED',
        notes,
        eta: etaMap[type] || '1 day',
      },
      include: {
        producer: true,
        listing: true,
        commodity: true,
      },
    });

    return success(validation, 201);
  } catch (err) {
    logger.error('Validation creation error', err);
    return error('INTERNAL_ERROR', 'Failed to create validation', 500);
  }
}
