import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  body: z.object({
    expo_push_token: z.string().min(1),
    device_type: z.enum(['ios', 'android']),
    device_model: z.string().optional(),
    app_version: z.string().optional(),
  }),
});
