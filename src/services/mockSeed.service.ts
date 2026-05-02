import { User } from '@/models/User';
import { VIPRoom } from '@/models/vipRoom.model';
import { VIPMembership } from '@/models/VIPMembership';

type SeedUser = {
  username: string;
  email: string;
  phone: string;
  displayName: string;
  legacyUsername?: string;
};

const seedUsers: SeedUser[] = [
  { username: 'ama_boateng', legacyUsername: 'mock_ama', email: 'ama.boateng@tamkko.dev', phone: '+233200100001', displayName: 'Ama Boateng' },
  { username: 'kwame_mensah', legacyUsername: 'mock_kwame', email: 'kwame.mensah@tamkko.dev', phone: '+233200100002', displayName: 'Kwame Mensah' },
  { username: 'esi_darko', legacyUsername: 'mock_esi', email: 'esi.darko@tamkko.dev', phone: '+233200100003', displayName: 'Esi Darko' },
  { username: 'kofi_ansah', legacyUsername: 'mock_kofi', email: 'kofi.ansah@tamkko.dev', phone: '+233200100004', displayName: 'Kofi Ansah' },
  { username: 'abena_sarpong', legacyUsername: 'mock_abena', email: 'abena.sarpong@tamkko.dev', phone: '+233200100005', displayName: 'Abena Sarpong' },
  { username: 'yaw_asiedu', legacyUsername: 'mock_yaw', email: 'yaw.asiedu@tamkko.dev', phone: '+233200100006', displayName: 'Yaw Asiedu' },
  { username: 'adwoa_nyarko', email: 'adwoa.nyarko@tamkko.dev', phone: '+233200100007', displayName: 'Adwoa Nyarko' },
  { username: 'nana_owusu', email: 'nana.owusu@tamkko.dev', phone: '+233200100008', displayName: 'Nana Owusu' },
];

const roomTopics = [
  { name: 'Campus Vibes', description: 'Daily campus banter, trends, and creator Q&A.' },
  { name: 'Creator Playbook', description: 'Growth tactics, monetization notes, and weekly breakdowns.' },
  { name: 'Music Feedback', description: 'Share snippets, get direct feedback, and improve your sound.' },
  { name: 'Street Style', description: 'Fashion breakdowns, outfit ratings, and trend scouting.' },
  { name: 'Late Night Hangout', description: 'Relaxed chat for stories, memes, and random hot takes.' },
  { name: 'Tech & Startups', description: 'Founder lessons, product ideas, and practical execution tips.' },
  { name: 'Sports Corner', description: 'Match reactions, transfers, and weekend banter.' },
  { name: 'Movie Lounge', description: 'Watchlist picks, reviews, and spoiler-safe discussions.' },
];

const endDateFromNow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
};

const hashOf = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash << 5) - hash + value.charCodeAt(i);
  return Math.abs(hash);
};

const pickRoomConfig = (username: string, index: number) => {
  const base = hashOf(`${username}:${index}`);
  const topic = roomTopics[base % roomTopics.length];
  const isPaid = base % 2 === 0;
  const fee = isPaid ? [5, 10, 15, 20, 25][base % 5] : 0;
  const tier = (['gold', 'platinum', 'diamond'] as const)[base % 3];
  return {
    name: `${topic.name} with ${username.split('_')[0]}`,
    description: topic.description,
    monthlyFee: fee,
    tier,
    capacity: fee > 0 ? 1000 : 500,
  };
};

