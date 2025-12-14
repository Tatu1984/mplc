// SRGG Marketplace - Individual Insurance Policy API
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
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

// GET /api/insurance/[id] - Get single policy
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { id } = await params;

    const policy = await prisma.insurancePolicy.findUnique({
      where: { id },
      include: {
        listing: true,
        claims: true,
      },
    });

    if (!policy) {
      return error('NOT_FOUND', 'Policy not found', 404);
    }

    return success(policy);
  } catch (err) {
    logger.error('Policy fetch error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch policy', 500);
  }
}

// PATCH /api/insurance/[id] - Update policy or file claim
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const { action, claimAmount, claimReason, status } = body;

    const policy = await prisma.insurancePolicy.findUnique({
      where: { id },
    });

    if (!policy) {
      return error('NOT_FOUND', 'Policy not found', 404);
    }

    // File a claim
    if (action === 'file_claim') {
      if (!claimAmount || !claimReason) {
        return error('INVALID_INPUT', 'Claim amount and reason are required', 400);
      }

      if (claimAmount > policy.coverageAmount) {
        return error('INVALID_INPUT', 'Claim amount exceeds coverage', 400);
      }

      const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

      const claim = await prisma.insuranceClaim.create({
        data: {
          policyId: id,
          claimNumber,
          amount: claimAmount,
          reason: claimReason,
          status: 'PENDING',
        },
      });

      await prisma.insurancePolicy.update({
        where: { id },
        data: { status: 'CLAIMED' },
      });

      return success(claim);
    }

    // Update policy status
    if (status) {
      const updated = await prisma.insurancePolicy.update({
        where: { id },
        data: { status },
        include: {
          listing: true,
          claims: true,
        },
      });

      return success(updated);
    }

    return error('INVALID_INPUT', 'No action specified', 400);
  } catch (err) {
    logger.error('Policy update error', err);
    return error('INTERNAL_ERROR', 'Failed to update policy', 500);
  }
}

// DELETE /api/insurance/[id] - Cancel policy
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { id } = await params;

    const policy = await prisma.insurancePolicy.findUnique({
      where: { id },
      include: { claims: true },
    });

    if (!policy) {
      return error('NOT_FOUND', 'Policy not found', 404);
    }

    if (policy.claims.length > 0) {
      return error('CONFLICT', 'Cannot cancel policy with active claims', 400);
    }

    await prisma.insurancePolicy.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return success({ cancelled: true });
  } catch (err) {
    logger.error('Policy cancellation error', err);
    return error('INTERNAL_ERROR', 'Failed to cancel policy', 500);
  }
}
