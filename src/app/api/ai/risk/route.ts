// SRGG Marketplace - Quantum AI Risk Assessment API
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

// GET /api/ai/risk - Get risk assessment
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const assetType = searchParams.get('assetType') as 'LISTING' | 'PRODUCER' | 'SHIPMENT' | 'REGION';

    if (!assetId || !assetType) {
      return badRequest('assetId and assetType are required');
    }

    const riskScore = await quantumAI.calculateRiskScore(assetId, assetType);

    return success({
      riskScore,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('AI risk assessment error', err);
    return error('INTERNAL_ERROR', 'Failed to calculate risk', 500);
  }
}

// POST /api/ai/risk/batch - Batch risk assessment
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { assets } = body;

    if (!Array.isArray(assets) || assets.length === 0) {
      return badRequest('assets array is required');
    }

    const results = await Promise.all(
      assets.map(async (asset: { id: string; type: 'LISTING' | 'PRODUCER' | 'SHIPMENT' | 'REGION' }) =>
        quantumAI.calculateRiskScore(asset.id, asset.type)
      )
    );

    return success({
      riskScores: results,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('AI batch risk error', err);
    return error('INTERNAL_ERROR', 'Failed to calculate risks', 500);
  }
}
