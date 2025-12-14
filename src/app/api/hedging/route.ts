// SRGG Marketplace - Hedging API (CME Integration)
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

// GET /api/hedging - List hedge positions
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

    const where: Record<string, unknown> = {
      tenantId: authResult.tenantId,
    };
    if (status) where.status = status;

    const [positions, total] = await Promise.all([
      prisma.hedgePosition.findMany({
        where,
        include: {
          commodityRef: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.hedgePosition.count({ where }),
    ]);

    // Transform for frontend
    const transformedPositions = positions.map(pos => ({
      id: pos.positionId,
      commodity: `${pos.commodity} Futures`,
      type: pos.direction === 'LONG' ? 'Long' : pos.direction === 'SHORT' ? 'Short' : pos.type,
      qty: `${pos.quantity} ${pos.unit}`,
      strike: `$${pos.strikePrice.toLocaleString()}/${pos.unit}`,
      expiry: new Date(pos.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      pnl: pos.pnl >= 0 ? `+$${pos.pnl.toLocaleString()}` : `-$${Math.abs(pos.pnl).toLocaleString()}`,
      status: pos.status.toLowerCase(),
      exchange: pos.exchange,
    }));

    return paginated(transformedPositions, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Hedging list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch positions', 500);
  }
}

// POST /api/hedging - Create hedge position
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const {
      commodityId,
      commodity,
      type = 'FUTURES',
      direction,
      quantity,
      unit,
      strikePrice,
      expiryDate,
    } = body;

    if (!commodity || !direction || !quantity || !strikePrice || !expiryDate) {
      return error('INVALID_INPUT', 'Missing required fields', 400);
    }

    // Find commodity by name if commodityId not provided
    let commId = commodityId;
    if (!commId) {
      const comm = await prisma.commodity.findFirst({
        where: { name: { contains: commodity.replace(' Futures', '').replace(' Options', '') } },
      });
      if (!comm) {
        return error('NOT_FOUND', 'Commodity not found', 404);
      }
      commId = comm.id;
    }

    const positionId = `HDG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const position = await prisma.hedgePosition.create({
      data: {
        tenantId: authResult.tenantId,
        positionId,
        commodityId: commId,
        commodity,
        type,
        direction,
        quantity,
        unit: unit || 'MT',
        strikePrice,
        currentPrice: strikePrice,
        currency: 'USD',
        expiryDate: new Date(expiryDate),
        pnl: 0,
        status: 'OPEN',
        exchange: 'CME',
      },
      include: {
        commodityRef: true,
      },
    });

    return success({
      id: position.positionId,
      commodity: `${position.commodity} Futures`,
      type: position.direction === 'LONG' ? 'Long' : 'Short',
      qty: `${position.quantity} ${position.unit}`,
      strike: `$${position.strikePrice.toLocaleString()}/${position.unit}`,
      status: 'open',
      exchange: position.exchange,
      message: 'Hedge position created successfully',
    }, 201);
  } catch (err) {
    logger.error('Hedging creation error', err);
    return error('INTERNAL_ERROR', 'Failed to create position', 500);
  }
}
