import { Types } from 'mongoose';
import { VIPMembership } from '@/models/VIPMembership';
import { VIPRoom } from '@/models/vipRoom.model';
import { Transaction } from '@/models/Transaction';
import { ApiError } from '@/utils/apiError';

const toObjectId = (id: string) => id as unknown as Types.ObjectId;

export const createRoom = async (creatorId: string, data: any) => {
  return VIPRoom.create({
    creator: toObjectId(creatorId),
    name: data.name,
    description: data.description,
    tier: data.tier ?? 'gold',
    monthlyFee: data.monthlyFee ?? data.monthly_fee ?? data.entryFee ?? 0,
  });
};

export const listRooms = async (query: any) => {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
  const filter: Record<string, unknown> = { isDeleted: false, isActive: true };
  if (query.tier) filter.tier = query.tier;
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };

  const [items, total] = await Promise.all([
    VIPRoom.find(filter)
      .populate('creator', 'username profile.displayName')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
    VIPRoom.countDocuments(filter),
  ]);

  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getRoom = async (roomId: string) => {
  const room = await VIPRoom.findOne({ _id: roomId, isDeleted: false }).populate(
    'creator',
    'username profile.displayName'
  );
  if (!room) throw new ApiError(404, 'VIP room not found.');
  return room;
};

export const updateRoom = async (roomId: string, actorId: string, data: any) => {
  const room = await VIPRoom.findOne({ _id: roomId, creator: actorId, isDeleted: false });
  if (!room) throw new ApiError(403, 'You cannot update this VIP room.');
  Object.assign(room, {
    name: data.name ?? room.name,
    description: data.description ?? room.description,
    tier: data.tier ?? room.tier,
    monthlyFee: data.monthlyFee ?? data.monthly_fee ?? room.monthlyFee,
    isActive: data.isActive ?? room.isActive,
  });
  return room.save();
};

export const deleteRoom = async (roomId: string, actorId: string) => {
  const room = await VIPRoom.findOne({ _id: roomId, creator: actorId, isDeleted: false });
  if (!room) throw new ApiError(403, 'You cannot delete this VIP room.');
  room.isDeleted = true;
  room.isActive = false;
  await room.save();
  return room;
};

export const joinRoom = async (roomId: string, userId: string, data: any) => {
  const room = await getRoom(roomId);
  const existing = await VIPMembership.findOne({ vipRoom: room._id, user: userId, isDeleted: false });
  if (existing?.status === 'active') throw new ApiError(409, 'You are already a member of this VIP room.');

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const membership = await VIPMembership.findOneAndUpdate(
    { vipRoom: room._id, user: userId },
    {
      vipRoom: room._id,
      user: toObjectId(userId),
      startDate: new Date(),
      endDate,
      autoRenew: Boolean(data.autoRenew),
      status: room.monthlyFee > 0 ? 'pending_payment' : 'active',
      isDeleted: false,
    },
    { new: true, upsert: true }
  );

  if (membership.status === 'active') {
    await VIPRoom.updateOne({ _id: room._id }, { $inc: { memberCount: 1 } });
  }

  return membership;
};

export const leaveRoom = async (roomId: string, userId: string) => {
  const membership = await VIPMembership.findOneAndUpdate(
    { vipRoom: roomId, user: userId, isDeleted: false, status: 'active' },
    { status: 'cancelled', isDeleted: true },
    { new: true }
  );
  if (!membership) throw new ApiError(404, 'Active VIP membership not found.');
  await VIPRoom.updateOne({ _id: roomId, memberCount: { $gt: 0 } }, { $inc: { memberCount: -1 } });
  return membership;
};

export const getRoomMembers = async (roomId: string, query: any) => {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 100);
  const filter = { vipRoom: roomId, isDeleted: false };
  const [items, total] = await Promise.all([
    VIPMembership.find(filter)
      .populate('user', 'username profile.displayName profile.avatar')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
    VIPMembership.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const processPayment = async (roomId: string, userId: string, data: any) => {
  const room = await getRoom(roomId);
  const membership = await VIPMembership.findOne({ vipRoom: roomId, user: userId, isDeleted: false });
  if (!membership) throw new ApiError(404, 'VIP membership not found.');

  const transaction = await Transaction.create({
    type: 'vip_subscription',
    status: 'completed',
    from: toObjectId(userId),
    to: room.creator,
    amount: room.monthlyFee,
    currency: data.currency ?? 'GHS',
    paymentReference: data.paymentReference ?? data.reference,
    metadata: { roomId },
  });

  membership.status = 'active';
  await membership.save();
  await VIPRoom.updateOne({ _id: roomId }, { $inc: { memberCount: 1 } });
  return { membership, transaction };
};

export const getRoomRevenue = async (roomId: string) => {
  const result = await Transaction.aggregate([
    { $match: { type: 'vip_subscription', status: 'completed', 'metadata.roomId': roomId } },
    { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return { roomId, revenue: result };
};

export const createCampusCode = async (data: any) => ({
  code: data.code ?? `VIP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  roomId: data.roomId,
  expiresAt: data.expiresAt,
});

export const listCampusCodes = async () => ({ items: [] });
