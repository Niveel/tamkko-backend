import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFollow extends Document {
  follower: Types.ObjectId;
  following: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const followSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    following: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, createdAt: -1, _id: -1 });

export const Follow = mongoose.model<IFollow>('Follow', followSchema);
export default Follow;
