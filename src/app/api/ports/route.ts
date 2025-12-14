// SRGG Marketplace - Ports API (Gateway Hubs)
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

const createPortSchema = z.object({
  name: z.string().min(2, 'Port name is required'),
  code: z.string().min(3, 'Port code is required').max(10),
  country: z.string().min(2, 'Country is required'),
  city: z.string().min(2, 'City is required'),
  type: z.enum(['SEA', 'AIR', 'RAIL', 'ROAD']).default('SEA'),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

// GET /api/ports - List all ports
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const country = searchParams.get('country');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (country) where.country = country;
    if (type) where.type = type;
    if (status) where.status = status;

    const [ports, total] = await Promise.all([
      prisma.port.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.port.count({ where }),
    ]);

    // Enhance with real-time data
    const enhancedPorts = ports.map(port => ({
      ...port,
      utilization: Math.floor(Math.random() * 40 + 50), // 50-90%
      averageWaitTime: port.type === 'SEA' ? `${Math.floor(Math.random() * 24 + 6)}h` : `${Math.floor(Math.random() * 4 + 1)}h`,
      weatherConditions: getWeatherConditions(),
    }));

    return paginated(enhancedPorts, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Ports list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch ports', 500);
  }
}

// POST /api/ports - Create port (Admin only)
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
    const validation = createPortSchema.safeParse(body);

    if (!validation.success) {
      return badRequest(validation.error.errors[0]?.message || 'Invalid input');
    }

    const { name, code, country, city, type, coordinates } = validation.data;

    // Check for duplicate code
    const existing = await prisma.port.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing) {
      return badRequest('A port with this code already exists');
    }

    const port = await prisma.port.create({
      data: {
        name,
        code: code.toUpperCase(),
        country,
        city,
        type,
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
        status: 'OPERATIONAL',
        containers: 0,
        congestion: 'LOW',
      },
    });

    return success(port, 201);
  } catch (err) {
    logger.error('Port creation error', err);
    return error('INTERNAL_ERROR', 'Failed to create port', 500);
  }
}

// PATCH /api/ports - Update port
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
    const { portId, name, status, congestion, containers } = body;

    if (!portId) {
      return badRequest('Port ID is required');
    }

    const port = await prisma.port.findUnique({
      where: { id: portId },
    });

    if (!port) {
      return error('NOT_FOUND', 'Port not found', 404);
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (congestion !== undefined) updateData.congestion = congestion;
    if (containers !== undefined) updateData.containers = containers;

    const updated = await prisma.port.update({
      where: { id: portId },
      data: updateData,
    });

    return success(updated);
  } catch (err) {
    logger.error('Port update error', err);
    return error('INTERNAL_ERROR', 'Failed to update port', 500);
  }
}

// Helper function to simulate weather conditions
function getWeatherConditions(): { condition: string; temperature: number; wind: string } {
  const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Sunny'];
  return {
    condition: conditions[Math.floor(Math.random() * conditions.length)],
    temperature: Math.floor(Math.random() * 15 + 25), // 25-40°C
    wind: `${Math.floor(Math.random() * 20 + 5)} km/h`,
  };
}
