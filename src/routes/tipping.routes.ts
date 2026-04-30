import { Router } from 'express';
import { NextFunction, Response } from 'express';
import {
  processTip,
  getTipStatus,
  getWalletBalance,
  getWalletHome,
  getEarningsByVideo,
  getMomoAccount,
  beginMomoAccountUpdate,
  confirmMomoAccountUpdate,
  requestWithdrawal,
  getWithdrawals,
  getTransactionHistory,
  processPayout,
  getPlatformRevenue,
} from '../controllers/tipping.controller';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  processTipSchema,
  requestWithdrawalSchema,
  transactionHistorySchema,
  earningsByVideoSchema,
  processPayoutSchema,
  platformRevenueSchema,
} from '../validators/tipping.validator';

const router = Router();
const walletContractAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  authenticate(req, res, (error?: unknown) => {
    if (error || !req.user?.id) {
      return res.status(401).json({ ok: false, message: 'Unauthorized.', code: 'UNAUTHORIZED' });
    }
    return next();
  });
};

// Creator wallet routes
router.get('/', authenticate, getWalletBalance);
router.get('/wallet', authenticate, getWalletBalance);
router.get('/home', authenticate, getWalletHome);
router.post('/wallet/withdraw', authenticate, validate(requestWithdrawalSchema), requestWithdrawal);
router.get('/withdrawals', authenticate, getWithdrawals);
router.get('/transactions', authenticate, validate(transactionHistorySchema, 'query'), getTransactionHistory);
router.get('/earnings/by-video', authenticate, validate(earningsByVideoSchema, 'query'), getEarningsByVideo);
router.get('/momo-account', walletContractAuth, getMomoAccount);
router.post('/momo-account/update/begin', walletContractAuth, beginMomoAccountUpdate);
router.post('/momo-account/update/confirm', walletContractAuth, confirmMomoAccountUpdate);

// Public tipping route
router.post('/', authenticate, validate(processTipSchema), processTip);
router.post('/tips', authenticate, validate(processTipSchema), processTip);
router.get('/:tipId/status', authenticate, getTipStatus);

// Admin-only routes
router.post('/admin/payouts', authenticate, authorize('admin'), validate(processPayoutSchema), processPayout);
router.get('/admin/revenue', authenticate, authorize('admin'), validate(platformRevenueSchema, 'query'), getPlatformRevenue);

export default router;
