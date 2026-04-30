import { Transaction, TransactionStatus, TransactionType, PaymentProvider } from '@models/Transaction';
import { User } from '@models/User';
import { ApiError } from '@utils/apiError';
import { Video } from '@models/Video';
import { randomBytes, randomInt } from 'crypto';
import { MomoAccountChallenge } from '@models/MomoAccountChallenge';
import { env } from '@config/env';

const toMoney = (value: number) => value.toFixed(2);
const toMoneyNumber = (value: number) => Number(toMoney(value));

const mapTransactionType = (type: TransactionType): 'tip' | 'subscription' | 'withdrawal' | 'referral_reward' => {
  if (type === TransactionType.WITHDRAWAL) return 'withdrawal';
  if (type === TransactionType.REFERRAL_BONUS) return 'referral_reward';
  if (type === TransactionType.VIP_PURCHASE) return 'subscription';
  return 'tip';
};

const mapTransactionDirection = (type: TransactionType): 'credit' | 'debit' => {
  if (type === TransactionType.WITHDRAWAL || type === TransactionType.VIP_PURCHASE || type === TransactionType.REFUND) {
    return 'debit';
  }
  return 'credit';
};

const mapTransactionStatus = (
  status: TransactionStatus,
  metadata?: Record<string, unknown>
): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'rejected' => {
  const explicit = typeof metadata?.wallet_status === 'string' ? metadata.wallet_status : null;
  if (explicit === 'pending' || explicit === 'processing' || explicit === 'completed' || explicit === 'failed' || explicit === 'cancelled' || explicit === 'rejected') {
    return explicit;
  }
  if (status === TransactionStatus.COMPLETED) return 'completed';
  if (status === TransactionStatus.FAILED) return 'failed';
  if (status === TransactionStatus.CANCELLED) return 'cancelled';
  return 'pending';
};

const mapWithdrawalStatus = (
  status: TransactionStatus,
  metadata?: Record<string, unknown>
): 'otp_required' | 'pending' | 'processing' | 'completed' | 'failed' | 'rejected' => {
  const explicit = typeof metadata?.wallet_status === 'string' ? metadata.wallet_status : null;
  if (explicit === 'otp_required' || explicit === 'pending' || explicit === 'processing' || explicit === 'completed' || explicit === 'failed' || explicit === 'rejected') {
    return explicit;
  }

  if (status === TransactionStatus.COMPLETED) return 'completed';
  if (status === TransactionStatus.FAILED) return 'failed';
  if (status === TransactionStatus.CANCELLED) return 'rejected';
  return 'pending';
};

const toTransactionTitle = (type: ReturnType<typeof mapTransactionType>, direction: 'credit' | 'debit') => {
  if (type === 'withdrawal') return 'Withdrawal';
  if (type === 'subscription') return 'Subscription';
  if (type === 'referral_reward') return 'Referral Reward';
  return direction === 'credit' ? 'Tip Received' : 'Tip Sent';
};

export async function processTip(userId: string, payload: { creator_id: string; video_id?: string; amount_ghs: string; message?: string }) {
  if (userId === payload.creator_id) throw new ApiError(403, 'You cannot tip yourself');
  const amount = Number(payload.amount_ghs);
  if (!Number.isFinite(amount) || amount < 1) throw new ApiError(400, 'Minimum tip amount is GHS 1.00');

  const creator = await User.findById(payload.creator_id);
  if (!creator) throw new ApiError(404, 'Creator not found');

  const transaction = await Transaction.create({
    user: userId,
    type: TransactionType.TIP,
    amount,
    currency: 'GHS',
    status: TransactionStatus.PENDING,
    provider: PaymentProvider.HUBTEL_MOMO,
    tipRecipient: creator._id,
    video: payload.video_id,
    description: payload.message,
    metadata: {
      creator_earnings_ghs: toMoney(amount * 0.85),
      platform_fee_ghs: toMoney(amount * 0.15),
    },
  });

  return {
    tip_id: transaction._id,
    status: transaction.status,
    amount_ghs: toMoney(amount),
    creator_earnings_ghs: toMoney(amount * 0.85),
    platform_fee_ghs: toMoney(amount * 0.15),
    poll_url: `/api/v1/tips/${transaction._id}/status`,
  };
}

