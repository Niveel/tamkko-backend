import express from 'express';
import { protect } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import * as creatorController from '@/controllers/creator.controller';
import * as creatorValidator from '@/validators/creator.validator';

const router = express.Router();

router.use(protect);

router.get('/me/subscription-price', creatorController.getMySubscriptionPrice);
router.patch(
  '/me/subscription-price',
  validate(creatorValidator.updateSubscriptionPriceSchema),
  creatorController.updateMySubscriptionPrice
);

export default router;