const ensureSeedUsers = async () => {
  const byUsername = new Map<string, any>();

  for (const seed of seedUsers) {
    let user = await User.findOne({ username: seed.username, isDeleted: false });

    if (!user && seed.legacyUsername) {
      const legacy = await User.findOne({ username: seed.legacyUsername, isDeleted: false });
      if (legacy) {
        legacy.username = seed.username;
        legacy.email = seed.email;
        legacy.phone = seed.phone;
        legacy.profile.displayName = seed.displayName;
        legacy.profile.bio = legacy.profile.bio || 'Discovery seed user';
        legacy.password = 'Password123!';
        legacy.markModified('password');
        await legacy.save();
        user = legacy;
      }
    }

    if (!user) {
      user = await User.create({
        username: seed.username,
        email: seed.email,
        phone: seed.phone,
        password: 'Password123!',
        role: 'user',
        profile: {
          displayName: seed.displayName,
          bio: 'Discovery seed user',
          avatarUrl: '',
          coverUrl: '',
          isVerified: false,
        },
        referral: {
          code: `${seed.username.replace(/[^a-z0-9]/gi, '').toUpperCase()}REF`,
          referralCount: 0,
          referralEarnings: 0,
          isAmbassador: false,
        },
      });
    } else {
      user.profile.displayName = seed.displayName;
      user.profile.bio = user.profile.bio || 'Discovery seed user';
      await user.save();
    }

    byUsername.set(seed.username, user);
  }

  return byUsername;
};

export const seedMockRoomsForDiscovery = async () => {
  await ensureSeedUsers();

  const candidateUsers = await User.find({
    isDeleted: false,
    $or: [
      { email: /@tamkko\.dev$/i },
      { username: /mock|demo|test/i },
    ],
  }).select('_id username profile.displayName');

  if (!candidateUsers.length) return;

  const users = candidateUsers.sort((a, b) => a.username.localeCompare(b.username));

  for (let i = 0; i < users.length; i += 1) {
    const owner = users[i];
    const targetRoomCount = (hashOf(owner.username) % 2) + 1; // 1 or 2 rooms each

    const existingCount = await VIPRoom.countDocuments({
      creator: owner._id,
      isDeleted: false,
      isActive: true,
      isPublic: true,
    });

    const missing = Math.max(0, targetRoomCount - existingCount);
    if (!missing) continue;

    for (let roomIndex = 0; roomIndex < missing; roomIndex += 1) {
      const cfg = pickRoomConfig(owner.username, roomIndex);
      const room = await VIPRoom.findOneAndUpdate(
        { creator: owner._id, name: cfg.name, isDeleted: false },
        {
          $setOnInsert: {
            creator: owner._id,
            name: cfg.name,
            description: cfg.description,
            monthlyFee: cfg.monthlyFee,
            tier: cfg.tier,
            capacity: cfg.capacity,
            memberCount: 0,
            isPublic: true,
            allowTips: true,
            welcomeMessage: 'Welcome to the room. Keep it respectful.',
            status: 'active',
            isActive: true,
          },
        },
        { upsert: true, new: true }
      );

      const otherUsers = users.filter((u) => String(u._id) !== String(owner._id));
      const memberSlots = (hashOf(`${owner.username}:${roomIndex}:members`) % 3) + 1; // 1..3 additional members
      const pickedMemberIds: string[] = [];
      for (let pick = 0; pick < memberSlots && otherUsers.length; pick += 1) {
        const idx = (hashOf(`${owner.username}:${roomIndex}:${pick}`) + pick) % otherUsers.length;
        const memberId = String(otherUsers[idx]._id);
        if (!pickedMemberIds.includes(memberId)) pickedMemberIds.push(memberId);
      }

      const memberIds = [String(owner._id), ...pickedMemberIds];

      for (const memberId of memberIds) {
        await VIPMembership.updateOne(
          { user: memberId, vipRoom: room._id },
          {
            $setOnInsert: {
              user: memberId,
              vipRoom: room._id,
              startDate: new Date(),
              endDate: endDateFromNow(),
              autoRenew: false,
              status: 'active',
              isDeleted: false,
            },
          },
          { upsert: true }
        );
      }

      await VIPRoom.updateOne(
        { _id: room._id },
        {
          $set: {
            memberCount: memberIds.length,
            isPublic: true,
            isActive: true,
            status: 'active',
            isDeleted: false,
          },
        }
      );
    }
  }
};

