import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { catchAsync } from '@/utils/catchAsync';
import { ApiError } from '@/utils/apiError';
import * as creatorService from '@/services/creator.service';

const actorId = (req: AuthRequest) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  return req.user.id;
};

export const getMySubscriptionPrice = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await creatorService.getMySubscriptionPrice(actorId(req));
  res.json({ status: 'success', data });
});

export const updateMySubscriptionPrice = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await creatorService.updateMySubscriptionPrice(actorId(req), req.body.price_ghs);
  res.json({ status: 'success', data });
});
