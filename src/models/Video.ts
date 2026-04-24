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
  status: 'processing' | 'ready' | 'failed';
  cloudflareId?: string;
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
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
      index: true,
    },
    cloudflareId: { type: String, unique: true, sparse: true },
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
