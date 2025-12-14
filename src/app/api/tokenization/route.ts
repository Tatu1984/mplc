// SRGG Marketplace - Tokenization API (Blockchain Integration)
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

// GET /api/tokenization - List tokens
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

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [tokens, total] = await Promise.all([
      prisma.token.findMany({
        where,
        include: {
          listing: {
            include: {
              producer: true,
              commodity: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.token.count({ where }),
    ]);

    // Transform data for frontend
    const transformedTokens = tokens.map(token => ({
      id: token.tokenId,
      asset: token.listing.title,
      value: `$${token.listing.totalPrice.toLocaleString()}`,
      tokens: token.totalSupply.toLocaleString(),
      status: token.status.toLowerCase(),
      blockchain: token.blockchain,
      owner: token.owner,
      mintedAt: token.mintedAt,
      listing: token.listing,
    }));

    return paginated(transformedTokens, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Token list error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch tokens', 500);
  }
}

// POST /api/tokenization - Mint new token
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { listingId, tokenType = 'NFT' } = body;

    if (!listingId) {
      return error('INVALID_INPUT', 'Listing ID is required', 400);
    }

    // Verify listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { producer: true, commodity: true },
    });

    if (!listing) {
      return error('NOT_FOUND', 'Listing not found', 404);
    }

    // Check if already tokenized
    const existingToken = await prisma.token.findFirst({
      where: { listingId, status: { not: 'BURNED' } },
    });

    if (existingToken) {
      return error('CONFLICT', 'Listing is already tokenized', 400);
    }

    // Generate token ID (simulated blockchain minting)
    const tokenId = `TKN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const contractAddress = `0x${Math.random().toString(16).substring(2, 42)}`;

    const token = await prisma.token.create({
      data: {
        tokenId,
        listingId,
        tokenType,
        totalSupply: tokenType === 'NFT' ? 1 : listing.quantity,
        owner: listing.producer.userId,
        blockchain: 'Polygon',
        contractAddress,
        status: 'MINTED',
        mintedAt: new Date(),
        metadata: JSON.stringify({
          name: listing.title,
          description: listing.description,
          commodity: listing.commodity.name,
          quantity: listing.quantity,
          unit: listing.unit,
          origin: listing.origin,
          producer: listing.producer.name,
          mintedBy: 'SRGG Marketplace',
        }),
      },
      include: {
        listing: {
          include: {
            producer: true,
            commodity: true,
          },
        },
      },
    });

    // Update listing as tokenized
    await prisma.listing.update({
      where: { id: listingId },
      data: { isTokenized: true },
    });

    return success({
      id: token.tokenId,
      asset: token.listing.title,
      value: `$${token.listing.totalPrice.toLocaleString()}`,
      tokens: token.totalSupply.toLocaleString(),
      status: 'minted',
      blockchain: token.blockchain,
      contractAddress: token.contractAddress,
      txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    }, 201);
  } catch (err) {
    logger.error('Token creation error', err);
    return error('INTERNAL_ERROR', 'Failed to mint token', 500);
  }
}
