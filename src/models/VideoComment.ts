import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVideoComment extends Document {
  video: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  parentComment?: Types.ObjectId | null;
  rootComment?: Types.ObjectId | null;
  isDeleted: boolean;
  deletedBy?: 'author' | 'post_creator' | 'admin' | null;
  likesCount: number;
  repliesCount: number;
  isDeletedByModeration?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VideoCommentSchema = new Schema<IVideoComment>(
  {
    video: { type: Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    parentComment: { type: Schema.Types.ObjectId, ref: 'VideoComment', default: null, index: true },
    rootComment: { type: Schema.Types.ObjectId, ref: 'VideoComment', default: null, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedBy: { type: String, enum: ['author', 'post_creator', 'admin', null], default: null },
    likesCount: { type: Number, default: 0, min: 0 },
    repliesCount: { type: Number, default: 0, min: 0 },
    isDeletedByModeration: { type: Boolean, default: false },
  },
  { timestamps: true }
);

VideoCommentSchema.index({ video: 1, createdAt: 1, _id: 1 });
VideoCommentSchema.index({ parentComment: 1, createdAt: 1, _id: 1 });

export const VideoComment = mongoose.model<IVideoComment>('VideoComment', VideoCommentSchema);
export default VideoComment;

