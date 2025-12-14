// SRGG Marketplace - Insurance Quote API
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { success, error } from '@/lib/api-response';

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

// POST /api/insurance/quote - Get insurance quote
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { type, coverageAmount, durationMonths = 12 } = body;

    if (!type || !coverageAmount) {
      return error('INVALID_INPUT', 'Type and coverage amount are required', 400);
    }

    // Premium calculation (simplified - real implementation would call Lloyd's API)
    const baseRates: Record<string, number> = {
      CROP: 0.03,
      LIVESTOCK: 0.05,
      MARITIME: 0.02,
      MINERAL: 0.04,
      CARBON: 0.025,
      CULTURAL_IP: 0.035,
      SUPPLY_CHAIN: 0.015,
    };

    const baseRate = baseRates[type] || 0.03;
    const annualPremium = coverageAmount * baseRate;
    const premium = (annualPremium / 12) * durationMonths;

    // Risk factors (simulated)
    const riskFactors = {
      weatherRisk: type === 'CROP' ? 'MEDIUM' : 'LOW',
      marketRisk: ['MINERAL', 'CARBON'].includes(type) ? 'HIGH' : 'MEDIUM',
      operationalRisk: type === 'MARITIME' ? 'HIGH' : 'LOW',
    };

    const quote = {
      quoteId: `QTE-${Date.now().toString(36).toUpperCase()}`,
      type,
      coverageAmount,
      durationMonths,
      premium: Math.round(premium * 100) / 100,
      annualPremium: Math.round(annualPremium * 100) / 100,
      provider: "Lloyd's of London",
      riskFactors,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      terms: {
        deductible: coverageAmount * 0.05, // 5% deductible
        maxClaimPercentage: 100,
        waitingPeriod: '7 days',
        exclusions: ['War', 'Nuclear', 'Cyber attacks'],
      },
    };

    return success(quote);
  } catch (err) {
    logger.error('Quote error', err);
    return error('INTERNAL_ERROR', 'Failed to generate quote', 500);
  }
}
