import express from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { videoController } from '../controllers/video.controller';
import { videoValidator } from '../validators/video.validator';

const router = express.Router();

/**
 * @route   POST /api/v1/videos/upload
 * @desc    Initialize direct video upload to Cloudflare Stream
 * @access  Private (Creator, Admin)
 */
router.post(
  '/upload',
  auth(['creator', 'admin']),
  validate(videoValidator.uploadVideo),
  videoController.initializeUpload
);

/**
 * @route   GET /api/v1/videos/status/:uploadId
 * @desc    Check Cloudflare Stream upload status
 * @access  Private (Creator, Admin)
 */
router.get(
  '/status/:uploadId',
  auth(['creator', 'admin']),
  videoController.getUploadStatus
);

/**
 * @route   GET /api/v1/videos/feed
 * @desc    Get paginated video feed with sorting
 * @access  Public
 */
router.get(
  '/feed',
  validate(videoValidator.getFeed),
  videoController.getFeed
);

/**
 * @route   GET /api/v1/videos/:videoId
 * @desc    Get single video details
 * @access  Public
 */
router.get(
  '/:videoId',
  validate(videoValidator.getVideo),
  videoController.getVideo
);

/**
 * @route   POST /api/v1/videos/:videoId/view
 * @desc    Increment view count
 * @access  Public
 */
router.post(
  '/:videoId/view',
  validate(videoValidator.getVideo),
  videoController.incrementView
);

/**
 * @route   GET /api/v1/videos/user/:userId
 * @desc    Get videos by specific user
 * @access  Public
 */
router.get(
  '/user/:userId',
  validate(videoValidator.getUserVideos),
  videoController.getUserVideos
);

/**
 * @route   POST /api/v1/videos/:videoId/report
 * @desc    Report a video for violations
 * @access  Private (All authenticated users)
 */
router.post(
  '/:videoId/report',
  auth(['user', 'creator', 'admin']),
  validate(videoValidator.reportVideo),
  videoController.reportVideo
);

/**
 * @route   DELETE /api/v1/videos/:videoId
 * @desc    Delete video (Creator owns or Admin)
 * @access  Private (Creator, Admin)
 */
router.delete(
  '/:videoId',
  auth(['creator', 'admin']),
  validate(videoValidator.getVideo),
  videoController.deleteVideo
);

export { router as videoRoutes };
