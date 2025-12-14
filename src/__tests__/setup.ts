// Test Setup for SRGG Marketplace
import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
(process.env as Record<string, string>).DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/srgg_test';
(process.env as Record<string, string>).JWT_SECRET = 'test-jwt-secret-key-min-32-characters!!';

// Global test setup
beforeAll(async () => {
  console.log('Setting up test environment...');
});

// Global test teardown
afterAll(async () => {
  console.log('Cleaning up test environment...');
});
