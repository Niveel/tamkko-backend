import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { protect } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import * as userController from '@/controllers/user.controller';
import * as userValidator from '@/validators/user.validator';

const router = express.Router();

const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(uploadsDir, { recursive: true });

const avatarExtensionFromMime = (mimeType: string) => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
};

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const userId = (req as express.Request & { user?: { id?: string } }).user?.id || 'user';
      const ext = avatarExtensionFromMime(file.mimetype);
      cb(null, `${userId}-${Date.now()}.${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'avatar'));
    }
    return cb(null, true);
  },
});

const avatarMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  avatarUpload.single('avatar')(req, res, (error?: unknown) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ status: 'error', message: 'File too large' });
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(415).json({ status: 'error', message: 'Unsupported media type' });
    }

    return res.status(400).json({ status: 'error', message: 'Validation failed', errors: [{ message: 'avatar is required' }] });
  });
};

router.use(protect);
router.get('/me/followers', validate(userValidator.getMyFollowersSchema), userController.getMyFollowers);
router.get('/me/following', validate(userValidator.getMyFollowingSchema), userController.getMyFollowing);
router.get('/me/subscribers', validate(userValidator.getMySubscribersSchema), userController.getMySubscribers);
router.post('/me/avatar', avatarMiddleware, userController.uploadMyAvatar);
router.patch('/me/avatar', userController.updateMyAvatar);
router.delete('/me/avatar', userController.deleteMyAvatar);

export default router;
