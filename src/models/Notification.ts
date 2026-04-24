import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationDoc extends Document {
  recipient: mongoose.Types.ObjectId;
  type: string;
  category: 'social' | 'earnings' | 'system';
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDoc>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, index: true },
    category: { type: String, enum: ['social', 'earnings', 'system'], default: 'system', index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model<INotificationDoc>('Notification', notificationSchema);
export default Notification;
