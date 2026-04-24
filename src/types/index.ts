import { Document, Types } from 'mongoose';

// User
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  phone?: string;
  password: string;
  role: 'user' | 'creator' | 'admin';
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  referralCode: string;
  referredBy?: Types.ObjectId;
  walletBalance: number;
  totalEarned: number;
  totalSpent: number;
  expoPushToken?: string;
  isDeleted: boolean;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Video
export interface IVideo extends Document {
  _id: Types.ObjectId;
  creator: Types.ObjectId;
  cloudflareVideoId: string;
  cloudflarePlaybackUrl: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  duration: number;
  views: number;
  likes: number;
  isPublic: boolean;
  isDeleted: boolean;
}

// Transaction
export interface ITransaction extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: 'tip' | 'withdrawal' | 'referral_bonus' | 'vip_purchase' | 'deposit';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  provider?: 'hubtel' | 'stripe' | 'internal';
  providerRef?: string;
  recipient?: Types.ObjectId;
  metadata?: Record<string, any>;
  isDeleted: boolean;
}

// Notification
export interface INotification extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: 'tip_received' | 'new_follower' | 'referral_joined' | 'vip_expiring' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, any>;
  isDeleted: boolean;
}

// Referral
export interface IReferral extends Document {
  _id: Types.ObjectId;
  referrer: Types.ObjectId;
  referee: Types.ObjectId;
  status: 'active' | 'rewarded';
  rewardAmount: number;
  isDeleted: boolean;
}

// VIP Room
export interface IVIPRoom extends Document {
  _id: Types.ObjectId;
  creator: Types.ObjectId;
  name: string;
  description?: string;
  monthlyPrice: number;
  memberCount: number;
  isActive: boolean;
  isDeleted: boolean;
}

// VIP Membership
export interface IVIPMembership extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  room: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isDeleted: boolean;
}
