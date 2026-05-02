import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { videoService } from '@services/video.service';
import { catchAsync } from '@utils/catchAsync';
import { ApiError } from '@utils/apiError';

export const videoController = {
  createUploadUrl: catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await videoService.createUploadUrlDraft({
      creatorId: req.user!.id,
      ...req.body,
    });
    res.status(201).json({ status: 'success', data: result });
  }),

  publishPost: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await videoService.publishPost(req.user!.id, req.body);
      res.status(201).json({ status: 'success', data: result });
    } catch (error: any) {
      if (error instanceof ApiError && (error as any).errors?.code?.[0]) {
        return res.status(error.statusCode).json({
          status: 'error',
          error: {
            code: (error as any).errors.code[0],
            message: error.message,
          },
        });
      }
      return next(error);
    }
  },

  initializeUpload: catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await videoService.initializeUpload({
      creatorId: req.user!.id,
      ...req.body,
    });
    res.status(201).json({ status: 'success', data: { video: result } });
  }),

  getUploadStatus: catchAsync(async (req, res: Response) => {
    const result = await videoService.getUploadStatus(req.params.uploadId);
    res.json({ status: 'success', data: result });
  }),

  getUploadStatusByVideoId: catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await videoService.getUploadStatusByVideoId(
      req.params.videoId,
      req.user!.id,
      req.user!.role
    );
    res.json({ status: 'success', data: result });
  }),

  getFeed: catchAsync(async (req, res: Response) => {
    const result = await videoService.getFeed(Number(req.query.limit || 20), req.query.cursor as string | undefined);
    res.json({ status: 'success', data: result });
  }),

  getVideo: catchAsync(async (req, res: Response) => {
    const result = await videoService.getVideo(req.params.videoId);
    res.json({ status: 'success', data: { video: result } });
  }),

  incrementView: catchAsync(async (req, res: Response) => {
    const result = await videoService.incrementView(req.params.videoId);
    res.json({ status: 'success', data: result });
  }),

  getUserVideos: catchAsync(async (req, res: Response) => {
    const result = await videoService.getUserVideos(
      req.params.userId,
      Number(req.query.limit || 20),
      req.query.cursor as string | undefined
    );
    res.json({ status: 'success', data: result });
  }),

  reportVideo: catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await videoService.reportVideo(req.params.videoId, req.user!.id, req.body.reason, req.body.description);
    res.json({ status: 'success', message: 'Video reported successfully', data: result });
  }),

  deleteVideo: catchAsync(async (req: AuthRequest, res: Response) => {
    await videoService.deleteVideo(req.params.videoId, req.user!.id);
    res.status(204).send();
  }),

  listComments: catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await videoService.listComments(req.user!.id, req.params.videoId, req.query as any);
    res.json({ status: 'success', data: result });
  }),

  createComment: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await videoService.createComment(req.user!.id, req.params.videoId, req.body);
      res.status(201).json({ status: 'success', data: result });
    } catch (error: any) {
      if (error instanceof ApiError && (error as any).errors?.code?.[0]) {
        return res.status(error.statusCode).json({ status: 'error', error: { code: (error as any).errors.code[0], message: error.message } });
      }
      return next(error);
    }
  },

  toggleCommentLike: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await videoService.toggleCommentLike(req.user!.id, req.params.commentId);
      res.json({ status: 'success', data: result });
    } catch (error: any) {
      if (error instanceof ApiError && (error as any).errors?.code?.[0]) {
        return res.status(error.statusCode).json({ status: 'error', error: { code: (error as any).errors.code[0], message: error.message } });
      }
      return next(error);
    }
  },

  deleteComment: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await videoService.deleteComment(req.user!.id, req.user!.role, req.params.commentId);
      res.json({ status: 'success', data: result });
    } catch (error: any) {
      if (error instanceof ApiError && (error as any).errors?.code?.[0]) {
        return res.status(error.statusCode).json({ status: 'error', error: { code: (error as any).errors.code[0], message: error.message } });
      }
      return next(error);
    }
  },

  getMyVideos: catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await videoService.listMyVideos(req.user!.id, req.query as any);
    res.json({ status: 'success', data: result });
  }),

  getMyVideoDetails: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await videoService.getMyVideoDetails(req.user!.id, req.params.videoId);
      res.json({ status: 'success', data: result });
    } catch (error: any) {
      if (error instanceof ApiError && (error as any).errors?.code?.[0]) {
        return res.status(error.statusCode).json({
          status: 'error',
          error: { code: (error as any).errors.code[0], message: error.message },
        });
      }
      return next(error);
    }
  },

  updateMyVideo: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await videoService.updateMyVideo(req.user!.id, req.params.videoId, req.body);
      res.json({ status: 'success', data: result });
    } catch (error: any) {
      if (error instanceof ApiError && (error as any).errors?.code?.[0]) {
        return res.status(error.statusCode).json({
          status: 'error',
          error: { code: (error as any).errors.code[0], message: error.message },
        });
      }
      return next(error);
    }
  },

  muxWebhook: catchAsync(async (req, res: Response) => {
    const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}), 'utf8');
    const rawBody = bodyBuffer.toString('utf8');
    const signatureHeader = req.header('mux-signature');

    const isValid = videoService.verifyMuxWebhookSignature(signatureHeader, rawBody);
    if (!isValid) throw new ApiError(401, 'Invalid Mux webhook signature');

    const parsed = JSON.parse(rawBody);
    const result = await videoService.handleMuxWebhook(parsed);
    res.status(200).json({ success: true, data: result });
  }),
};
