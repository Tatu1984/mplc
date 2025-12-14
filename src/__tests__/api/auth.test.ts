// SRGG Marketplace - Auth API Tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

describe('Auth API', () => {
  const testEmail = 'test-auth@srgg.com';
  const testPassword = 'TestPassword123!';
  let testUserId: string;
  let testTenantId: string;

  beforeAll(async () => {
    // Get or create test tenant
    let tenant = await prisma.tenant.findFirst({ where: { slug: 'test-tenant' } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          slug: 'test-tenant',
          country: 'Ghana',
          currency: 'USD',
          status: 'ACTIVE',
        },
      });
    }
    testTenantId = tenant.id;

    // Create test user
    const hashedPassword = await hashPassword(testPassword);
    const user = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        email: testEmail,
        password: hashedPassword,
        name: 'Test User',
        role: 'BUYER',
        status: 'ACTIVE',
        permissions: JSON.stringify(['listings:read', 'orders:create']),
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await fetch('http://localhost:3005/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('token');
      expect(data.data).toHaveProperty('user');
      expect(data.data.user.email).toBe(testEmail);
    });

    it('should reject invalid password', async () => {
      const response = await fetch('http://localhost:3005/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'wrongpassword',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const response = await fetch('http://localhost:3005/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: testPassword,
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await fetch('http://localhost:3005/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: testPassword,
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/register', () => {
    const registerEmail = 'test-register@srgg.com';

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { email: registerEmail } });
    });

    it('should successfully register a new user', async () => {
      const response = await fetch('http://localhost:3005/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          password: 'NewUser123!',
          name: 'New Test User',
          role: 'BUYER',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('token');
      expect(data.data).toHaveProperty('user');
    });

    it('should reject duplicate email', async () => {
      const response = await fetch('http://localhost:3005/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail, // Already exists
          password: 'NewUser123!',
          name: 'Duplicate User',
          role: 'BUYER',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate password strength', async () => {
      const response = await fetch('http://localhost:3005/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'weak-password@test.com',
          password: '123', // Too short
          name: 'Weak Password User',
          role: 'BUYER',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
