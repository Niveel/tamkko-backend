import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '@models/User';
import { ApiError } from '@utils/apiError';
import { env } from '@config/env';

interface AuthTokens {
  access: string;
  refresh: string;
  expires_in: number;
}

const generateReferralCode = (username?: string) => {
  const prefix = (username || 'TMK').replace(/[^a-z0-9]/gi, '').slice(0, 5).toUpperCase() || 'TMK';
  return `${prefix}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

export class AuthService {
  async register(data: {
    email: string;
    phone: string;
    username: string;
    display_name?: string;
    password: string;
    country?: string;
    referral_code?: string;
  }): Promise<{ user: IUser; tokens: AuthTokens }> {
    const existing = await User.findOne({
      $or: [{ email: data.email }, { phone: data.phone }, { username: data.username.toLowerCase() }],
    });
    if (existing) throw new ApiError(409, 'Email, phone, or username already registered');

    const referrer = data.referral_code
      ? await User.findOne({ 'referral.code': data.referral_code.toUpperCase(), isDeleted: false })
      : null;

    const user = await User.create({
      email: data.email,
      phone: data.phone,
      username: data.username.toLowerCase(),
      password: data.password,
      profile: {
        displayName: data.display_name || data.username,
        bio: '',
        avatarUrl: '',
        coverUrl: '',
        isVerified: false,
      },
      referral: {
        code: generateReferralCode(data.username),
        referredBy: referrer?._id,
        referralCount: 0,
        referralEarnings: 0,
      },
    });

    if (referrer) {
      referrer.referral.referralCount += 1;
      await referrer.save();
    }

    return { user, tokens: this.generateTokens(user) };
  }

  async login(identifier: string, password: string): Promise<{ user: IUser; tokens: AuthTokens }> {
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }, { phone: identifier }],
      isDeleted: false,
    }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, 'Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await user.save();
    return { user, tokens: this.generateTokens(user) };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret) as { userId: string };
      const user = await User.findOne({ _id: decoded.userId, isDeleted: false });
      if (!user) throw new ApiError(401, 'User not found');
      return this.generateTokens(user);
    } catch {
      throw new ApiError(401, 'Invalid refresh token');
    }
  }

  private generateTokens(user: Pick<IUser, '_id' | 'role' | 'email'>): AuthTokens {
    const payload = { id: user._id.toString(), userId: user._id.toString(), role: user.role, email: user.email };
    const accessOptions: SignOptions = { expiresIn: env.jwtAccessExpiration as SignOptions['expiresIn'] };
    const refreshOptions: SignOptions = { expiresIn: env.jwtRefreshExpiration as SignOptions['expiresIn'] };

    return {
      access: jwt.sign(payload, env.jwtSecret, accessOptions),
      refresh: jwt.sign({ userId: user._id.toString() }, env.jwtRefreshSecret, refreshOptions),
      expires_in: 3600,
    };
  }
}

export const authService = new AuthService();
