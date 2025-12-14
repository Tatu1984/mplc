// SRGG Marketplace - Parcels API (Land/Asset Management)
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { success, error, paginated, badRequest } from '@/lib/api-response';
import { z } from 'zod';

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

const createParcelSchema = z.object({
  producerId: z.string().cuid('Valid producer ID required'),
  name: z.string().optional(),
  area: z.number().positive('Area must be positive'),
  unit: z.enum(['hectares', 'acres', 'sq_meters']).default('hectares'),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    gpsCoordinates: z.string().optional(),
  }).optional(),
  ownership: z.enum(['REGISTERED', 'LEASED', 'COMMUNITY', 'GOVERNMENT']).default('REGISTERED'),
});

// GET /api/parcels - List parcels
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const producerId = searchParams.get('producerId');

    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (authResult.role === 'PRODUCER') {
      const producer = await prisma.producer.findFirst({
        where: { userId: authResult.userId },
      });
      if (producer) {
        where.producerId = producer.id;
      }
    } else if (producerId) {
      where.producerId = producerId;
    }

    // Non-super admins see only their tenant's data
    if (authResult.role !== 'SUPER_ADMIN') {
      where.producer = { tenantId: authResult.tenantId };
    }

    const [parcels, total] = await Promise.all([
      prisma.parcel.findMany({
        where,
        include: {
          producer: {
            select: { id: true, name: true, srggEid: true, type: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.parcel.count({ where }),
    ]);

    // Parse location JSON
    const parsedParcels = parcels.map(p => ({
      ...p,
      location: p.location ? JSON.parse(p.location) : null,
    }));

    return paginated(parsedParcels, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Parcels list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch parcels', 500);
  }
}

// POST /api/parcels - Create parcel
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const validation = createParcelSchema.safeParse(body);

    if (!validation.success) {
      return badRequest(validation.error.errors[0]?.message || 'Invalid input');
    }

    const { producerId, name, area, unit, location, ownership } = validation.data;

    // Verify producer exists and user has access
    const producer = await prisma.producer.findUnique({
      where: { id: producerId },
    });

    if (!producer) {
      return error('NOT_FOUND', 'Producer not found', 404);
    }

    // Producers can only add parcels to themselves
    if (authResult.role === 'PRODUCER' && producer.userId !== authResult.userId) {
      return error('FORBIDDEN', 'Cannot add parcels to another producer', 403);
    }

    // Non-super admins must be in the same tenant
    if (authResult.role !== 'SUPER_ADMIN' && producer.tenantId !== authResult.tenantId) {
      return error('FORBIDDEN', 'Access denied', 403);
    }

    // Generate parcel number
    const parcelCount = await prisma.parcel.count({ where: { producerId } });
    const parcelNumber = `${producer.srggEid}-P${(parcelCount + 1).toString().padStart(3, '0')}`;

    const parcel = await prisma.parcel.create({
      data: {
        producerId,
        parcelNumber,
        name,
        area,
        unit,
        location: location ? JSON.stringify(location) : '{}',
        gpsCoords: location?.gpsCoordinates,
        ownership,
      },
      include: {
        producer: {
          select: { id: true, name: true, srggEid: true },
        },
      },
    });

    return success({
      ...parcel,
      location: location || null,
    }, 201);
  } catch (err) {
    logger.error('Parcel creation error', err);
    return error('INTERNAL_ERROR', 'Failed to create parcel', 500);
  }
}

// PATCH /api/parcels - Update parcel
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { parcelId, name, area, unit, location, ownership } = body;

    if (!parcelId) {
      return badRequest('Parcel ID is required');
    }

    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { producer: true },
    });

    if (!parcel) {
      return error('NOT_FOUND', 'Parcel not found', 404);
    }

    // Check access
    if (authResult.role === 'PRODUCER' && parcel.producer.userId !== authResult.userId) {
      return error('FORBIDDEN', 'Access denied', 403);
    }

    if (authResult.role !== 'SUPER_ADMIN' && parcel.producer.tenantId !== authResult.tenantId) {
      return error('FORBIDDEN', 'Access denied', 403);
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (area !== undefined) updateData.area = area;
    if (unit !== undefined) updateData.unit = unit;
    if (location !== undefined) {
      updateData.location = JSON.stringify(location);
      if (location.gpsCoordinates) {
        updateData.gpsCoords = location.gpsCoordinates;
      }
    }
    if (ownership !== undefined) updateData.ownership = ownership;

    const updated = await prisma.parcel.update({
      where: { id: parcelId },
      data: updateData,
      include: {
        producer: {
          select: { id: true, name: true, srggEid: true },
        },
      },
    });

    return success({
      ...updated,
      location: updated.location ? JSON.parse(updated.location) : null,
    });
  } catch (err) {
    logger.error('Parcel update error', err);
    return error('INTERNAL_ERROR', 'Failed to update parcel', 500);
  }
}

// DELETE /api/parcels - Delete parcel
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const parcelId = searchParams.get('id');

    if (!parcelId) {
      return badRequest('Parcel ID is required');
    }

    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { producer: true },
    });

    if (!parcel) {
      return error('NOT_FOUND', 'Parcel not found', 404);
    }

    // Check access
    if (authResult.role === 'PRODUCER' && parcel.producer.userId !== authResult.userId) {
      return error('FORBIDDEN', 'Access denied', 403);
    }

    if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(authResult.role) &&
        parcel.producer.tenantId !== authResult.tenantId) {
      return error('FORBIDDEN', 'Access denied', 403);
    }

    await prisma.parcel.delete({
      where: { id: parcelId },
    });

    return success({ message: 'Parcel deleted successfully' });
  } catch (err) {
    logger.error('Parcel deletion error', err);
    return error('INTERNAL_ERROR', 'Failed to delete parcel', 500);
  }
}
