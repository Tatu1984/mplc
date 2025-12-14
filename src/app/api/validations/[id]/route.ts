// SRGG Marketplace - Individual Validation API
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

// GET /api/validations/[id] - Get single validation
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

    const validation = await prisma.validation.findUnique({
      where: { id },
      include: {
        producer: true,
        listing: true,
        commodity: true,
        certificates: true,
      },
    });

    if (!validation) {
      return error('NOT_FOUND', 'Validation not found', 404);
    }

    return success(validation);
  } catch (err) {
    logger.error('Validation fetch error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch validation', 500);
  }
}

// PATCH /api/validations/[id] - Update validation status
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
    const { status, results, notes } = body;

    const validation = await prisma.validation.findUnique({
      where: { id },
    });

    if (!validation) {
      return error('NOT_FOUND', 'Validation not found', 404);
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }
    if (results) updateData.results = JSON.stringify(results);
    if (notes) updateData.notes = notes;

    const updated = await prisma.validation.update({
      where: { id },
      data: updateData,
      include: {
        producer: true,
        listing: true,
        commodity: true,
        certificates: true,
      },
    });

    // If completed successfully, create a certificate
    if (status === 'COMPLETED' && results?.passed) {
      const certNumber = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

      await prisma.certificate.create({
        data: {
          certificateNumber: certNumber,
          validationId: id,
          type: validation.type.includes('CARBON') ? 'CARBON' : 'QUALITY',
          issuedTo: validation.assetName,
          issuedBy: 'SRGG Certification Authority',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          status: 'ACTIVE',
        },
      });

      // Update listing as verified if applicable
      if (validation.listingId) {
        await prisma.listing.update({
          where: { id: validation.listingId },
          data: { isVerified: true },
        });
      }
    }

    return success(updated);
  } catch (err) {
    logger.error('Validation update error', err);
    return error('INTERNAL_ERROR', 'Failed to update validation', 500);
  }
}

// DELETE /api/validations/[id] - Delete validation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    // Only admins can delete validations
    if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(authResult.role)) {
      return error('FORBIDDEN', 'Forbidden', 403);
    }

    const { id } = await params;

    const validation = await prisma.validation.findUnique({
      where: { id },
    });

    if (!validation) {
      return error('NOT_FOUND', 'Validation not found', 404);
    }

    if (validation.status !== 'QUEUED') {
      return error('CONFLICT', 'Can only delete queued validations', 400);
    }

    await prisma.validation.delete({ where: { id } });

    return success({ deleted: true });
  } catch (err) {
    logger.error('Validation delete error', err);
    return error('INTERNAL_ERROR', 'Failed to delete validation', 500);
  }
}
