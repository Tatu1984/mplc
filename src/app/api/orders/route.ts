// SRGG Marketplace - Orders API Routes
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { createOrderSchema, paginationSchema } from '@/lib/validation';
import {
  success,
  created,
  paginated,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  withErrorHandler,
  parseJsonBody,
  getSearchParams,
} from '@/lib/api-response';

// ============================================================================
// Helper Functions
// ============================================================================

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') ||
                request.cookies.get('token')?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return payload;
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

// ============================================================================
// GET /api/orders - List orders
// ============================================================================

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized('Authentication required');
    }

    const searchParams = getSearchParams(request);
    const { page, limit, sortBy, sortOrder } = paginationSchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    // Build where clause based on user role
    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (user.role === 'BUYER') {
      where.buyerId = user.userId;
    } else if (user.role === 'PRODUCER') {
      // Producers see orders for their listings
      const producer = await prisma.producer.findFirst({
        where: { userId: user.userId },
      });
      if (producer) {
        where.listing = { producerId: producer.id };
      }
    } else if (user.role !== 'SUPER_ADMIN') {
      // Other roles see tenant orders
      where.tenantId = user.tenantId;
    }

    // Status filter
    const status = searchParams.get('status');
    if (status) {
      where.status = status;
    }

    // Payment status filter
    const paymentStatus = searchParams.get('paymentStatus');
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    // Date range filter
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    // Count total
    const total = await prisma.order.count({ where });

    // Fetch orders
    const orders = await prisma.order.findMany({
      where,
      include: {
        listing: {
          include: {
            commodity: true,
            producer: {
              select: { id: true, name: true, srggEid: true },
            },
          },
        },
        buyer: {
          select: { id: true, name: true, email: true },
        },
        tenant: {
          select: { id: true, name: true, country: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { payments: true },
        },
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return paginated(orders, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  });
}

// ============================================================================
// POST /api/orders - Create new order
// ============================================================================

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized('Authentication required');
    }

    // Any authenticated user can create orders (as a buyer)
    // Only producers purchasing their own listings will be blocked later

    const body = await parseJsonBody(request);
    if (!body) {
      return badRequest('Invalid JSON body');
    }

    // Validate input
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const data = validation.data;

    // Verify listing exists and is active
    const listing = await prisma.listing.findUnique({
      where: { id: data.listingId },
      include: {
        producer: true,
        tenant: true,
      },
    });

    if (!listing) {
      return notFound('Listing');
    }

    if (listing.status !== 'ACTIVE') {
      return badRequest('Listing is not available for purchase');
    }

    // Check quantity
    if (data.quantity > listing.quantity) {
      return badRequest(`Insufficient quantity available. Only ${listing.quantity} ${listing.unit} available.`);
    }

    // Prevent self-purchase
    if (listing.producer.userId === user.userId) {
      return badRequest('Cannot purchase your own listing');
    }

    // Calculate prices
    const totalPrice = data.quantity * listing.pricePerUnit;

    // Create order
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          tenantId: listing.tenantId,
          orderNumber: generateOrderNumber(),
          buyerId: user.userId,
          listingId: data.listingId,
          quantity: data.quantity,
          pricePerUnit: listing.pricePerUnit,
          totalPrice,
          currency: listing.currency,
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
        include: {
          listing: {
            include: {
              commodity: true,
              producer: {
                select: { id: true, name: true, srggEid: true },
              },
            },
          },
          buyer: {
            select: { id: true, name: true, email: true },
          },
          tenant: {
            select: { id: true, name: true, country: true },
          },
        },
      });

      // Update listing quantity (reserve the ordered quantity)
      await tx.listing.update({
        where: { id: data.listingId },
        data: {
          quantity: listing.quantity - data.quantity,
          // Mark as sold if all quantity is ordered
          ...(listing.quantity - data.quantity <= 0 && { status: 'SOLD' }),
        },
      });

      return newOrder;
    });

    return created(order);
  });
}
