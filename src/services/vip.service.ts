import { Types } from 'mongoose';
import { VIPMembership } from '@/models/VIPMembership';
import { VIPRoom } from '@/models/vipRoom.model';
import { Transaction } from '@/models/Transaction';
import { ApiError } from '@/utils/apiError';
import { RoomAccessPass } from '@/models/RoomAccessPass';

const toObjectId = (id: string) => id as unknown as Types.ObjectId;
const PAID_ROOM_CAPACITY = 1000;
const FREE_ROOM_CAPACITY = 500;

const resolveFee = (data: any) => {
  const raw = data.monthlyFee ?? data.monthly_fee ?? data.entryFee ?? data.entry_fee_ghs ?? 0;
  const value = typeof raw === 'string' ? Number(raw) : Number(raw ?? 0);
  if (!Number.isFinite(value) || value < 0) throw new ApiError(400, 'Invalid entry fee.');
  return value;
};

const capacityForFee = (fee: number) => (fee > 0 ? PAID_ROOM_CAPACITY : FREE_ROOM_CAPACITY);

const mapRoom = (
  room: any,
  joinedRoomIds: Set<string>,
  paidRoomIds: Set<string>,
  viewerUserId?: string,
  memberCountOverride?: number
) => {
  const roomId = String(room._id);
  const creatorId = String(room.creator?._id || room.creator);
  const isOwner = viewerUserId ? creatorId === viewerUserId : false;
  const hasJoined = isOwner || joinedRoomIds.has(roomId);
  const hasPaid = isOwner || paidRoomIds.has(roomId);
  const effectiveMemberCount = Math.max(
    Number(room.memberCount || 0),
    Number(memberCountOverride || 0),
    isOwner ? 1 : 0
  );
  return {
    id: roomId,
    name: room.name,
    description: room.description || '',
    entry_fee_ghs: Number(room.monthlyFee || 0),
    currency: 'GHS',
    is_public: Boolean(room.isPublic),
    allow_tips: Boolean(room.allowTips),
    status: room.status || 'active',
    capacity: Number(room.capacity || 0),
    member_count: effectiveMemberCount,
    online_count: 0,
    creator_id: creatorId,
    creator_username: room.creator?.username || null,
    creator_display_name: room.creator?.profile?.displayName || room.creator?.username || null,
    welcome_message: room.welcomeMessage || '',
    has_joined: hasJoined,
    has_paid: hasPaid,
    created_at: room.createdAt?.toISOString?.() || new Date().toISOString(),
    updated_at: room.updatedAt?.toISOString?.() || new Date().toISOString(),
  };
};

const getActiveMembershipCounts = async (roomIds: string[]) => {
  if (!roomIds.length) return new Map<string, number>();
  const rows = await VIPMembership.aggregate([
    { $match: { vipRoom: { $in: roomIds.map((id) => new Types.ObjectId(id)) }, status: 'active', isDeleted: false } },
    { $group: { _id: '$vipRoom', count: { $sum: 1 } } },
  ]);
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(String(row._id), Number(row.count || 0));
  return counts;
};

const getUserMembershipSets = async (userId: string) => {
  const memberships = await VIPMembership.find({ user: userId, isDeleted: false }).select('vipRoom status');
  const joinedRoomIds = new Set<string>();
  const paidRoomIds = new Set<string>();
  for (const m of memberships) {
    const rid = String(m.vipRoom);
    joinedRoomIds.add(rid);
    if (m.status === 'active') paidRoomIds.add(rid);
  }
  return { joinedRoomIds, paidRoomIds };
};

const buildRoomListFilter = (query: any, userId?: string): Record<string, unknown> => {
  const filter: Record<string, unknown> = { isDeleted: false, isActive: true };
  if (query.scope === 'public' || !query.scope) {
    filter.isPublic = true;
    if (userId) filter.creator = { $ne: userId };
  }
  if (query.type === 'free') filter.monthlyFee = 0;
  if (query.type === 'paid') filter.monthlyFee = { $gt: 0 };
  if (query.cursor) filter._id = { $lt: query.cursor };
  if (query.q) {
    filter.$or = [
      { name: { $regex: query.q, $options: 'i' } },
      { description: { $regex: query.q, $options: 'i' } },
    ];
  }
  if (query.scope === 'mine' && userId) filter.creator = userId;
  return filter;
};

