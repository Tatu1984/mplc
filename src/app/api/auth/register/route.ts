// SRGG Marketplace - User Registration API
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { hashPassword, signToken, ROLE_PERMISSIONS } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { success, error, badRequest, validationError } from '@/lib/api-response';

// POST /api/auth/register - Register new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { email, password, name, phone, role } = validation.data;

    // Get default tenant (in production, this would be based on registration flow)
    const tenant = await prisma.tenant.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    if (!tenant) {
      return error('SERVICE_UNAVAILABLE', 'No active tenant available for registration', 503);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: email.toLowerCase(),
      },
    });

    if (existingUser) {
      return badRequest('An account with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get role permissions
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['BUYER'];

    // Create user
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: email.toLowerCase(),
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
        tenant: {
          select: { id: true, name: true, country: true },
        },
      },
    });

    // If registering as producer, create producer profile
    if (role === 'PRODUCER') {
      const countryCode = tenant.country === 'Ghana' ? 'GH' : tenant.country === 'Dominican Republic' ? 'DR' : 'XX';
      const year = new Date().getFullYear().toString().slice(-2);
      const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
      const srggEid = `SRGG-${countryCode}-${year}-${random}`;

      await prisma.producer.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          srggEid,
          type: 'FARMER', // Default type
          name,
          phone: phone || '',
          email: email.toLowerCase(),
          verificationStatus: 'PENDING',
        },
      });
    }

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      permissions,
    });

    logger.info('User registered', { userId: user.id, email: user.email, role: user.role });

    return success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: user.tenant,
      },
      token,
      message: 'Registration successful',
    }, 201);
  } catch (err) {
    logger.error('Registration error', err);
    return error('INTERNAL_ERROR', 'Failed to register user', 500);
  }
}
