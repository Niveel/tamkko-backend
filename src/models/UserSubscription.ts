import mongoose, { Document, Schema, Types } from 'mongoose';

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface IUserSubscription extends Document {
  subscriber: Types.ObjectId;
  creator: Types.ObjectId;
  status: SubscriptionStatus;
  startedAt: Date;
  endedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSubscriptionSchema = new Schema<IUserSubscription>(
  {
    subscriber: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    startedAt: { type: Date, required: true, default: Date.now, index: true },
    endedAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

userSubscriptionSchema.index({ subscriber: 1, creator: 1 }, { unique: true });
userSubscriptionSchema.index({ creator: 1, startedAt: -1, _id: -1 });

export const UserSubscription = mongoose.model<IUserSubscription>('UserSubscription', userSubscriptionSchema);
export default UserSubscription;
