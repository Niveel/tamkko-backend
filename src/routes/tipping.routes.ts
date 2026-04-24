import { Router } from 'express';
import {
  processTip,
  getTipStatus,
  getWalletBalance,
  requestWithdrawal,
  getTransactionHistory,
  processPayout,
  getPlatformRevenue,
} from '../controllers/tipping.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  processTipSchema,
  requestWithdrawalSchema,
  transactionHistorySchema,
  processPayoutSchema,
  platformRevenueSchema,
} from '../validators/tipping.validator';

const router = Router();

// Creator wallet routes
router.get('/wallet', authenticate, getWalletBalance);
router.post('/wallet/withdraw', authenticate, validate(requestWithdrawalSchema), requestWithdrawal);
router.get('/transactions', authenticate, validate(transactionHistorySchema, 'query'), getTransactionHistory);

// Public tipping route
router.post('/', authenticate, validate(processTipSchema), processTip);
router.post('/tips', authenticate, validate(processTipSchema), processTip);
router.get('/:tipId/status', authenticate, getTipStatus);

// Admin-only routes
router.post('/admin/payouts', authenticate, authorize('admin'), validate(processPayoutSchema), processPayout);
router.get('/admin/revenue', authenticate, authorize('admin'), validate(platformRevenueSchema, 'query'), getPlatformRevenue);

export default router;
