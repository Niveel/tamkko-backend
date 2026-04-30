import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVIPRoomDoc extends Document {
  name: string;
  description?: string;
  creator: Types.ObjectId;
  tier: 'gold' | 'platinum' | 'diamond';
  monthlyFee: number;
  capacity: number;
  memberCount: number;
  isPublic: boolean;
  allowTips: boolean;
  welcomeMessage?: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
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
    capacity: { type: Number, required: true, min: 1, default: 500 },
    memberCount: { type: Number, default: 0, min: 0 },
    isPublic: { type: Boolean, default: true, index: true },
    allowTips: { type: Boolean, default: true },
    welcomeMessage: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['draft', 'active', 'closed', 'archived'], default: 'active', index: true },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

vipRoomSchema.index({ tier: 1, isActive: 1 });

export const VIPRoom = mongoose.model<IVIPRoomDoc>('VIPRoom', vipRoomSchema);
export const VipRoom = VIPRoom;
export default VIPRoom;
