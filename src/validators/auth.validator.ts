import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    phone: z.string().min(6),
    username: z.string().min(3),
    fullName: z.string().min(2).optional(),
    display_name: z.string().optional(),
    password: z.string().min(8),
    confirm_password: z.string().optional(),
    country: z.string().length(2).optional(),
    agree_terms: z.boolean().optional(),
    referral_code: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    emailOrUsername: z.string().optional(),
    identifier: z.string().optional(),
    email: z.string().optional(),
    username: z.string().optional(),
    phone: z.string().optional(),
    password: z.string().min(1),
  }).refine((value) => Boolean(value.emailOrUsername || value.identifier || value.email || value.username || value.phone), {
    message: 'emailOrUsername, identifier, email, username, or phone is required',
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
    refresh: z.string().optional(),
  }).refine((value) => Boolean(value.refreshToken || value.refresh), {
    message: 'refresh token is required',
  }),
});