const buildSort = (sort?: string) => {
  if (sort === 'popular') return { memberCount: -1, _id: -1 };
  if (sort === 'fee_asc') return { monthlyFee: 1, _id: -1 };
  if (sort === 'fee_desc') return { monthlyFee: -1, _id: -1 };
  return { _id: -1 };
};

const validateAccessPassRules = (payload: {
  discount_type?: string;
  discount_amount_ghs?: number | null;
}) => {
  const t = payload.discount_type;
  const v = payload.discount_amount_ghs;
  if (!t) return;
  if (t === 'free' && v != null) throw new ApiError(400, 'discount_amount_ghs must be null for free discount.');
  if (t === 'fixed' && (!(typeof v === 'number') || v <= 0)) throw new ApiError(400, 'discount_amount_ghs must be > 0 for fixed discount.');
  if (t === 'percent' && (!(typeof v === 'number') || v < 1 || v > 100)) throw new ApiError(400, 'discount_amount_ghs must be between 1 and 100 for percent discount.');
};

const computeDiscount = (original: number, pass: any) => {
  if (pass.discountType === 'free') return original;
  if (pass.discountType === 'fixed') return Math.min(original, Number(pass.discountAmountGhs || 0));
  if (pass.discountType === 'percent') return Math.min(original, (original * Number(pass.discountAmountGhs || 0)) / 100);
  return 0;
};

const findValidPass = async (roomId: string, codeString: string) => {
  const pass = await RoomAccessPass.findOne({
    room: roomId,
    code: codeString.trim().toUpperCase(),
    isDeleted: false,
    isActive: true,
  });
  if (!pass) return null;
  if (pass.expiresAt && pass.expiresAt.getTime() < Date.now()) return null;
  if (pass.usedCount >= pass.maxUses) return null;
  return pass;
};

export const createRoom = async (creatorId: string, data: any) => {
  const monthlyFee = resolveFee(data);
  const room = await VIPRoom.create({
    creator: toObjectId(creatorId),
    name: data.name,
    description: data.description,
    tier: data.tier ?? 'gold',
    monthlyFee,
    capacity: capacityForFee(monthlyFee),
    isPublic: data.is_public ?? true,
    allowTips: data.allow_tips ?? true,
    welcomeMessage: data.welcome_message ?? undefined,
    status: 'active',
  });
  await VIPMembership.create({
    vipRoom: room._id,
    user: toObjectId(creatorId),
    startDate: new Date(),
    status: 'active',
    isDeleted: false,
  });
  room.memberCount = 1;
  await room.save();
  const hydrated = await VIPRoom.findById(room._id).populate('creator', 'username profile.displayName');
  return mapRoom(hydrated, new Set([String(room._id)]), new Set([String(room._id)]), creatorId);
};

export const listRooms = async (query: any, userId: string) => {
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
  const filter = buildRoomListFilter(query, userId);
  const rooms = await VIPRoom.find(filter).populate('creator', 'username profile.displayName').sort(buildSort(query.sort) as any).limit(limit + 1);
  const hasNext = rooms.length > limit;
  const page = hasNext ? rooms.slice(0, limit) : rooms;
  const { joinedRoomIds, paidRoomIds } = await getUserMembershipSets(userId);
  const memberCounts = await getActiveMembershipCounts(page.map((r) => String(r._id)));
  return {
    rooms: page.map((room) =>
      mapRoom(room, joinedRoomIds, paidRoomIds, userId, memberCounts.get(String(room._id)))
    ),
    next_cursor: hasNext ? String(page[page.length - 1]._id) : null,
  };
};

