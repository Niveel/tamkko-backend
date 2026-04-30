import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { catchAsync } from '@/utils/catchAsync';
import { ApiError } from '@/utils/apiError';
import * as userService from '@/services/user.service';

export const getMyFollowers = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const data = await userService.getMyFollowers(req.user.id, {
    cursor: req.query.cursor as string | undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    q: req.query.q as string | undefined,
  });
  res.json({ status: 'success', data });
});

export const getMyFollowing = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const data = await userService.getMyFollowing(req.user.id, {
    cursor: req.query.cursor as string | undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    q: req.query.q as string | undefined,
  });
  res.json({ status: 'success', data });
});

export const getMySubscribers = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const data = await userService.getMySubscribers(req.user.id, {
    cursor: req.query.cursor as string | undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    q: req.query.q as string | undefined,
  });
  res.json({ status: 'success', data });
});

export const uploadMyAvatar = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: [{ message: 'avatar is required' }],
    });
  }

  const protocol = req.protocol || 'http';
  const host = req.get('host');
  if (!host) throw new ApiError(400, 'Invalid request host');
  const profilePicture = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;
  const data = await userService.uploadMyAvatar(req.user.id, profilePicture);
  res.json({ status: 'success', message: 'Avatar uploaded successfully', data });
});

export const updateMyAvatar = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  try {
    new URL(req.body?.profile_picture);
  } catch {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: [{ message: 'profile_picture must be a valid URL' }],
    });
  }
  const data = await userService.updateMyAvatar(req.user.id, req.body.profile_picture);
  res.json({ status: 'success', message: 'Avatar updated successfully', data });
});

export const deleteMyAvatar = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const data = await userService.deleteMyAvatar(req.user.id);
  res.json({ status: 'success', message: 'Avatar removed successfully', data });
});
