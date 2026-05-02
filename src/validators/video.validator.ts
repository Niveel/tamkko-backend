import { z } from 'zod';

export const videoValidator = {
  createUploadUrl: z.object({
    body: z.object({
      media_type: z.literal('video').optional(),
      mime_type: z.string().min(1),
      file_name: z.string().min(1),
      file_size_bytes: z.number().int().positive(),
      duration_seconds: z.number().positive(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
    }),
  }),
  publishPost: z.object({
    body: z.object({
      media_type: z.enum(['video', 'image']),
      upload_id: z.string().min(1).optional(),
      caption: z.string().max(2000).optional(),
      visibility: z.enum(['public', 'paid', 'followers_only', 'private']),
      allow_comments: z.boolean(),
      price_ghs: z.number().min(0).nullable().optional(),
      image_url: z.string().url().optional(),
      image_public_id: z.string().optional(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      format: z.string().optional(),
      bytes: z.number().int().nonnegative().optional(),
    }),
  }),
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
  getUploadStatusByVideoId: z.object({ params: z.object({ videoId: z.string().min(1) }) }),
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
