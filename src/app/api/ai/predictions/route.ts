// SRGG Marketplace - Quantum AI Predictions API
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { success, error } from '@/lib/api-response';
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

// GET /api/ai/predictions - Get market predictions
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const commodityIds = searchParams.get('commodities')?.split(',').filter(Boolean);
    const timeframe = (searchParams.get('timeframe') || '1M') as '1W' | '1M' | '3M' | '6M' | '1Y';

    const predictions = await quantumAI.predictMarketPrices(commodityIds, timeframe);

    return success({
      predictions,
      generatedAt: new Date().toISOString(),
      timeframe,
      modelVersion: '1.0.0',
    });
  } catch (err) {
    logger.error('AI predictions error', err);
    return error('INTERNAL_ERROR', 'Failed to generate predictions', 500);
  }
}

// POST /api/ai/predictions - Get specific predictions
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { commodityIds, timeframe = '1M' } = body;

    const predictions = await quantumAI.predictMarketPrices(
      commodityIds,
      timeframe as '1W' | '1M' | '3M' | '6M' | '1Y'
    );

    return success({
      predictions,
      generatedAt: new Date().toISOString(),
      timeframe,
    });
  } catch (err) {
    logger.error('AI predictions error', err);
    return error('INTERNAL_ERROR', 'Failed to generate predictions', 500);
  }
}
