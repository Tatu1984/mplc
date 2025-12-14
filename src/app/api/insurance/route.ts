// SRGG Marketplace - Insurance API (Lloyd's of London Integration)
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { success, error, paginated } from '@/lib/api-response';

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

// GET /api/insurance - List insurance policies
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = {
      tenantId: authResult.tenantId,
    };
    if (status) where.status = status;
    if (type) where.type = type;

    const [policies, total] = await Promise.all([
      prisma.insurancePolicy.findMany({
        where,
        include: {
          listing: true,
          claims: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.insurancePolicy.count({ where }),
    ]);

    // Transform for frontend
    const transformedPolicies = policies.map(policy => ({
      id: policy.policyNumber,
      type: formatPolicyType(policy.type),
      asset: policy.assetName,
      coverage: `$${policy.coverageAmount.toLocaleString()}`,
      premium: `$${policy.premium.toLocaleString()}/yr`,
      provider: policy.provider,
      status: policy.status.toLowerCase(),
      coverageStart: policy.coverageStart,
      coverageEnd: policy.coverageEnd,
      claims: policy.claims.length,
    }));

    return paginated(transformedPolicies, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Insurance list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch policies', 500);
  }
}

// POST /api/insurance - Create new policy
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const {
      type,
      listingId,
      assetName,
      assetType = 'LISTING',
      coverageAmount,
      startDate,
      endDate,
    } = body;

    if (!type || !assetName || !coverageAmount) {
      return error('INVALID_INPUT', 'Type, asset name, and coverage amount are required', 400);
    }

    // Calculate premium based on type
    const premiumRates: Record<string, number> = {
      CROP: 0.03,
      LIVESTOCK: 0.05,
      MARITIME: 0.02,
      MINERAL: 0.04,
      CARBON: 0.025,
      CULTURAL_IP: 0.035,
      SUPPLY_CHAIN: 0.015,
    };

    const premium = coverageAmount * (premiumRates[type] || 0.03);
    const policyNumber = `POL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const policy = await prisma.insurancePolicy.create({
      data: {
        tenantId: authResult.tenantId,
        policyNumber,
        type,
        listingId,
        assetName,
        assetType,
        coverageAmount,
        premium,
        currency: 'USD',
        provider: "Lloyd's of London",
        coverageStart: startDate ? new Date(startDate) : new Date(),
        coverageEnd: endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
      include: {
        listing: true,
        claims: true,
      },
    });

    // Update listing as insured
    if (listingId) {
      await prisma.listing.update({
        where: { id: listingId },
        data: { isInsured: true },
      });
    }

    return success({
      id: policy.policyNumber,
      type: formatPolicyType(policy.type),
      asset: policy.assetName,
      coverage: `$${policy.coverageAmount.toLocaleString()}`,
      premium: `$${policy.premium.toLocaleString()}/yr`,
      provider: policy.provider,
      status: 'active',
    }, 201);
  } catch (err) {
    logger.error('Insurance creation error', err);
    return error('INTERNAL_ERROR', 'Failed to create policy', 500);
  }
}

function formatPolicyType(type: string): string {
  const typeMap: Record<string, string> = {
    CROP: 'Parametric Crop',
    LIVESTOCK: 'Livestock Mortality',
    MARITIME: 'Maritime Shipping',
    MINERAL: 'Mineral Extraction',
    CARBON: 'Carbon Credit',
    CULTURAL_IP: 'Cultural IP',
    SUPPLY_CHAIN: 'Supply Chain',
  };
  return typeMap[type] || type;
}
