import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVIPRoomDoc extends Document {
  name: string;
  description?: string;
  creator: Types.ObjectId;
  tier: 'gold' | 'platinum' | 'diamond';
  monthlyFee: number;
  memberCount: number;
  isActive: boolean;
  isDeleted: boolean;
}

const vipRoomSchema = new Schema<IVIPRoomDoc>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tier: { type: String, enum: ['gold', 'platinum', 'diamond'], default: 'gold', index: true },
    monthlyFee: { type: Number, required: true, min: 0 },
    memberCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

vipRoomSchema.index({ tier: 1, isActive: 1 });

export const VIPRoom = mongoose.model<IVIPRoomDoc>('VIPRoom', vipRoomSchema);
export const VipRoom = VIPRoom;
export default VIPRoom;