export const listJoinedRooms = async (query: any, userId: string) => {
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
  const memberships = await VIPMembership.find({ user: userId, isDeleted: false }).select('vipRoom status');
  const roomIds = memberships.map((m) => m.vipRoom);
  if (!roomIds.length) return { rooms: [], next_cursor: null };
  const paidRoomIds = new Set<string>(memberships.filter((m) => m.status === 'active').map((m) => String(m.vipRoom)));
  const joinedRoomIds = new Set<string>(memberships.map((m) => String(m.vipRoom)));
  const filter: Record<string, unknown> = { _id: { $in: roomIds }, isDeleted: false, isActive: true };
  if (query.cursor) filter._id = { $in: roomIds, $lt: query.cursor };
  if (query.q) filter.name = { $regex: query.q, $options: 'i' };
  const rooms = await VIPRoom.find(filter).populate('creator', 'username profile.displayName').sort({ _id: -1 }).limit(limit + 1);
  const hasNext = rooms.length > limit;
  const page = hasNext ? rooms.slice(0, limit) : rooms;
  const memberCounts = await getActiveMembershipCounts(page.map((r) => String(r._id)));
  return {
    rooms: page.map((room) =>
      mapRoom(room, joinedRoomIds, paidRoomIds, userId, memberCounts.get(String(room._id)))
    ),
    next_cursor: hasNext ? String(page[page.length - 1]._id) : null,
  };
};

export const listMyRooms = async (query: any, userId: string) => {
  return listRooms({ ...query, scope: 'mine' }, userId);
};

export const getRoom = async (roomId: string, userId: string) => {
  const room = await VIPRoom.findOne({ _id: roomId, isDeleted: false }).populate('creator', 'username profile.displayName');
  if (!room) throw new ApiError(404, 'VIP room not found.');
  const { joinedRoomIds, paidRoomIds } = await getUserMembershipSets(userId);
  const memberCounts = await getActiveMembershipCounts([String(room._id)]);
  const mapped = mapRoom(room, joinedRoomIds, paidRoomIds, userId, memberCounts.get(String(room._id)));
  return {
    ...mapped,
    role: String(room.creator?._id || room.creator) === userId ? 'owner' : 'member',
    share_url: `https://tamkko.com/rooms/${roomId}`,
    deep_link: `tamkko://rooms/${roomId}`,
  };
};

export const updateRoom = async (roomId: string, actorId: string, data: any) => {
  const room = await VIPRoom.findOne({ _id: roomId, creator: actorId, isDeleted: false });
  if (!room) throw new ApiError(403, 'You cannot update this VIP room.');
  const monthlyFee = resolveFee({
    monthlyFee: data.monthlyFee ?? room.monthlyFee,
    monthly_fee: data.monthly_fee,
    entryFee: data.entryFee,
    entry_fee_ghs: data.entry_fee_ghs,
  });
  Object.assign(room, {
    name: data.name ?? room.name,
    description: data.description ?? room.description,
    tier: data.tier ?? room.tier,
    monthlyFee,
    capacity: capacityForFee(monthlyFee),
    isPublic: data.is_public ?? room.isPublic,
    allowTips: data.allow_tips ?? room.allowTips,
    welcomeMessage: data.welcome_message ?? room.welcomeMessage,
    isActive: data.isActive ?? room.isActive,
  });
  if (room.memberCount > room.capacity) throw new ApiError(400, 'Cannot reduce room capacity below current member count.');
  return room.save();
};

export const deleteRoom = async (roomId: string, actorId: string) => {
  const room = await VIPRoom.findOne({ _id: roomId, creator: actorId, isDeleted: false });
  if (!room) throw new ApiError(403, 'You cannot delete this VIP room.');
  room.isDeleted = true;
  room.isActive = false;
  room.status = 'archived';
  await room.save();
  return room;
};

