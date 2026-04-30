import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');
const moneyString = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount with up to 2 decimal places');

export const generateCampusCodeSchema = z.object({
  body: z.object({
    roomId: objectId.optional(),
    code: z.string().min(3).max(32).optional(),
    expiresAt: z.coerce.date().optional(),
  }),
});

export const createRoomSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    tier: z.enum(['gold', 'platinum', 'diamond']).optional(),
    monthlyFee: z.number().nonnegative().optional(),
    monthly_fee: z.number().nonnegative().optional(),
    entryFee: z.number().nonnegative().optional(),
    entry_fee_ghs: moneyString.optional(),
    is_public: z.boolean().optional(),
    allow_tips: z.boolean().optional(),
    welcome_message: z.string().max(500).optional(),
  }),
});

export const updateRoomSchema = z.object({
  params: z.object({ roomId: objectId }),
  body: createRoomSchema.shape.body.partial().extend({ isActive: z.boolean().optional() }),
});

export const joinRoomSchema = z.object({
  params: z.object({ roomId: objectId }),
  body: z.object({
    autoRenew: z.boolean().optional(),
    paymentReference: z.string().optional(),
    code_string: z.string().optional(),
  }),
});

export const listRoomsSchema = z.object({
  scope: z.enum(['public', 'joined', 'mine']).optional(),
  q: z.string().optional(),
  type: z.enum(['all', 'free', 'paid']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  sort: z.enum(['recent', 'popular', 'fee_asc', 'fee_desc']).optional(),
});

export const kickMemberSchema = z.object({
  params: z.object({ roomId: objectId }),
  body: z.object({ userId: objectId }),
});

export const banMemberSchema = kickMemberSchema;

export const createPostSchema = z.object({
  params: z.object({ roomId: objectId }),
  body: z.object({
    text: z.string().min(1).max(1000),
    media: z.array(z.string().url()).optional(),
  }),
});

export const processPaymentSchema = z.object({
  params: z.object({ roomId: objectId }),
  body: z.object({
    paymentReference: z.string().optional(),
    reference: z.string().optional(),
    currency: z.string().length(3).optional(),
  }),
});

export const previewPromoCodeSchema = z.object({
  params: z.object({ roomId: objectId }),
  body: z.object({ code_string: z.string().min(1) }),
});

export const createAccessPassSchema = z.object({
  body: z.object({
    room_id: objectId,
    label: z.string().min(2).max(100),
    code: z.string().min(3).max(32),
    discount_type: z.enum(['free', 'fixed', 'percent']),
    discount_amount_ghs: z.number().nonnegative().nullable().optional(),
    max_uses: z.coerce.number().int().min(1).max(100000),
    expires_at: z.coerce.date().optional(),
    campus: z.string().max(120).optional(),
    is_active: z.boolean().optional(),
  }),
});

export const updateAccessPassSchema = z.object({
  params: z.object({ passId: objectId }),
  body: z.object({
    label: z.string().min(2).max(100).optional(),
    code: z.string().min(3).max(32).optional(),
    discount_type: z.enum(['free', 'fixed', 'percent']).optional(),
    discount_amount_ghs: z.number().nonnegative().nullable().optional(),
    max_uses: z.coerce.number().int().min(1).max(100000).optional(),
    expires_at: z.coerce.date().optional(),
    campus: z.string().max(120).optional(),
    is_active: z.boolean().optional(),
  }),
});
