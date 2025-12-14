// SRGG Marketplace - Users API (Admin Management)
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyToken, hashPassword, ROLE_PERMISSIONS } from '@/lib/auth';
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

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCER', 'BUYER', 'BROKER', 'VALIDATOR', 'FINANCE', 'AUDITOR']),
});

// GET /api/users - List users
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    // Only admins can list users
    if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(authResult.role)) {
      return error('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    // Non-super admins can only see their tenant's users
    if (authResult.role !== 'SUPER_ADMIN') {
      where.tenantId = authResult.tenantId;
    }

    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          avatar: true,
          createdAt: true,
          lastLoginAt: true,
          tenant: { select: { id: true, name: true, country: true } },
          producer: { select: { id: true, srggEid: true, type: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return paginated(users, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Users list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch users', 500);
  }
}

// POST /api/users - Create user
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    // Only admins can create users
    if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(authResult.role)) {
      return error('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return badRequest(validation.error.errors[0]?.message || 'Invalid input');
    }

    const { email, password, name, phone, role } = validation.data;

    // Tenant admins cannot create super admins
    if (authResult.role === 'TENANT_ADMIN' && role === 'SUPER_ADMIN') {
      return error('FORBIDDEN', 'Cannot create super admin users', 403);
    }

    // Check if email already exists in tenant
    const existing = await prisma.user.findFirst({
      where: { tenantId: authResult.tenantId, email },
    });

    if (existing) {
      return badRequest('A user with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get role permissions
    const permissions = ROLE_PERMISSIONS[role] || [];

    const user = await prisma.user.create({
      data: {
        tenantId: authResult.tenantId,
        email,
        password: hashedPassword,
        name,
        phone,
        role,
        permissions: JSON.stringify(permissions),
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        tenant: { select: { id: true, name: true } },
      },
    });

    return success(user, 201);
  } catch (err) {
    logger.error('User creation error', err);
    return error('INTERNAL_ERROR', 'Failed to create user', 500);
  }
}

// PATCH /api/users - Update user status
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
    const { userId, status, role } = body;

    if (!userId) {
      return badRequest('User ID is required');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return error('NOT_FOUND', 'User not found', 404);
    }

    // Tenant admins can only manage their tenant's users
    if (authResult.role === 'TENANT_ADMIN' && user.tenantId !== authResult.tenantId) {
      return error('FORBIDDEN', 'Access denied', 403);
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (role && authResult.role === 'SUPER_ADMIN') {
      updateData.role = role;
      updateData.permissions = JSON.stringify(ROLE_PERMISSIONS[role] || []);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    return success(updated);
  } catch (err) {
    logger.error('User update error', err);
    return error('INTERNAL_ERROR', 'Failed to update user', 500);
  }
}
