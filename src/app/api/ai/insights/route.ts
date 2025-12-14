// SRGG Marketplace - Quantum AI Insights API
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

// GET /api/ai/insights - Get AI-generated insights
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const insights = await quantumAI.generateInsights(authResult.tenantId);

    return success({
      insights,
      generatedAt: new Date().toISOString(),
      modelVersion: '1.0.0',
    });
  } catch (err) {
    logger.error('AI insights error', err);
    return error('INTERNAL_ERROR', 'Failed to generate insights', 500);
  }
}
