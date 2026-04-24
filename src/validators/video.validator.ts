import { z } from 'zod';

export const videoValidator = {
  uploadVideo: z.object({
    body: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      videoUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
    }),
  }),
  getFeed: z.object({
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(50).optional(),
    }),
  }),
  getVideo: z.object({ params: z.object({ videoId: z.string().min(1) }) }),
  getUserVideos: z.object({
    params: z.object({ userId: z.string().min(1) }),
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(50).optional(),
    }),
  }),
  reportVideo: z.object({
    params: z.object({ videoId: z.string().min(1) }),
    body: z.object({
      reason: z.string().min(1),
      description: z.string().optional(),
    }),
  }),
};
