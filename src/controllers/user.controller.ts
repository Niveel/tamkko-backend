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