export const joinRoom = async (roomId: string, userId: string, data: any) => {
  const room = await VIPRoom.findOne({ _id: roomId, isDeleted: false, isActive: true });
  if (!room) throw new ApiError(404, 'VIP room not found.');
  if (room.memberCount >= room.capacity) throw new ApiError(409, 'Room has reached maximum member capacity.');
  const existing = await VIPMembership.findOne({ vipRoom: room._id, user: userId, isDeleted: false });
  if (existing?.status === 'active') {
    return { joined: true, message: 'Joined successfully.', room: { id: String(room._id), has_joined: true, has_paid: true } };
  }

  const original = Number(room.monthlyFee || 0);
  const code = data.code_string ? String(data.code_string).trim() : '';
  let discountAmount = 0;
  let appliedCode: string | null = null;
  let appliedPass: any = null;
  if (code) {
    const validPass = await findValidPass(String(room._id), code);
    if (!validPass) throw new ApiError(400, 'Promo code is invalid, expired, or exhausted.');
    discountAmount = computeDiscount(original, validPass);
    appliedCode = validPass.code;
    appliedPass = validPass;
  }
  const payable = Math.max(0, original - discountAmount);

  if (original > 0) {
    if (payable > 0) {
      return {
        joined: false,
        payment_required: true,
        message: 'Payment required to join this room.',
        original_amount_ghs: original,
        discount_amount_ghs: discountAmount,
        payable_amount_ghs: payable,
        code_applied: appliedCode,
      };
    }
  }

  await VIPMembership.findOneAndUpdate(
    { vipRoom: room._id, user: userId },
    {
      vipRoom: room._id,
      user: toObjectId(userId),
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenew: Boolean(data.autoRenew),
      status: 'active',
      isDeleted: false,
    },
    { new: true, upsert: true }
  );
  await VIPRoom.updateOne({ _id: room._id }, { $inc: { memberCount: 1 } });
  if (appliedPass) {
    await RoomAccessPass.updateOne({ _id: appliedPass._id }, { $inc: { usedCount: 1 } });
  }
  return { joined: true, message: 'Joined successfully.', room: { id: String(room._id), has_joined: true, has_paid: true } };
};

export const previewPromoCode = async (roomId: string, body: { code_string?: string }) => {
  const room = await VIPRoom.findOne({ _id: roomId, isDeleted: false, isActive: true });
  if (!room) throw new ApiError(404, 'VIP room not found.');
  const code = String(body.code_string || '').trim();
  const pass = await findValidPass(roomId, code);
  if (!pass) throw new ApiError(400, 'Promo code is invalid, expired, or exhausted.');
  const original = Number(room.monthlyFee || 0);
  const discount = computeDiscount(original, pass);
  const payable = Math.max(0, original - discount);
  return {
    valid: true,
    code_string: pass.code,
    original_amount_ghs: original,
    discount_amount_ghs: discount,
    payable_amount_ghs: payable,
    message: 'Promo code applied.',
  };
};

export const listAccessPasses = async (roomId: string, actorId: string) => {
  const room = await VIPRoom.findOne({ _id: roomId, isDeleted: false });
  if (!room) throw new ApiError(404, 'VIP room not found.');
  if (String(room.creator) !== actorId) throw new ApiError(403, 'You do not have permission to perform this action.');
  const passes = await RoomAccessPass.find({ room: roomId, isDeleted: false }).sort({ createdAt: -1 });
  return {
    access_passes: passes.map((p) => ({
      id: String(p._id),
      room_id: String(p.room),
      label: p.label,
      code: p.code,
      discount_type: p.discountType,
      discount_amount_ghs: p.discountAmountGhs ?? null,
      max_uses: p.maxUses,
      used_count: p.usedCount,
      expires_at: p.expiresAt ? p.expiresAt.toISOString() : null,
      campus: p.campus || null,
      is_active: p.isActive,
      created_at: p.createdAt.toISOString(),
    })),
  };
};

