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
  res.json(result);
});

export const getWalletHome = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await tippingService.getWalletHome(req.user!.id);
  res.json(result);
});

export const requestWithdrawal = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await tippingService.requestWithdrawal(req.user!.id, req.body);
  res.status(201).json({ status: 'success', data: result });
});

export const getTransactionHistory = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await tippingService.getTransactionHistory(req.user!.id, req.query);
  res.json(result);
});

export const getWithdrawals = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await tippingService.getWithdrawals(req.user!.id);
  res.json(result);
});

export const getEarningsByVideo = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await tippingService.getEarningsByVideo(req.user!.id, req.query);
  res.json(result);
});

const sendWalletContractError = (res: Response, error: unknown) => {
  if (error instanceof tippingService.WalletContractError) {
    return res.status(error.statusCode).json({
      ok: false,
      message: error.message,
      code: error.code,
    });
  }
  return res.status(500).json({
    ok: false,
    message: 'Internal server error.',
    code: 'INTERNAL_ERROR',
  });
};

export const getMomoAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) throw new tippingService.WalletContractError(401, 'Unauthorized.', 'UNAUTHORIZED');
    const result = await tippingService.getMomoAccount(req.user.id);
    res.json(result);
  } catch (error) {
    return sendWalletContractError(res, error);
  }
};

export const beginMomoAccountUpdate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) throw new tippingService.WalletContractError(401, 'Unauthorized.', 'UNAUTHORIZED');
    const result = await tippingService.beginMomoAccountUpdate(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    return sendWalletContractError(res, error);
  }
};

export const confirmMomoAccountUpdate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) throw new tippingService.WalletContractError(401, 'Unauthorized.', 'UNAUTHORIZED');
    const result = await tippingService.confirmMomoAccountUpdate(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    return sendWalletContractError(res, error);
  }
};

export const processPayout = catchAsync(async (req, res: Response) => {
  const result = await tippingService.processPayout(req.params.withdrawalId || req.body.withdrawal_id, req.body);
  res.json({ status: 'success', data: result });
});

export const getPlatformRevenue = catchAsync(async (_req, res: Response) => {
  const result = await tippingService.getPlatformRevenue();
  res.json({ status: 'success', data: result });
});
