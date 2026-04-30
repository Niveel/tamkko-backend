import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMomoAccountChallenge extends Document {
  user: Types.ObjectId;
  challengeId: string;
  otp: string;
  network: 'mtn' | 'vodafone' | 'airteltigo';
  phoneNumber: string;
  accountName: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const momoAccountChallengeSchema = new Schema<IMomoAccountChallenge>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    challengeId: { type: String, required: true, unique: true, index: true },
    otp: { type: String, required: true },
    network: { type: String, enum: ['mtn', 'vodafone', 'airteltigo'], required: true },
    phoneNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
  },
  { timestamps: true }
);

momoAccountChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
momoAccountChallengeSchema.index({ user: 1, challengeId: 1 });

export const MomoAccountChallenge = mongoose.model<IMomoAccountChallenge>('MomoAccountChallenge', momoAccountChallengeSchema);
export default MomoAccountChallenge;
