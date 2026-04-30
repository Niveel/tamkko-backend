import { z } from 'zod';

export const processTipSchema = z.object({
  body: z.object({
    creator_id: z.string().min(1),
    video_id: z.string().optional(),
    amount_ghs: z.string().regex(/^\d+(\.\d{1,2})?$/),
    momo_number: z.string().optional(),
    momo_provider: z.string().optional(),
    message: z.string().max(150).optional(),
  }),
});

export const requestWithdrawalSchema = z.object({
  body: z.object({
    amount_ghs: z.string().regex(/^\d+(\.\d{1,2})?$/),
    network: z.string().optional(),
    phone_number: z.string().optional(),
    action_token: z.string().optional(),
  }),
});

export const transactionHistorySchema = z.object({
  type: z.string().optional(),
  limit: z.coerce.number().optional(),
  cursor: z.string().optional(),
});

export const processPayoutSchema = z.object({
  body: z.object({
    withdrawal_id: z.string().optional(),
    action: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const platformRevenueSchema = z.object({
  period: z.string().optional(),
});

export const earningsByVideoSchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).optional(),
  sort: z.enum(['earnings', 'tips_count', 'views']).optional(),
});
