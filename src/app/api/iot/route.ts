// SRGG Marketplace - IoT Data API (Sensor Integration)
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { success, error, paginated, badRequest } from '@/lib/api-response';
import { z } from 'zod';

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

// IoT Data Types
interface IoTReading {
  deviceId: string;
  sensorType: string;
  value: number;
  unit: string;
  location: {
    lat: number;
    lng: number;
    altitude?: number;
  };
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const iotReadingSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  sensorType: z.enum(['TEMPERATURE', 'HUMIDITY', 'SOIL_MOISTURE', 'GPS', 'WEIGHT', 'QUALITY', 'RFID']),
  value: z.number(),
  unit: z.string(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    altitude: z.number().optional(),
  }),
  parcelId: z.string().optional(),
  listingId: z.string().optional(),
  shipmentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// In-memory store for IoT data (in production, use time-series database)
const iotDataStore: IoTReading[] = [];

// GET /api/iot - Get IoT readings
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const sensorType = searchParams.get('sensorType');
    const parcelId = searchParams.get('parcelId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Filter IoT data
    let filteredData = [...iotDataStore];
    if (deviceId) {
      filteredData = filteredData.filter(d => d.deviceId === deviceId);
    }
    if (sensorType) {
      filteredData = filteredData.filter(d => d.sensorType === sensorType);
    }

    // Simulate real-time data for demo
    if (filteredData.length === 0) {
      filteredData = generateDemoIoTData();
    }

    const total = filteredData.length;
    const paginatedData = filteredData.slice((page - 1) * limit, page * limit);

    // Also get linked parcels/shipments if specified
    let linkedAssets = null;
    if (parcelId) {
      linkedAssets = await prisma.parcel.findUnique({
        where: { id: parcelId },
        include: { producer: { select: { name: true, srggEid: true } } },
      });
    }

    return paginated(paginatedData, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    logger.error('IoT data fetch error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch IoT data', 500);
  }
}

// POST /api/iot - Ingest IoT reading
export async function POST(request: NextRequest) {
  try {
    // IoT endpoints may use API keys instead of JWT
    const apiKey = request.headers.get('x-api-key');
    const authResult = await getAuthUser(request);

    if (!authResult && !apiKey) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    // Validate API key (simplified - in production, validate against database)
    if (apiKey && !apiKey.startsWith('srgg_iot_')) {
      return error('UNAUTHORIZED', 'Invalid API key', 401);
    }

    const body = await request.json();

    // Handle batch submissions
    const readings = Array.isArray(body) ? body : [body];
    const validatedReadings: IoTReading[] = [];
    const errors: string[] = [];

    for (const reading of readings) {
      const validation = iotReadingSchema.safeParse(reading);
      if (validation.success) {
        validatedReadings.push({
          ...validation.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        errors.push(`Device ${reading.deviceId || 'unknown'}: ${validation.error.errors[0]?.message}`);
      }
    }

    if (validatedReadings.length === 0) {
      return badRequest(errors.join('; '));
    }

    // Store readings
    iotDataStore.push(...validatedReadings);

    // Keep only last 10000 readings in memory
    while (iotDataStore.length > 10000) {
      iotDataStore.shift();
    }

    // Process alerts for critical thresholds
    for (const reading of validatedReadings) {
      await processIoTAlerts(reading);
    }

    // Log to analytics
    await prisma.analyticsEvent.createMany({
      data: validatedReadings.map(r => ({
        type: 'IOT_READING',
        category: r.sensorType,
        value: r.value,
        metadata: JSON.stringify({ deviceId: r.deviceId, location: r.location }),
      })),
    });

    return success({
      accepted: validatedReadings.length,
      rejected: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Processed ${validatedReadings.length} IoT readings`,
    }, 201);
  } catch (err) {
    logger.error('IoT data ingestion error', err);
    return error('INTERNAL_ERROR', 'Failed to ingest IoT data', 500);
  }
}

// Process IoT alerts for critical values
async function processIoTAlerts(reading: IoTReading) {
  const alertThresholds: Record<string, { min?: number; max?: number }> = {
    TEMPERATURE: { min: -5, max: 45 },
    HUMIDITY: { min: 20, max: 95 },
    SOIL_MOISTURE: { min: 15, max: 90 },
  };

  const threshold = alertThresholds[reading.sensorType];
  if (!threshold) return;

  const isCritical =
    (threshold.min !== undefined && reading.value < threshold.min) ||
    (threshold.max !== undefined && reading.value > threshold.max);

  if (isCritical) {
    logger.warn('IoT Alert triggered', {
      deviceId: reading.deviceId,
      sensorType: reading.sensorType,
      value: reading.value,
      threshold,
    });

    // In production, create notification and trigger webhooks
  }
}

// Generate demo IoT data
function generateDemoIoTData(): IoTReading[] {
  const devices = ['IOT-GH-001', 'IOT-GH-002', 'IOT-DR-001', 'IOT-DR-002'];
  const sensorTypes = ['TEMPERATURE', 'HUMIDITY', 'SOIL_MOISTURE', 'GPS'];
  const data: IoTReading[] = [];

  for (let i = 0; i < 20; i++) {
    const sensorType = sensorTypes[i % sensorTypes.length];
    let value: number;
    let unit: string;

    switch (sensorType) {
      case 'TEMPERATURE':
        value = 25 + Math.random() * 10;
        unit = '°C';
        break;
      case 'HUMIDITY':
        value = 60 + Math.random() * 30;
        unit = '%';
        break;
      case 'SOIL_MOISTURE':
        value = 40 + Math.random() * 40;
        unit = '%';
        break;
      default:
        value = Math.random() * 100;
        unit = 'unit';
    }

    data.push({
      deviceId: devices[i % devices.length],
      sensorType,
      value: Math.round(value * 10) / 10,
      unit,
      location: {
        lat: 5.6037 + Math.random() * 0.1,
        lng: -0.1870 + Math.random() * 0.1,
      },
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
    });
  }

  return data;
}
