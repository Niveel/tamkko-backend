import mongoose, { Document, Schema, Types } from 'mongoose';

export type AccessDiscountType = 'free' | 'fixed' | 'percent';

export interface IRoomAccessPass extends Document {
  room: Types.ObjectId;
  label: string;
  code: string;
  discountType: AccessDiscountType;
  discountAmountGhs?: number | null;
  maxUses: number;
  usedCount: number;
  expiresAt?: Date;
  campus?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomAccessPassSchema = new Schema<IRoomAccessPass>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'VIPRoom', required: true, index: true },
    label: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    discountType: { type: String, enum: ['free', 'fixed', 'percent'], required: true },
    discountAmountGhs: { type: Number, min: 0, default: null },
    maxUses: { type: Number, required: true, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date },
    campus: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

roomAccessPassSchema.index({ room: 1, code: 1 }, { unique: true });

export const RoomAccessPass = mongoose.model<IRoomAccessPass>('RoomAccessPass', roomAccessPassSchema);
export default RoomAccessPass;
