import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createCommoditySchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const commodities = await prisma.commodity.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: commodities
    });
  } catch (error) {
    logger.error('Commodities fetch error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commodities' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validation = createCommoditySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.errors[0]?.message || 'Invalid input'
          }
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if commodity with same name already exists
    const existing = await prisma.commodity.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_EXISTS', message: 'A commodity with this name already exists' } },
        { status: 409 }
      );
    }

    // Create the new commodity
    const commodity = await prisma.commodity.create({
      data: {
        name: data.name,
        category: data.category,
        unit: data.unit,
        hsCode: data.hsCode || null,
        description: data.description || null,
        icon: data.icon || null,
      },
    });

    return NextResponse.json(
      { success: true, data: commodity },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Commodity creation error', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create commodity' } },
      { status: 500 }
    );
  }
}
