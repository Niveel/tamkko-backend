import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export enum TransactionType {
  TIP = 'tip',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  REFERRAL_BONUS = 'referral_bonus',
  VIP_PURCHASE = 'vip_purchase',
  REFUND = 'refund',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PaymentProvider {
  HUBTEL_MOMO = 'hubtel_momo',
  HUBTEL_CARD = 'hubtel_card',
  WALLET = 'wallet',
  MANUAL = 'manual',
}

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId | IUser;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  provider: PaymentProvider;
  providerTransactionId?: string;
  providerResponse?: Record<string, any>;
  description?: string;
  metadata?: Record<string, any>;
  // Relationships
  video?: mongoose.Types.ObjectId;
  tipRecipient?: mongoose.Types.ObjectId | IUser;
  referralCode?: string;
  vipRoom?: mongoose.Types.ObjectId;
  // Audit
  processedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'GHS' },
    status: { type: String, enum: Object.values(TransactionStatus), default: TransactionStatus.PENDING, index: true },
    provider: { type: String, enum: Object.values(PaymentProvider), required: true },
    providerTransactionId: { type: String, sparse: true, index: true },
    providerResponse: { type: Schema.Types.Mixed },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
    video: { type: Schema.Types.ObjectId, ref: 'Video' },
    tipRecipient: { type: Schema.Types.ObjectId, ref: 'User' },
    referralCode: { type: String },
    vipRoom: { type: Schema.Types.ObjectId, ref: 'VIPRoom' },
    processedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for reporting and lookups
TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, type: 1 });
TransactionSchema.index({ tipRecipient: 1, createdAt: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
export default Transaction;
