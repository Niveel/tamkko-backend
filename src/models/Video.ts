import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  creator: mongoose.Types.ObjectId;
  views: number;
  likes: number;
  duration: number;
  isPublic: boolean;
  tags: string[];
  category: string;
  mediaType?: 'video' | 'image';
  mediaProvider?: 'mux' | 'cloudinary';
  imagePublicId?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageFormat?: string;
  imageBytes?: number;
  aspectRatio?: string;
  videoCodec?: string;
  videoProfile?: string;
  processingErrorCode?: string;
  processingErrorMessage?: string;
  visibility?: 'public' | 'paid' | 'followers_only' | 'private';
  allowComments?: boolean;
  priceGhs?: number | null;
  isPublished?: boolean;
  publishedAt?: Date | null;
  status: 'processing' | 'ready' | 'failed';
  cloudflareId?: string;
  muxUploadId?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    tags: [{ type: String, trim: true }],
    category: { type: String, trim: true, index: true },
    mediaType: { type: String, enum: ['video', 'image'], default: 'video', index: true },
    mediaProvider: { type: String, enum: ['mux', 'cloudinary'] },
    imagePublicId: { type: String, sparse: true, index: true },
    imageWidth: { type: Number, min: 1 },
    imageHeight: { type: Number, min: 1 },
    imageFormat: { type: String },
    imageBytes: { type: Number, min: 0 },
    aspectRatio: { type: String },
    videoCodec: { type: String },
    videoProfile: { type: String },
    processingErrorCode: { type: String },
    processingErrorMessage: { type: String },
    visibility: { type: String, enum: ['public', 'paid', 'followers_only', 'private'], default: 'public', index: true },
    allowComments: { type: Boolean, default: true },
    priceGhs: { type: Number, min: 0, default: null },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
      index: true,
    },
    cloudflareId: { type: String, unique: true, sparse: true },
    muxUploadId: { type: String, unique: true, sparse: true, index: true },
    muxAssetId: { type: String, unique: true, sparse: true, index: true },
    muxPlaybackId: { type: String, sparse: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

VideoSchema.index({ creator: 1, createdAt: -1 });
VideoSchema.index({ status: 1, isPublic: 1, createdAt: -1 });
VideoSchema.index({ tags: 1 });
VideoSchema.index({ category: 1, status: 1 });

export const Video = mongoose.model<IVideo>('Video', VideoSchema);
export default Video;
