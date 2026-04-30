import { z } from 'zod';

export const getLeaderboardValidator = z.object({
  query: z.object({
    limit: z.coerce.number().min(1).max(100).optional(),
    period: z.string().optional(),
  }),
});

export const applyAmbassadorValidator = z.object({
  body: z.object({
    campus: z.string().min(2),
    faculty: z.string().optional(),
    student_id: z.string().optional(),
    graduation_year: z.coerce.number().optional(),
    social_links: z.record(z.string().url()).optional(),
    why_apply: z.string().optional(),
  }),
});

export const adminListAmbassadorApplicationsValidator = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'all']).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    cursor: z.string().optional(),
  }),
});

export const adminReviewAmbassadorApplicationValidator = z.object({
  body: z.object({
    action: z.enum(['approve', 'reject']),
    reason: z.string().optional(),
  }),
});
