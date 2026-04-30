import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { catchAsync } from '@utils/catchAsync';
import { referralService } from '@services/referral.service';

export const getMyReferralCode = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await referralService.getMyCode(req.user!.id);
  res.json({ status: 'success', data: result });
});

export const validateReferralCode = catchAsync(async (req, res: Response) => {
  const result = await referralService.validateCode(req.params.referral_code);
  res.json({ status: 'success', data: result });
});

export const getReferralNetwork = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await referralService.network(req.user!.id);
  res.json({ status: 'success', data: result });
});

export const getReferralEarnings = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await referralService.earnings(req.user!.id, req.query.period as string | undefined);
  res.json({ status: 'success', data: result });
});

export const getLeaderboard = catchAsync(async (req, res: Response) => {
  const result = await referralService.leaderboard(Number(req.query.limit || 20));
  res.json({ status: 'success', data: result });
});

export const applyForAmbassador = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await referralService.applyAmbassador(req.user!.id, req.body);
  res.status(201).json({ status: 'success', message: 'Ambassador application submitted.', data: result });
});

export const getAmbassadorStatus = catchAsync(async (_req: AuthRequest, res: Response) => {
  const result = await referralService.getAmbassadorStatus(_req.user!.id);
  res.json({ status: 'success', data: result });
});

export const getMyLeaderboardPosition = catchAsync(async (_req: AuthRequest, res: Response) => {
  res.json({ status: 'success', data: { top_referrers: null, fastest_growing: null, campus_leaders: null } });
});

export const adminListAmbassadorApplications = catchAsync(async (req, res: Response) => {
  const result = await referralService.adminListAmbassadorApplications(req.query as { status?: string; limit?: number; cursor?: string });
  res.json({ status: 'success', data: result });
});

export const adminReviewAmbassadorApplication = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await referralService.adminReviewAmbassadorApplication(req.user!.id, req.params.application_id, req.body);
  res.json({ status: 'success', message: 'Application reviewed.', data: result });
});
