import express from 'express';
import { mediaController } from '@controllers/media.controller';
import { auth } from '@middleware/auth';

const router = express.Router();

router.get('/image-upload-config', auth(['user', 'creator', 'admin']), mediaController.getImageUploadConfig);

export { router as mediaRoutes };

