// SRGG Marketplace - Tenants API (Multi-tenant Management)
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

const createTenantSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  slug: z.string().min(2, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  country: z.string().min(2, 'Country is required'),
  currency: z.string().default('USD'),
});

// GET /api/tenants - List tenants
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    // Only super admins can list all tenants
    if (authResult.role !== 'SUPER_ADMIN') {
      // Return only the user's tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: authResult.tenantId },
        include: {
          _count: {
            select: { users: true, producers: true, listings: true, orders: true },
          },
        },
      });
      return success(tenant ? [tenant] : []);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const country = searchParams.get('country');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (country) where.country = country;

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          _count: {
            select: { users: true, producers: true, listings: true, orders: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tenant.count({ where }),
    ]);

    return paginated(tenants, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Tenants list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch tenants', 500);
  }
}

// POST /api/tenants - Create tenant (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (authResult.role !== 'SUPER_ADMIN') {
      return error('FORBIDDEN', 'Only super admins can create tenants', 403);
    }

    const body = await request.json();
    const validation = createTenantSchema.safeParse(body);

    if (!validation.success) {
      return badRequest(validation.error.errors[0]?.message || 'Invalid input');
    }

    const { name, slug, country, currency } = validation.data;

    // Check slug uniqueness
    const existing = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existing) {
      return badRequest('A tenant with this slug already exists');
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        country,
        currency,
        status: 'ACTIVE',
      },
    });

    return success(tenant, 201);
  } catch (err) {
    logger.error('Tenant creation error', err);
    return error('INTERNAL_ERROR', 'Failed to create tenant', 500);
  }
}

// PATCH /api/tenants - Update tenant
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { tenantId, name, status, currency } = body;

    // Only super admins can update any tenant
    // Tenant admins can only update their own tenant
    const targetTenantId = authResult.role === 'SUPER_ADMIN' ? tenantId : authResult.tenantId;

    if (!targetTenantId) {
      return badRequest('Tenant ID is required');
    }

    // Tenant admins cannot change status
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (currency) updateData.currency = currency;
    if (status && authResult.role === 'SUPER_ADMIN') {
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return badRequest('No fields to update');
    }

    const tenant = await prisma.tenant.update({
      where: { id: targetTenantId },
      data: updateData,
    });

    return success(tenant);
  } catch (err) {
    logger.error('Tenant update error', err);
    return error('INTERNAL_ERROR', 'Failed to update tenant', 500);
  }
}
