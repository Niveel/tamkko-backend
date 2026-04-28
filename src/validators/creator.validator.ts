import { z } from 'zod';

export const updateSubscriptionPriceSchema = z.object({
  body: z.object({
    price_ghs: z.number().nonnegative(),
  }),
});
