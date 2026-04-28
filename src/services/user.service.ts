import { PipelineStage, Types } from 'mongoose';
import { Follow } from '@/models/Follow';
import { ApiError } from '@/utils/apiError';
import { UserSubscription } from '@/models/UserSubscription';

const encodeCursor = (payload: { id: string; followed_at: string }) =>
  `cursor_${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;

const decodeCursor = (cursor: string): { id: string; followed_at: Date } | null => {
  try {
    if (!cursor.startsWith('cursor_')) return null;
    const raw = cursor.slice('cursor_'.length);
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as { id?: string; followed_at?: string };
    if (!parsed.id || !parsed.followed_at) return null;
    const followedAt = new Date(parsed.followed_at);
    if (Number.isNaN(followedAt.getTime())) return null;
    return { id: parsed.id, followed_at: followedAt };
  } catch {
    return null;
  }
};

export const getMyFollowers = async (userId: string, query: { cursor?: string; limit?: number; q?: string }) => {
  const limit = query.limit ?? 20;
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  if (query.cursor && !cursorData) {
    throw new ApiError(400, 'Invalid cursor');
  }

  const total_followers_count = await Follow.countDocuments({
    following: new Types.ObjectId(userId),
    isDeleted: false,
  });

  const match: Record<string, unknown> = {
    following: new Types.ObjectId(userId),
    isDeleted: false,
  };

  if (cursorData) {
    match.$or = [
      { createdAt: { $lt: cursorData.followed_at } },
      { createdAt: cursorData.followed_at, _id: { $lt: new Types.ObjectId(cursorData.id) } },
    ];
  }

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'follower',
        foreignField: '_id',
        as: 'followerUser',
      },
    },
    { $unwind: '$followerUser' },
    { $match: { 'followerUser.isDeleted': false } },
  ];

  if (query.q) {
    pipeline.push({
      $match: {
        $or: [
          { 'followerUser.username': { $regex: query.q, $options: 'i' } },
          { 'followerUser.profile.displayName': { $regex: query.q, $options: 'i' } },
        ],
      },
    });
  }

  pipeline.push(
    {
      $project: {
        _id: 0,
        id: { $toString: '$followerUser._id' },
        username: '$followerUser.username',
        display_name: '$followerUser.profile.displayName',
        avatar_url: { $ifNull: ['$followerUser.profile.avatarUrl', null] },
        is_verified: '$followerUser.profile.isVerified',
        followed_at: '$createdAt',
        cursor_id: { $toString: '$_id' },
      },
    },
    { $limit: limit + 1 }
  );

  const rows = await Follow.aggregate(pipeline);
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const next_cursor = has_more && last
    ? encodeCursor({ id: last.cursor_id, followed_at: new Date(last.followed_at).toISOString() })
    : null;

  const followers = items.map((item) => ({
    id: item.id,
    username: item.username,
    display_name: item.display_name ?? '',
    avatar_url: item.avatar_url,
    is_verified: Boolean(item.is_verified),
    followed_at: new Date(item.followed_at).toISOString(),
  }));

  return { total_followers_count, followers, next_cursor, has_more };
};

export const getMyFollowing = async (userId: string, query: { cursor?: string; limit?: number; q?: string }) => {
  const limit = query.limit ?? 20;
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  if (query.cursor && !cursorData) {
    throw new ApiError(400, 'Invalid cursor');
  }

  const total_following_count = await Follow.countDocuments({
    follower: new Types.ObjectId(userId),
    isDeleted: false,
  });

  const match: Record<string, unknown> = {
    follower: new Types.ObjectId(userId),
    isDeleted: false,
  };

  if (cursorData) {
    match.$or = [
      { createdAt: { $lt: cursorData.followed_at } },
      { createdAt: cursorData.followed_at, _id: { $lt: new Types.ObjectId(cursorData.id) } },
    ];
  }

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'following',
        foreignField: '_id',
        as: 'followingUser',
      },
    },
    { $unwind: '$followingUser' },
    { $match: { 'followingUser.isDeleted': false } },
  ];

  if (query.q) {
    pipeline.push({
      $match: {
        $or: [
          { 'followingUser.username': { $regex: query.q, $options: 'i' } },
          { 'followingUser.profile.displayName': { $regex: query.q, $options: 'i' } },
        ],
      },
    });
  }

  pipeline.push(
    {
      $project: {
        _id: 0,
        id: { $toString: '$followingUser._id' },
        username: '$followingUser.username',
        display_name: '$followingUser.profile.displayName',
        avatar_url: { $ifNull: ['$followingUser.profile.avatarUrl', null] },
        is_verified: '$followingUser.profile.isVerified',
        followed_at: '$createdAt',
        cursor_id: { $toString: '$_id' },
      },
    },
    { $limit: limit + 1 }
  );

  const rows = await Follow.aggregate(pipeline);
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const next_cursor = has_more && last
    ? encodeCursor({ id: last.cursor_id, followed_at: new Date(last.followed_at).toISOString() })
    : null;

  const following = items.map((item) => ({
    id: item.id,
    username: item.username,
    display_name: item.display_name ?? '',
    avatar_url: item.avatar_url,
    is_verified: Boolean(item.is_verified),
    followed_at: new Date(item.followed_at).toISOString(),
  }));

  return { total_following_count, following, next_cursor, has_more };
};

export const getMySubscribers = async (userId: string, query: { cursor?: string; limit?: number; q?: string }) => {
  const limit = query.limit ?? 20;
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
  if (query.cursor && !cursorData) {
    throw new ApiError(400, 'Invalid cursor');
  }

  const total_subscribers_count = await UserSubscription.countDocuments({
    creator: new Types.ObjectId(userId),
    isDeleted: false,
  });

  const match: Record<string, unknown> = {
    creator: new Types.ObjectId(userId),
    isDeleted: false,
  };

  if (cursorData) {
    match.$or = [
      { startedAt: { $lt: cursorData.followed_at } },
      { startedAt: cursorData.followed_at, _id: { $lt: new Types.ObjectId(cursorData.id) } },
    ];
  }

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { startedAt: -1, _id: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'subscriber',
        foreignField: '_id',
        as: 'subscriberUser',
      },
    },
    { $unwind: '$subscriberUser' },
    { $match: { 'subscriberUser.isDeleted': false } },
  ];

  if (query.q) {
    pipeline.push({
      $match: {
        $or: [
          { 'subscriberUser.username': { $regex: query.q, $options: 'i' } },
          { 'subscriberUser.profile.displayName': { $regex: query.q, $options: 'i' } },
        ],
      },
    });
  }

  pipeline.push(
    {
      $project: {
        _id: 0,
        id: { $toString: '$subscriberUser._id' },
        username: '$subscriberUser.username',
        display_name: '$subscriberUser.profile.displayName',
        avatar_url: { $ifNull: ['$subscriberUser.profile.avatarUrl', null] },
        bio: { $ifNull: ['$subscriberUser.profile.bio', ''] },
        followers_count: { $ifNull: ['$subscriberUser.stats.followersCount', 0] },
        is_verified: '$subscriberUser.profile.isVerified',
        subscribed_since: '$startedAt',
        status: '$status',
        cursor_id: { $toString: '$_id' },
      },
    },
    { $limit: limit + 1 }
  );

  const rows = await UserSubscription.aggregate(pipeline);
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const next_cursor = has_more && last
    ? encodeCursor({ id: last.cursor_id, followed_at: new Date(last.subscribed_since).toISOString() })
    : null;

  const subscribers = items.map((item) => ({
    id: item.id,
    username: item.username,
    display_name: item.display_name ?? '',
    avatar_url: item.avatar_url,
    bio: item.bio ?? '',
    followers_count: Number(item.followers_count ?? 0),
    is_verified: Boolean(item.is_verified),
    subscribed_since: new Date(item.subscribed_since).toISOString(),
    status: item.status as 'active' | 'cancelled' | 'expired',
  }));

  return { total_subscribers_count, subscribers, next_cursor, has_more };
};
