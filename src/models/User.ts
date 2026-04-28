import mongoose, { Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  phone: string;
  password: string;
  role: 'user' | 'creator' | 'admin';
  profile: {
    displayName: string;
    bio: string;
    avatarUrl: string;
    coverUrl: string;
    isVerified: boolean;
  };
  wallet: {
    balance: number;
    pendingBalance: number;
    currency: string;
    lastWithdrawalAt?: Date;
  };
  referral: {
    code: string;
    referredBy?: Types.ObjectId;
    referralCount: number;
    referralEarnings: number;
  };
  settings: {
    pushNotifications: boolean;
    emailNotifications: boolean;
    isPrivate: boolean;
    blockedUsers: Types.ObjectId[];
  };
  stats: {
    followersCount: number;
    followingCount: number;
    videosCount: number;
    totalTipsReceived: number;
    totalViews: number;
  };
  subscriptionPriceGhs: number;
  isDeleted: boolean;
  lastLoginAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ['user', 'creator', 'admin'], default: 'user', index: true },
    profile: {
      displayName: { type: String, trim: true },
      bio: { type: String, maxlength: 500 },
      avatarUrl: { type: String },
      coverUrl: { type: String },
      isVerified: { type: Boolean, default: false },
    },
    wallet: {
      balance: { type: Number, default: 0, min: 0 },
      pendingBalance: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'GHS' },
      lastWithdrawalAt: { type: Date },
    },
    referral: {
      code: { type: String, required: true, unique: true, index: true },
      referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      referralCount: { type: Number, default: 0 },
      referralEarnings: { type: Number, default: 0 },
    },
    settings: {
      pushNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      isPrivate: { type: Boolean, default: false },
      blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    stats: {
      followersCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
      videosCount: { type: Number, default: 0 },
      totalTipsReceived: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
    },
    subscriptionPriceGhs: { type: Number, default: 20, min: 0 },
    isDeleted: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.index({ username: 'text', 'profile.displayName': 'text' });

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
