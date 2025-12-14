// SRGG Marketplace - Health Check API (Production-Ready)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: 'up' | 'down'; latency?: number };
    memory: { used: number; total: number; percentage: number };
  };
}

const startTime = Date.now();

// GET /api/health - Health check endpoint
export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  const health: HealthStatus = {
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    timestamp,
    uptime,
    checks: {
      database: { status: 'down' },
      memory: { used: 0, total: 0, percentage: 0 },
    },
  };

  // Check database connection
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    health.checks.database = { status: 'up', latency };
  } catch {
    health.checks.database = { status: 'down' };
    health.status = 'unhealthy';
  }

  // Check memory usage
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memory = process.memoryUsage();
    const used = Math.round(memory.heapUsed / 1024 / 1024);
    const total = Math.round(memory.heapTotal / 1024 / 1024);
    health.checks.memory = {
      used,
      total,
      percentage: Math.round((used / total) * 100),
    };

    // Mark as degraded if memory usage is high
    if (health.checks.memory.percentage > 90) {
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
  }

  // Return appropriate status code
  const statusCode = health.status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(health, { status: statusCode });
}
