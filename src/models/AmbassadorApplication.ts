import mongoose, { Document, Schema, Types } from 'mongoose';

export type AmbassadorApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface IAmbassadorApplication extends Document {
  user: Types.ObjectId;
  campus: string;
  faculty?: string;
  studentId?: string;
  graduationYear?: number;
  socialLinks?: Record<string, string>;
  whyApply?: string;
  status: AmbassadorApplicationStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ambassadorApplicationSchema = new Schema<IAmbassadorApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    campus: { type: String, required: true, trim: true },
    faculty: { type: String, trim: true },
    studentId: { type: String, trim: true },
    graduationYear: { type: Number },
    socialLinks: { type: Schema.Types.Mixed },
    whyApply: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ambassadorApplicationSchema.index({ user: 1, createdAt: -1 });
ambassadorApplicationSchema.index({ status: 1, createdAt: -1 });

export const AmbassadorApplication = mongoose.model<IAmbassadorApplication>('AmbassadorApplication', ambassadorApplicationSchema);
export default AmbassadorApplication;
