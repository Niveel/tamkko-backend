import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

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
  }),
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
