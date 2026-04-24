import { Referral } from '@models/Referral';
import { User } from '@models/User';
import { ApiError } from '@utils/apiError';

export const referralService = {
  async getMyCode(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    const code = user.referral.code;
    const total_referrals = await Referral.countDocuments({ referrer: userId, isDeleted: false });
    return {
      referral_code: code,
      referral_link: `https://tamkko.app/join/${code}`,
      deep_link: `tamkko://join/${code}`,
      share_text: `Join me on Tamkko: https://tamkko.app/join/${code}`,
      total_referrals,
      active_referrals: total_referrals,
      total_earned_ghs: user.referral.referralEarnings.toFixed(2),
      reward_rate_percent: 5,
      is_ambassador: false,
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
        is_ambassador: false,
        total_referrals: referrer.referral.referralCount,
      },
      message: `${referrer.profile.displayName || referrer.username} invited you to join Tamkko!`,
    };
  },

  async network(userId: string) {
    const referrals = await Referral.find({ referrer: userId, isDeleted: false }).populate('referee', 'username profile createdAt');
    return {
      summary: {
        total_referred: referrals.length,
        active_referred: referrals.length,
        inactive_referred: 0,
        total_earned_ghs: referrals.reduce((sum, referral) => sum + referral.rewardAmount, 0).toFixed(2),
        reward_rate_percent: 5,
      },
      referrals,
      next_cursor: null,
      has_more: false,
    };
  },

  async earnings(userId: string, period = '30d') {
    const referrals = await Referral.find({ referrer: userId, isDeleted: false });
    const total = referrals.reduce((sum, referral) => sum + referral.rewardAmount, 0);
    return {
      period,
      total_earned_ghs: total.toFixed(2),
      total_rewards_count: referrals.length,
      average_reward_ghs: referrals.length ? (total / referrals.length).toFixed(2) : '0.00',
      daily_earnings: [],
      all_time_earned_ghs: total.toFixed(2),
      reward_rate_percent: 5,
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
          is_ambassador: false,
        },
        total_referrals: user.referral.referralCount,
        active_referrals: user.referral.referralCount,
        badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null,
      })),
    };
  },

  async applyAmbassador(userId: string, body: Record<string, unknown>) {
    return {
      application_id: `amb_app_${Date.now()}`,
      user_id: userId,
      status: 'pending',
      campus: body.campus,
      submitted_at: new Date().toISOString(),
    };
  },
};
