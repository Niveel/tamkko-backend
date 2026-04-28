import { z } from 'zod';

export const getMyFollowersSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    q: z.string().optional(),
  }),
});

export const getMyFollowingSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    q: z.string().optional(),
  }),
});

export const getMySubscribersSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    q: z.string().optional(),
  }),
});
