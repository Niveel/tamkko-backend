import { Referral } from '@models/Referral';
import { User } from '@models/User';
import { ApiError } from '@utils/apiError';
import { AmbassadorApplication } from '@models/AmbassadorApplication';
import mongoose from 'mongoose';

const AMBASSADOR_REWARD_RATE = 8;
const STANDARD_REWARD_RATE = 5;

const rewardRateFor = (isAmbassador: boolean) => (isAmbassador ? AMBASSADOR_REWARD_RATE : STANDARD_REWARD_RATE);

export const referralService = {
  async getMyCode(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    const code = user.referral.code;
    const totalReferrals = await Referral.countDocuments({ referrer: userId, isDeleted: false });
    const isAmbassador = Boolean(user.referral.isAmbassador);

    return {
      referral_code: code,
      referral_link: `https://tamkko.app/join/${code}`,
      deep_link: `tamkko://join/${code}`,
      share_text: `Join me on Tamkko: https://tamkko.app/join/${code}`,
      total_referrals: totalReferrals,
      active_referrals: totalReferrals,
      total_earned_ghs: user.referral.referralEarnings.toFixed(2),
      reward_rate_percent: rewardRateFor(isAmbassador),
      is_ambassador: isAmbassador,
    };
  },

  async validateCode(code: string) {
    const referrer = await User.findOne({ 'referral.code': code.toUpperCase(), isDeleted: false });
    if (!referrer) throw new ApiError(404, 'Referral code not found');

    return {
      referral_code: code.toUpperCase(),
      is_valid: true,
      referrer: {
        username: referrer.username,
        display_name: referrer.profile.displayName,
        profile_picture: referrer.profile.avatarUrl,
        is_ambassador: Boolean(referrer.referral.isAmbassador),
        total_referrals: referrer.referral.referralCount,
      },
      message: `${referrer.profile.displayName || referrer.username} invited you to join Tamkko!`,
    };
  },

  async network(userId: string) {
    const user = await User.findById(userId).select('referral.isAmbassador');
    if (!user) throw new ApiError(404, 'User not found');

    const referrals = await Referral.find({ referrer: userId, isDeleted: false }).populate('referee', 'username profile createdAt');
    return {
      summary: {
        total_referred: referrals.length,
        active_referred: referrals.length,
        inactive_referred: 0,
        total_earned_ghs: referrals.reduce((sum, referral) => sum + referral.rewardAmount, 0).toFixed(2),
        reward_rate_percent: rewardRateFor(Boolean(user.referral.isAmbassador)),
      },
      referrals,
      next_cursor: null,
      has_more: false,
    };
  },

  async earnings(userId: string, period = '30d') {
    const user = await User.findById(userId).select('referral.isAmbassador');
    if (!user) throw new ApiError(404, 'User not found');

    const referrals = await Referral.find({ referrer: userId, isDeleted: false });
    const total = referrals.reduce((sum, referral) => sum + referral.rewardAmount, 0);
    return {
      period,
      total_earned_ghs: total.toFixed(2),
      total_rewards_count: referrals.length,
      average_reward_ghs: referrals.length ? (total / referrals.length).toFixed(2) : '0.00',
      daily_earnings: [],
      all_time_earned_ghs: total.toFixed(2),
      reward_rate_percent: rewardRateFor(Boolean(user.referral.isAmbassador)),
    };
  },

  async leaderboard(limit = 20) {
    const users = await User.find({ isDeleted: false }).sort({ 'referral.referralCount': -1 }).limit(Math.min(limit, 100));
    return {
      leaderboard_type: 'top_referrers',
      period: 'all_time',
      updated_at: new Date().toISOString(),
      entries: users.map((user, index) => ({
        rank: index + 1,
        user: {
          username: user.username,
          display_name: user.profile.displayName,
          profile_picture: user.profile.avatarUrl,
          is_verified: user.profile.isVerified,
          is_ambassador: Boolean(user.referral.isAmbassador),
        },
        total_referrals: user.referral.referralCount,
        active_referrals: user.referral.referralCount,
        badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null,
      })),
    };
  },

  async applyAmbassador(userId: string, body: Record<string, unknown>) {
    const user = await User.findById(userId).select(
      'username email phone profile.displayName profile.bio profile.avatarUrl referral.isAmbassador'
    );
    if (!user) throw new ApiError(404, 'User not found');
    if (user.referral.isAmbassador) {
      throw new ApiError(409, 'User is already an ambassador');
    }

    const missingFields: string[] = [];
    if (!user.profile?.displayName?.trim()) missingFields.push('display_name');
    if (!user.profile?.bio?.trim()) missingFields.push('bio');
    if (!user.profile?.avatarUrl?.trim()) missingFields.push('avatar_url');
    if (!user.phone?.trim()) missingFields.push('phone_number');
    if (!user.email?.trim()) missingFields.push('email');

    if (missingFields.length > 0) {
      throw new ApiError(
        400,
        'Please update your full profile details before applying.',
        true,
        { missing_fields: missingFields }
      );
    }

    const existingPending = await AmbassadorApplication.findOne({
      user: userId,
      status: 'pending',
      isDeleted: false,
    });
    if (existingPending) {
      throw new ApiError(409, 'An ambassador application is already pending review');
    }

    const app = await AmbassadorApplication.create({
      user: userId,
      campus: String(body.campus || ''),
      faculty: body.faculty ? String(body.faculty) : undefined,
      studentId: body.student_id ? String(body.student_id) : undefined,
      graduationYear: body.graduation_year ? Number(body.graduation_year) : undefined,
      socialLinks: body.social_links as Record<string, string> | undefined,
      whyApply: body.why_apply ? String(body.why_apply) : undefined,
      status: 'pending',
    });

    return {
      application_id: `amb_app_${String(app._id)}`,
      user_id: userId,
      status: app.status,
      campus: app.campus,
      submitted_at: app.createdAt.toISOString(),
    };
  },

  async getAmbassadorStatus(userId: string) {
    const user = await User.findById(userId).select('referral.isAmbassador');
    if (!user) throw new ApiError(404, 'User not found');

    const latestApplication = await AmbassadorApplication.findOne({ user: userId, isDeleted: false }).sort({ createdAt: -1 });
    const status = latestApplication?.status || 'none';

    return {
      is_ambassador: Boolean(user.referral.isAmbassador),
      application_status: status,
      reward_rate_percent: rewardRateFor(Boolean(user.referral.isAmbassador)),
      application_id: latestApplication ? `amb_app_${String(latestApplication._id)}` : null,
      reviewed_at: latestApplication?.reviewedAt ? latestApplication.reviewedAt.toISOString() : null,
      rejection_reason: latestApplication?.rejectionReason || null,
    };
  },

  async adminListAmbassadorApplications(query: { status?: string; limit?: number; cursor?: string }) {
    const status = query.status || 'pending';
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const filter: Record<string, unknown> = { isDeleted: false };
    if (status !== 'all') filter.status = status;
    if (query.cursor) filter._id = { $lt: query.cursor };

    const docs = await AmbassadorApplication.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('user', 'username email phone profile.displayName referral.isAmbassador')
      .populate('reviewedBy', 'username email');

    const hasNext = docs.length > limit;
    const page = hasNext ? docs.slice(0, limit) : docs;

    return {
      applications: page.map((app) => {
        const applicant = app.user as unknown as {
          _id: mongoose.Types.ObjectId;
          username?: string;
          email?: string;
          phone?: string;
          profile?: { displayName?: string };
          referral?: { isAmbassador?: boolean };
        };
        return {
        application_id: `amb_app_${String(app._id)}`,
        status: app.status,
        campus: app.campus,
        faculty: app.faculty || null,
        student_id: app.studentId || null,
        graduation_year: app.graduationYear || null,
        social_links: app.socialLinks || null,
        why_apply: app.whyApply || null,
        submitted_at: app.createdAt.toISOString(),
        reviewed_at: app.reviewedAt ? app.reviewedAt.toISOString() : null,
        rejection_reason: app.rejectionReason || null,
        applicant: {
          user_id: String(applicant._id),
          username: applicant.username || null,
          email: applicant.email || null,
          phone_number: applicant.phone || null,
          display_name: applicant.profile?.displayName || null,
          is_ambassador: Boolean(applicant.referral?.isAmbassador),
        },
      };
      }),
      next_cursor: hasNext ? String(page[page.length - 1]._id) : null,
    };
  },

  async adminReviewAmbassadorApplication(adminId: string, applicationId: string, body: { action: 'approve' | 'reject'; reason?: string }) {
    const dbId = applicationId.startsWith('amb_app_') ? applicationId.replace('amb_app_', '') : applicationId;
    const app = await AmbassadorApplication.findOne({ _id: dbId, isDeleted: false });
    if (!app) throw new ApiError(404, 'Application not found');
    if (app.status !== 'pending') throw new ApiError(409, 'Application has already been reviewed');

    const nextStatus = body.action === 'approve' ? 'approved' : 'rejected';
    app.status = nextStatus;
    app.reviewedBy = new mongoose.Types.ObjectId(adminId);
    app.reviewedAt = new Date();
    app.rejectionReason = nextStatus === 'rejected' ? body.reason || undefined : undefined;
    await app.save();

    const user = await User.findById(app.user);
    if (!user) throw new ApiError(404, 'User not found');

    if (nextStatus === 'approved') {
      user.referral.isAmbassador = true;
      user.referral.ambassadorApprovedAt = app.reviewedAt;
    } else {
      user.referral.isAmbassador = false;
    }
    await user.save();

    return {
      application_id: `amb_app_${String(app._id)}`,
      status: app.status,
      reviewed_at: app.reviewedAt?.toISOString() || null,
      rejection_reason: app.rejectionReason || null,
      user: {
        user_id: String(user._id),
        is_ambassador: Boolean(user.referral.isAmbassador),
        reward_rate_percent: rewardRateFor(Boolean(user.referral.isAmbassador)),
      },
    };
  },
};
