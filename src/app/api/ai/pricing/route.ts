// SRGG Marketplace - Quantum AI Dynamic Pricing API
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { success, error, badRequest } from '@/lib/api-response';
import { quantumAI } from '@/lib/quantum-ai';

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

// GET /api/ai/pricing - Get dynamic pricing suggestion
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');

    if (!listingId) {
      return badRequest('listingId is required');
    }

    const pricing = await quantumAI.calculateDynamicPrice(listingId);

    return success({
      pricing,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('AI pricing error', err);
    return error('INTERNAL_ERROR', 'Failed to calculate pricing', 500);
  }
}

// POST /api/ai/pricing/optimize - Optimize route/supply chain
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { origin, destination, cargo } = body;

    if (!origin || !destination) {
      return badRequest('origin and destination are required');
    }

    const optimization = await quantumAI.optimizeSupplyChain(origin, destination, cargo || 'general');

    return success({
      optimization,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('AI supply chain optimization error', err);
    return error('INTERNAL_ERROR', 'Failed to optimize supply chain', 500);
  }
}
