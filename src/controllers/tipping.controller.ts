import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { catchAsync } from '@utils/catchAsync';
import * as tippingService from '@services/tipping.service';

export const processTip = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await tippingService.processTip(req.user!.id, req.body);
  res.status(201).json({ status: 'success', message: 'Payment initiated.', data: result });
});

export const getTipStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await tippingService.getTipStatus(req.user!.id, req.params.tipId);
  res.json({ status: 'success', data: result });
});

export const getWalletBalance = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await tippingService.getWalletBalance(req.user!.id);
  res.json({ status: 'success', data: result });
});

export const requestWithdrawal = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await tippingService.requestWithdrawal(req.user!.id, req.body);
  res.status(201).json({ status: 'success', data: result });
});

export const getTransactionHistory = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await tippingService.getTransactionHistory(req.user!.id, req.query);
  res.json({ status: 'success', data: result });
});

export const processPayout = catchAsync(async (req, res: Response) => {
  const result = await tippingService.processPayout(req.params.withdrawalId || req.body.withdrawal_id, req.body);
  res.json({ status: 'success', data: result });
});

export const getPlatformRevenue = catchAsync(async (_req, res: Response) => {
  const result = await tippingService.getPlatformRevenue();
  res.json({ status: 'success', data: result });
});
