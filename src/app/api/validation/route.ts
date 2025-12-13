import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const certificates = await prisma.certificate.findMany({
      where: {
        type: { in: ['QUALITY', 'SGS', 'ISO'] },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    console.error('Validation fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quality certificates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Mock validation/certification
    const certificate = {
      id: `QC-${Date.now()}`,
      ...body,
      status: 'VERIFIED',
      verifier: 'SGS Ghana Ltd',
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: certificate,
      message: 'Quality certificate issued successfully'
    });
  } catch (error) {
    console.error('Validation creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create certificate' },
      { status: 500 }
    );
  }
}
