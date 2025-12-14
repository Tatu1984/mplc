import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    // Only use fallback in development
    return new TextEncoder().encode('dev-only-secret-key-min-32-characters!!');
  }
  return new TextEncoder().encode(secret);
};

const JWT_SECRET = getJWTSecret();

export async function POST(req: NextRequest) {
  try {
    // Read body as text first to handle potential JSON parsing errors
    const rawBody = await req.text();

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (jsonError) {
      logger.error('JSON parsing error', jsonError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user with tenant and producer info using Prisma
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        tenant: true,
        producer: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Account is not active', details: { status: user.status } },
        { status: 403 }
      );
    }

    // Parse permissions if it's a JSON string
    let permissions: string[] = [];
    try {
      permissions = user.permissions ? JSON.parse(user.permissions) : [];
    } catch (e) {
      logger.warn('Permission parsing error', { error: e });
      permissions = [];
    }

    // Generate JWT token
    const token = await new SignJWT({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      permissions,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Return user data and token
    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenant: {
            id: user.tenantId,
            name: user.tenant.name,
            slug: user.tenant.slug,
            country: user.tenant.country,
          },
          producer: user.producer ? {
            id: user.producer.id,
            srggEid: user.producer.srggEid,
            type: user.producer.type,
            name: user.producer.name,
          } : null,
        },
      },
    });
  } catch (error) {
    logger.error('Login error', error);
    return NextResponse.json(
      { success: false, error: 'Login failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