export async function getTipStatus(userId: string, tipId: string) {
  const transaction = await Transaction.findOne({ _id: tipId, user: userId, type: TransactionType.TIP });
  if (!transaction) throw new ApiError(404, 'Tip not found');
  return { tip_id: transaction._id, status: transaction.status, amount_ghs: toMoney(transaction.amount) };
}

export async function getWalletBalance(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const pendingDebitStatuses = [TransactionStatus.PENDING];
  const pendingWithdrawals = await Transaction.aggregate([
    { $match: { user: user._id, type: TransactionType.WITHDRAWAL, isDeleted: false, status: { $in: pendingDebitStatuses } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const pendingFromTransactions = pendingWithdrawals[0]?.total || 0;
  const pendingBalance = Math.max(user.wallet.pendingBalance, pendingFromTransactions);
  const lifetimeEarnings = user.stats.totalTipsReceived + user.referral.referralEarnings;

  return {
    wallet: {
      currency: user.wallet.currency,
      available_balance: toMoneyNumber(user.wallet.balance),
      pending_balance: toMoneyNumber(pendingBalance),
      lifetime_earnings: toMoneyNumber(lifetimeEarnings),
    },
  };
}

export async function requestWithdrawal(userId: string, payload: { amount_ghs: string; network?: string; phone_number?: string }) {
  const amount = Number(payload.amount_ghs);
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (amount < 10) throw new ApiError(400, 'Withdrawal amount is below the GHS 10.00 minimum');
  if (user.wallet.balance < amount) throw new ApiError(400, 'Insufficient available balance');

  user.wallet.balance -= amount;
  user.wallet.lastWithdrawalAt = new Date();
  await user.save();

  const transaction = await Transaction.create({
    user: user._id,
    type: TransactionType.WITHDRAWAL,
    amount,
    currency: 'GHS',
    status: TransactionStatus.PENDING,
    provider: PaymentProvider.HUBTEL_MOMO,
    metadata: {
      network: payload.network || null,
      phone_number: payload.phone_number || null,
      wallet_status: 'pending',
      otp_verified_at: null,
      failure_reason: null,
    },
  });

  return {
    withdrawal_id: transaction._id,
    amount_ghs: toMoney(amount),
    status: 'processing',
    new_available_balance: toMoney(user.wallet.balance),
  };
}

export async function getTransactionHistory(userId: string, query: { type?: string; limit?: number }) {
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 50);
  const cursor = typeof (query as { cursor?: string }).cursor === 'string' ? (query as { cursor?: string }).cursor : null;
  const filter: Record<string, unknown> = { user: userId, isDeleted: false };

  const requestedType = query.type;
  if (requestedType && requestedType !== 'all') {
    if (requestedType === 'referral_reward') filter.type = TransactionType.REFERRAL_BONUS;
    else if (requestedType === 'subscription') filter.type = TransactionType.VIP_PURCHASE;
    else filter.type = requestedType;
  }

  if (cursor) {
    filter._id = { $lt: cursor };
  }

  const docs = await Transaction.find(filter).sort({ _id: -1 }).limit(limit + 1).populate('video', 'title');
  const hasNext = docs.length > limit;
  const page = hasNext ? docs.slice(0, limit) : docs;

  const transactions = page.map((tx) => {
    const type = mapTransactionType(tx.type);
    const direction = mapTransactionDirection(tx.type);
    const video = tx.video as unknown as { title?: string } | undefined;

    return {
      id: `txn_${String(tx._id)}`,
      type,
      title: toTransactionTitle(type, direction),
      subtitle: video?.title || tx.description || null,
      direction,
      amount: toMoneyNumber(tx.amount),
      currency: tx.currency,
      status: mapTransactionStatus(tx.status, tx.metadata),
      created_at: tx.createdAt.toISOString(),
    };
  });

  return {
    transactions,
    next_cursor: hasNext ? String(page[page.length - 1]._id) : null,
  };
}

export async function getWithdrawals(userId: string) {
  const withdrawals = await Transaction.find({
    user: userId,
    type: TransactionType.WITHDRAWAL,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(100);

  return {
    withdrawals: withdrawals.map((wd) => ({
      id: `wd_${String(wd._id)}`,
      amount: toMoneyNumber(wd.amount),
      currency: wd.currency,
      network: typeof wd.metadata?.network === 'string' ? wd.metadata.network : null,
      phone_number: typeof wd.metadata?.phone_number === 'string' ? wd.metadata.phone_number : null,
      status: mapWithdrawalStatus(wd.status, wd.metadata),
      created_at: wd.createdAt.toISOString(),
      otp_verified_at: wd.metadata?.otp_verified_at ? new Date(String(wd.metadata.otp_verified_at)).toISOString() : null,
      failure_reason: typeof wd.metadata?.failure_reason === 'string' ? wd.metadata.failure_reason : null,
    })),
  };
}

export async function getWalletHome(userId: string) {
  const [summary, recent] = await Promise.all([
    getWalletBalance(userId),
    getTransactionHistory(userId, { limit: 4 }),
  ]);

  return {
    summary: summary.wallet,
    recent_activities: recent.transactions,
  };
}

type EarningsPeriod = '7d' | '30d' | '90d' | 'all';
type EarningsSort = 'earnings' | 'tips_count' | 'views';

const getPeriodStartDate = (period: EarningsPeriod): Date | null => {
  if (period === 'all') return null;
  const now = Date.now();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return new Date(now - days * 24 * 60 * 60 * 1000);
};

export async function getEarningsByVideo(
  userId: string,
  query: { period?: string; sort?: string }
) {
  const period = (query.period || '30d') as EarningsPeriod;
  const sort = (query.sort || 'earnings') as EarningsSort;
  const startDate = getPeriodStartDate(period);
  const user = await User.findById(userId).select('wallet.currency stats.totalTipsReceived referral.referralEarnings');
  if (!user) throw new ApiError(404, 'User not found');

  const tipMatch: Record<string, unknown> = {
    tipRecipient: user._id,
    type: TransactionType.TIP,
    status: TransactionStatus.COMPLETED,
    isDeleted: false,
  };
  if (startDate) tipMatch.createdAt = { $gte: startDate };

  const tipAgg = await Transaction.aggregate([
    { $match: tipMatch },
    {
      $group: {
        _id: '$video',
        tips_earnings: { $sum: '$amount' },
        tips_count: { $sum: 1 },
      },
    },
  ]);

  const subMatch: Record<string, unknown> = {
    type: TransactionType.VIP_PURCHASE,
    status: TransactionStatus.COMPLETED,
    isDeleted: false,
    $or: [{ user: user._id }, { tipRecipient: user._id }, { 'metadata.creator_id': String(user._id) }],
  };
  if (startDate) subMatch.createdAt = { $gte: startDate };

  const subAgg = await Transaction.aggregate([
    { $match: subMatch },
    {
      $group: {
        _id: '$video',
        subscriptions_earnings: { $sum: '$amount' },
      },
    },
  ]);

  const perVideo = new Map<string, {
    video_id: string;
    title: string;
    tips_earnings: number;
    subscriptions_earnings: number;
    total_earnings: number;
    views: number;
    tips_count: number;
  }>();

  for (const row of tipAgg) {
    if (!row._id) continue;
    const key = String(row._id);
    perVideo.set(key, {
      video_id: key,
      title: '',
      tips_earnings: Number(row.tips_earnings || 0),
      subscriptions_earnings: 0,
      total_earnings: Number(row.tips_earnings || 0),
      views: 0,
      tips_count: Number(row.tips_count || 0),
    });
  }

  for (const row of subAgg) {
    if (!row._id) continue;
    const key = String(row._id);
    const existing = perVideo.get(key);
    if (existing) {
      existing.subscriptions_earnings = Number(row.subscriptions_earnings || 0);
      existing.total_earnings = existing.tips_earnings + existing.subscriptions_earnings;
      continue;
    }
    perVideo.set(key, {
      video_id: key,
      title: '',
      tips_earnings: 0,
      subscriptions_earnings: Number(row.subscriptions_earnings || 0),
      total_earnings: Number(row.subscriptions_earnings || 0),
      views: 0,
      tips_count: 0,
    });
  }

  const videoIds = Array.from(perVideo.keys());
  if (videoIds.length) {
    const videos = await Video.find({ _id: { $in: videoIds }, creator: user._id, isDeleted: false }).select('title views');
    for (const video of videos) {
      const key = String(video._id);
      const existing = perVideo.get(key);
      if (!existing) continue;
      existing.title = video.title;
      existing.views = Number(video.views || 0);
      existing.video_id = `vid_${key}`;
    }
  }

  const rows = Array.from(perVideo.values())
    .filter((v) => v.title)
    .map((v) => ({
      video_id: v.video_id,
      title: v.title,
      tips_earnings: toMoneyNumber(v.tips_earnings),
      subscriptions_earnings: toMoneyNumber(v.subscriptions_earnings),
      total_earnings: toMoneyNumber(v.total_earnings),
      views: v.views,
      tips_count: v.tips_count,
    }));

  rows.sort((a, b) => {
    if (sort === 'views') return b.views - a.views;
    if (sort === 'tips_count') return b.tips_count - a.tips_count;
    return b.total_earnings - a.total_earnings;
  });

  const lifetimeEarnings = user.stats.totalTipsReceived + user.referral.referralEarnings;

  const summary = {
    currency: user.wallet.currency || 'GHS',
    total_earnings: toMoneyNumber(lifetimeEarnings),
    total_views: rows.reduce((sum, row) => sum + row.views, 0),
    tips_total: toMoneyNumber(user.stats.totalTipsReceived),
    subscriptions_total: toMoneyNumber(rows.reduce((sum, row) => sum + row.subscriptions_earnings, 0)),
    referral_rewards_total: toMoneyNumber(user.referral.referralEarnings),
  };

  return {
    summary,
    videos: rows.map(({ tips_count: _tipsCount, ...video }) => video),
  };
}

type MomoNetwork = 'mtn' | 'vodafone' | 'airteltigo';

type ServiceErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_NETWORK'
  | 'INVALID_PHONE'
  | 'CHALLENGE_NOT_FOUND'
  | 'OTP_EXPIRED'
  | 'INVALID_OTP';

export class WalletContractError extends Error {
  public readonly statusCode: number;
  public readonly code: ServiceErrorCode;

  constructor(statusCode: number, message: string, code: ServiceErrorCode) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const VALID_NETWORKS = new Set<MomoNetwork>(['mtn', 'vodafone', 'airteltigo']);

function assertValidNetwork(network: string): asserts network is MomoNetwork {
  if (!VALID_NETWORKS.has(network as MomoNetwork)) {
    throw new WalletContractError(400, 'Invalid network.', 'INVALID_NETWORK');
  }
}

function assertValidPhoneNumber(phoneNumber: string) {
  if (!/^0\d{9}$/.test(phoneNumber)) {
    throw new WalletContractError(400, 'Invalid phone number.', 'INVALID_PHONE');
  }
}

const maskPhone = (phoneNumber: string) => {
  if (phoneNumber.length < 6) return phoneNumber;
  return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-2)}`;
};

export async function getMomoAccount(userId: string) {
  const user = await User.findById(userId).select('wallet.momoAccount');
  if (!user) throw new WalletContractError(401, 'Unauthorized.', 'UNAUTHORIZED');

  const momo = user.wallet.momoAccount;
  return {
    account: {
      network: momo?.network || null,
      phone_number: momo?.phoneNumber || null,
      account_name: momo?.accountName || null,
      is_verified: momo?.isVerified || false,
      updated_at: momo?.updatedAt ? momo.updatedAt.toISOString() : null,
    },
  };
}

export async function beginMomoAccountUpdate(
  userId: string,
  payload: { network?: string; phone_number?: string }
) {
  const networkInput = String(payload.network || '').trim().toLowerCase();
  const phoneNumber = String(payload.phone_number || '').trim();

  assertValidNetwork(networkInput);
  const network: MomoNetwork = networkInput;
  assertValidPhoneNumber(phoneNumber);

  const user = await User.findById(userId).select('_id username profile.displayName');
  if (!user) throw new WalletContractError(401, 'Unauthorized.', 'UNAUTHORIZED');
  const accountName = (user.profile?.displayName || user.username || '').trim();
  const resolvedAccountName = accountName || 'Tamkko User';

  const challengeId = `otp_${randomBytes(6).toString('hex')}`;
  const otp = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await MomoAccountChallenge.create({
    user: user._id,
    challengeId,
    otp,
    network,
    phoneNumber,
    accountName: resolvedAccountName,
    expiresAt,
  });

  const response: {
    challenge_id: string;
    masked_phone: string;
    expires_at: string;
    account_name: string;
    otp?: string;
  } = {
    challenge_id: challengeId,
    masked_phone: maskPhone(phoneNumber),
    expires_at: expiresAt.toISOString(),
    account_name: resolvedAccountName,
  };

  if (env.NODE_ENV === 'development') {
    response.otp = otp;
  }

  return response;
}

export async function confirmMomoAccountUpdate(
  userId: string,
  payload: {
    challenge_id?: string;
    otp?: string;
    network?: string;
    phone_number?: string;
  }
) {
  const challengeId = String(payload.challenge_id || '').trim();
  const otp = String(payload.otp || '').trim();
  const networkInput = String(payload.network || '').trim().toLowerCase();
  const phoneNumber = String(payload.phone_number || '').trim();

  assertValidNetwork(networkInput);
  const network: MomoNetwork = networkInput;
  assertValidPhoneNumber(phoneNumber);

  if (!challengeId) throw new WalletContractError(404, 'Challenge not found.', 'CHALLENGE_NOT_FOUND');

  const challenge = await MomoAccountChallenge.findOne({ challengeId });
  if (!challenge) throw new WalletContractError(404, 'Challenge not found.', 'CHALLENGE_NOT_FOUND');
  if (String(challenge.user) !== userId) throw new WalletContractError(401, 'Unauthorized.', 'UNAUTHORIZED');
  if (challenge.usedAt) throw new WalletContractError(404, 'Challenge not found.', 'CHALLENGE_NOT_FOUND');
  if (challenge.expiresAt.getTime() < Date.now()) throw new WalletContractError(400, 'OTP expired.', 'OTP_EXPIRED');
  if (challenge.otp !== otp) throw new WalletContractError(400, 'Invalid OTP.', 'INVALID_OTP');
  if (challenge.network !== network || challenge.phoneNumber !== phoneNumber) {
    throw new WalletContractError(400, 'Invalid OTP.', 'INVALID_OTP');
  }

  const user = await User.findById(userId);
  if (!user) throw new WalletContractError(401, 'Unauthorized.', 'UNAUTHORIZED');

  const updatedAt = new Date();
  user.wallet.momoAccount = {
    network,
    phoneNumber,
    accountName: challenge.accountName,
    isVerified: true,
    updatedAt,
  };

  await Promise.all([
    user.save(),
    MomoAccountChallenge.updateOne({ _id: challenge._id }, { $set: { usedAt: new Date() } }),
  ]);

  return {
    ok: true,
    message: 'Mobile money account updated.',
    account: {
      network,
      phone_number: phoneNumber,
      account_name: challenge.accountName,
      is_verified: true,
      updated_at: updatedAt.toISOString(),
    },
  };
}

export async function processPayout(withdrawalId: string, _payload: unknown) {
  const transaction = await Transaction.findByIdAndUpdate(
    withdrawalId,
    { status: TransactionStatus.COMPLETED, processedAt: new Date() },
    { new: true }
  );
  if (!transaction) throw new ApiError(404, 'Withdrawal not found');
  return transaction;
}

export async function getPlatformRevenue() {
  const tips = await Transaction.find({ type: TransactionType.TIP, status: TransactionStatus.COMPLETED });
  const total = tips.reduce((sum, tip) => sum + tip.amount * 0.15, 0);
  return { total_revenue_ghs: toMoney(total), transaction_counts: { total_tips: tips.length } };
}
