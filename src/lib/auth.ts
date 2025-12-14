import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';

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

export interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  [key: string]: unknown;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await compare(password, hashedPassword);
}

// JWT functions
export async function signToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '7d')
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Session management
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createSession(userId: string, token: string, _metadata?: unknown) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  return await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
}

export async function getSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

export async function deleteSession(token: string) {
  await prisma.session.delete({
    where: { token },
  });
}

// Permission checking
export function hasPermission(userPermissions: string[], required: string | string[]): boolean {
  const requiredPerms = Array.isArray(required) ? required : [required];

  // Super admins have all permissions
  if (userPermissions.includes('*')) {
    return true;
  }

  // Check if user has any of the required permissions
  return requiredPerms.some(perm => userPermissions.includes(perm));
}

// Role-based permissions
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: [
    'tenant:read',
    'tenant:update',
    'users:*',
    'producers:*',
    'listings:*',
    'orders:*',
    'validations:*',
    'analytics:read',
  ],
  PRODUCER: [
    'producer:read',
    'producer:update',
    'parcels:create',
    'parcels:read',
    'parcels:update',
    'listings:create',
    'listings:read',
    'listings:update',
    'listings:delete',
    'orders:read',
    'certificates:read',
  ],
  BUYER: [
    'listings:read',
    'orders:create',
    'orders:read',
    'orders:update',
    'payments:create',
    'payments:read',
  ],
  BROKER: [
    'producers:read',
    'listings:*',
    'orders:*',
    'validations:read',
    'insurance:*',
    'hedge:*',
    'analytics:read',
  ],
  VALIDATOR: [
    'validations:create',
    'validations:read',
    'validations:update',
    'certificates:create',
    'certificates:read',
  ],
  FINANCE: [
    'payments:*',
    'orders:read',
    'insurance:read',
    'hedge:read',
    'analytics:read',
  ],
  AUDITOR: [
    'tenant:read',
    'users:read',
    'producers:read',
    'listings:read',
    'orders:read',
    'payments:read',
    'validations:read',
    'certificates:read',
    'analytics:read',
    'audit_logs:read',
  ],
};

export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] || [];
}