export const createAccessPass = async (actorId: string, body: any) => {
  const roomId = String(body.room_id);
  const room = await VIPRoom.findOne({ _id: roomId, isDeleted: false });
  if (!room) throw new ApiError(404, 'VIP room not found.');
  if (String(room.creator) !== actorId) throw new ApiError(403, 'You do not have permission to perform this action.');
  validateAccessPassRules(body);
  const activeCount = await RoomAccessPass.countDocuments({ room: roomId, isDeleted: false, isActive: true });
  if (activeCount >= 5 && (body.is_active ?? true)) throw new ApiError(400, 'Maximum active access passes is 5.');
  const pass = await RoomAccessPass.create({
    room: roomId,
    label: body.label,
    code: String(body.code).toUpperCase(),
    discountType: body.discount_type,
    discountAmountGhs: body.discount_type === 'free' ? null : body.discount_amount_ghs,
    maxUses: Number(body.max_uses),
    usedCount: 0,
    expiresAt: body.expires_at,
    campus: body.campus,
    isActive: body.is_active ?? true,
  });
  return { access_pass: {
    id: String(pass._id), room_id: String(pass.room), label: pass.label, code: pass.code, discount_type: pass.discountType,
    discount_amount_ghs: pass.discountAmountGhs ?? null, max_uses: pass.maxUses, used_count: pass.usedCount,
    expires_at: pass.expiresAt ? pass.expiresAt.toISOString() : null, campus: pass.campus || null, is_active: pass.isActive,
    created_at: pass.createdAt.toISOString(), updated_at: pass.updatedAt.toISOString(),
  } };
};

export const updateAccessPass = async (actorId: string, passId: string, body: any) => {
  const pass = await RoomAccessPass.findOne({ _id: passId, isDeleted: false });
  if (!pass) throw new ApiError(404, 'Access pass not found.');
  const room = await VIPRoom.findById(pass.room);
  if (!room || String(room.creator) !== actorId) throw new ApiError(403, 'You do not have permission to perform this action.');
  const next = {
    discount_type: body.discount_type ?? pass.discountType,
    discount_amount_ghs: body.discount_amount_ghs ?? pass.discountAmountGhs,
  };
  validateAccessPassRules(next);
  if (body.code) pass.code = String(body.code).toUpperCase();
  if (body.label !== undefined) pass.label = body.label;
  if (body.discount_type !== undefined) pass.discountType = body.discount_type;
  if (body.discount_amount_ghs !== undefined || body.discount_type === 'free') pass.discountAmountGhs = next.discount_type === 'free' ? null : next.discount_amount_ghs;
  if (body.max_uses !== undefined) pass.maxUses = Number(body.max_uses);
  if (body.expires_at !== undefined) pass.expiresAt = body.expires_at;
  if (body.campus !== undefined) pass.campus = body.campus;
  if (body.is_active !== undefined) pass.isActive = body.is_active;
  await pass.save();
  return { access_pass: {
    id: String(pass._id), room_id: String(pass.room), label: pass.label, code: pass.code, discount_type: pass.discountType,
    discount_amount_ghs: pass.discountAmountGhs ?? null, max_uses: pass.maxUses, used_count: pass.usedCount,
    expires_at: pass.expiresAt ? pass.expiresAt.toISOString() : null, campus: pass.campus || null, is_active: pass.isActive,
    created_at: pass.createdAt.toISOString(), updated_at: pass.updatedAt.toISOString(),
  } };
};

export const deleteAccessPass = async (actorId: string, passId: string) => {
  const pass = await RoomAccessPass.findOne({ _id: passId, isDeleted: false });
  if (!pass) throw new ApiError(404, 'Access pass not found.');
  const room = await VIPRoom.findById(pass.room);
  if (!room || String(room.creator) !== actorId) throw new ApiError(403, 'You do not have permission to perform this action.');
  pass.isDeleted = true;
  pass.isActive = false;
  await pass.save();
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
  const room = await VIPRoom.findOne({ _id: roomId, isDeleted: false });
  if (!room) throw new ApiError(404, 'VIP room not found.');
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
