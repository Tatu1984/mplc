// SRGG Marketplace - Logistics API (Shipment Tracking)
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

// GET /api/logistics - List shipments
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

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          order: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shipment.count({ where }),
    ]);

    // Transform for frontend
    const transformedShipments = shipments.map(ship => ({
      id: ship.shipmentId,
      cargo: ship.cargo,
      origin: ship.originPort || ship.origin,
      dest: ship.destinationPort || ship.destination,
      vessel: ship.vessel || 'TBD',
      status: ship.status.toLowerCase().replace('_', ' '),
      eta: ship.eta || 'Calculating...',
    }));

    return paginated(transformedShipments, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Logistics list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch shipments', 500);
  }
}

// POST /api/logistics - Create shipment
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const {
      orderId,
      cargo,
      quantity,
      unit,
      origin,
      originPort,
      destination,
      destinationPort,
      vessel,
      vesselType = 'SHIP',
      eta,
    } = body;

    if (!cargo || !origin || !destination) {
      return error('INVALID_INPUT', 'Cargo, origin, and destination are required', 400);
    }

    const shipmentId = `SHP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const shipment = await prisma.shipment.create({
      data: {
        tenantId: authResult.tenantId,
        shipmentId,
        orderId,
        cargo,
        quantity,
        unit,
        origin,
        originPort,
        destination,
        destinationPort,
        vessel,
        vesselType,
        status: 'PENDING',
        eta,
        trackingEvents: JSON.stringify([{
          timestamp: new Date().toISOString(),
          event: 'Shipment created',
          location: origin,
        }]),
      },
      include: {
        order: true,
      },
    });

    return success({
      id: shipment.shipmentId,
      cargo: shipment.cargo,
      origin: shipment.originPort || shipment.origin,
      dest: shipment.destinationPort || shipment.destination,
      vessel: shipment.vessel || 'TBD',
      status: 'pending',
      eta: shipment.eta || 'Calculating...',
      message: 'Shipment created successfully',
    }, 201);
  } catch (err) {
    logger.error('Logistics creation error', err);
    return error('INTERNAL_ERROR', 'Failed to create shipment', 500);
  }
}

// GET /api/logistics/ports - List available ports
export async function OPTIONS() {
  try {
    const ports = await prisma.port.findMany({
      where: { status: 'OPERATIONAL' },
      orderBy: { name: 'asc' },
    });

    return success(ports);
  } catch (err) {
    logger.error('Ports list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch ports', 500);
  }
}
