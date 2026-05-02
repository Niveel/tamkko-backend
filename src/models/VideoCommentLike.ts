import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVideoCommentLike extends Document {
  comment: Types.ObjectId;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VideoCommentLikeSchema = new Schema<IVideoCommentLike>(
  {
    comment: { type: Schema.Types.ObjectId, ref: 'VideoComment', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

VideoCommentLikeSchema.index({ comment: 1, user: 1 }, { unique: true });

export const VideoCommentLike = mongoose.model<IVideoCommentLike>('VideoCommentLike', VideoCommentLikeSchema);
export default VideoCommentLike;

