import { Response } from 'express';
import { catchAsync } from '@utils/catchAsync';
import { cloudinaryService } from '@services/cloudinary.service';

export const mediaController = {
  getImageUploadConfig: catchAsync(async (_req, res: Response) => {
    const config = cloudinaryService.getClientUploadConfig();
    res.json({ status: 'success', data: config });
  }),
};

