import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVIPMembershipDoc extends Document {
  user: Types.ObjectId;
  vipRoom: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  status: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  isDeleted: boolean;
}

const vipMembershipSchema = new Schema<IVIPMembershipDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vipRoom: { type: Schema.Types.ObjectId, ref: 'VIPRoom', required: true, index: true },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true, index: true },
    autoRenew: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending_payment'],
      default: 'active',
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

vipMembershipSchema.index({ user: 1, vipRoom: 1 }, { unique: true });
vipMembershipSchema.index({ status: 1, endDate: 1 });

export const VIPMembership = mongoose.model<IVIPMembershipDoc>('VIPMembership', vipMembershipSchema);
export default VIPMembership;
