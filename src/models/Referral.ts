import mongoose, { Document, Schema } from 'mongoose';

export interface IReferralDoc extends Document {
  referrer: mongoose.Types.ObjectId;
  referee: mongoose.Types.ObjectId;
  referralCode: string;
  status: 'active' | 'inactive';
  rewardAmount: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferralDoc>(
  {
    referrer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referee: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    referralCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    rewardAmount: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

referralSchema.index({ referrer: 1, status: 1 });

export const Referral = mongoose.model<IReferralDoc>('Referral', referralSchema);
export default Referral;
