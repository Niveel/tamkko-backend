import { env } from '@config/env';
import { assertCloudinaryConfig } from '@config/cloudinary';
import { ApiError } from '@utils/apiError';

export class CloudinaryService {
  getClientUploadConfig() {
    assertCloudinaryConfig();
    if (!env.CLOUDINARY_UPLOAD_PRESET) {
      throw new ApiError(500, 'CLOUDINARY_UPLOAD_PRESET is required for direct client uploads.');
    }

    return {
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      upload_preset: env.CLOUDINARY_UPLOAD_PRESET,
      upload_url: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      folder: 'tamkko/posts/images',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      max_size_mb: 10,
    };
  }
}

export const cloudinaryService = new CloudinaryService();
