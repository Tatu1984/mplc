// SRGG Marketplace - User Settings API
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { success, error } from '@/lib/api-response';
import bcrypt from 'bcryptjs';

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

// GET /api/settings - Get user settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        settings: true,
        createdAt: true,
        tenant: {
          select: {
            name: true,
            country: true,
          },
        },
      },
    });

    if (!user) {
      return error('NOT_FOUND', 'User not found', 404);
    }

    return success({
      ...user,
      settings: user.settings ? JSON.parse(user.settings) : {},
    });
  } catch (err) {
    logger.error('Settings fetch error', err);
    return error('INTERNAL_ERROR', 'Failed to fetch settings', 500);
  }
}

// PATCH /api/settings - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult) {
      return error('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await request.json();
    const { name, phone, avatar, settings, currentPassword, newPassword } = body;

    const updateData: Record<string, unknown> = {};

    // Update profile fields
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatar) updateData.avatar = avatar;
    if (settings) updateData.settings = JSON.stringify(settings);

    // Handle password change
    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({
        where: { id: authResult.userId },
      });

      if (!user || !user.password) {
        return error('NOT_FOUND', 'User not found', 404);
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return error('INVALID_INPUT', 'Current password is incorrect', 400);
      }

      if (newPassword.length < 8) {
        return error('INVALID_INPUT', 'New password must be at least 8 characters', 400);
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return error('INVALID_INPUT', 'No fields to update', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: authResult.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        settings: true,
      },
    });

    return success({
      ...updatedUser,
      settings: updatedUser.settings ? JSON.parse(updatedUser.settings) : {},
      message: 'Settings updated successfully',
    });
  } catch (err) {
    logger.error('Settings update error', err);
    return error('INTERNAL_ERROR', 'Failed to update settings', 500);
  }
}
