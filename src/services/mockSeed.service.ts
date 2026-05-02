import { User } from '@/models/User';
import { VIPRoom } from '@/models/vipRoom.model';
import { VIPMembership } from '@/models/VIPMembership';
import { Video } from '@/models/Video';
import { VideoComment } from '@/models/VideoComment';
import { VideoCommentLike } from '@/models/VideoCommentLike';
import fs from 'fs';
import path from 'path';

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

const postCaptions = [
  'Weekend energy is unmatched.',
  'Late night thoughts and vibes.',
  'Quick update from today.',
  'This one took multiple takes.',
  'Tell me what you think in comments.',
  'Trying something new here.',
  'Another day, another drop.',
  'Keeping it real as always.',
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

  const vidsDir = path.join(process.cwd(), 'vids');
  const vidFiles = fs.existsSync(vidsDir)
    ? fs.readdirSync(vidsDir).filter((f) => /\.(mp4|mov|webm)$/i.test(f))
    : [];

  for (let i = 0; i < users.length; i += 1) {
    const owner = users[i];
    const targetPosts = 8 + (hashOf(`${owner.username}:posts`) % 5); // 8..12 posts each

    const existingPosts = await Video.countDocuments({ creator: owner._id, isDeleted: false, isPublished: true });
    const toCreate = Math.max(0, targetPosts - existingPosts);
    if (!toCreate) continue;

    for (let p = 0; p < toCreate; p += 1) {
      const base = hashOf(`${owner.username}:${p}:post`);
      const isVideo = vidFiles.length > 0 && (p % 3 !== 2);
      const visibility = base % 6 === 0 ? 'paid' : 'public';
      const price = visibility === 'paid' ? Math.max(5, Number(owner.subscriptionPriceGhs || 20)) : null;
      const caption = postCaptions[base % postCaptions.length];

      const videoUrl = isVideo
        ? `/vids/${vidFiles[base % vidFiles.length]}`
        : `https://source.unsplash.com/random/1080x1350?sig=${base}`;

      const created = await Video.create({
        creator: owner._id,
        title: isVideo ? `${owner.username} video drop ${p + 1}` : `${owner.username} photo drop ${p + 1}`,
        description: caption,
        videoUrl,
        thumbnailUrl: isVideo ? `https://source.unsplash.com/random/720x1280?sig=${base + 111}` : videoUrl,
        tags: ['mock', 'seeded', isVideo ? 'video' : 'image'],
        category: 'general',
        mediaType: isVideo ? 'video' : 'image',
        mediaProvider: isVideo ? 'mux' : 'cloudinary',
        imagePublicId: isVideo ? undefined : `seeded/${owner.username}/${base}`,
        imageWidth: isVideo ? undefined : 1080,
        imageHeight: isVideo ? undefined : 1350,
        imageFormat: isVideo ? undefined : 'jpg',
        imageBytes: isVideo ? undefined : 350000 + (base % 250000),
        visibility,
        allowComments: true,
        priceGhs: price,
        isPublic: visibility === 'public',
        isPublished: true,
        publishedAt: new Date(Date.now() - (base % 1000) * 60000),
        status: 'ready',
        duration: isVideo ? 8 + (base % 45) : 0,
        views: 150 + (base % 12000),
        likes: 10 + (base % 2200),
        shares: 2 + (base % 650),
        commentsCount: 0,
      });

      const participants = users.filter((u) => String(u._id) !== String(owner._id));
      const topLevelCount = 4 + (base % 8); // 4..11
      let totalComments = 0;

      for (let c = 0; c < topLevelCount; c += 1) {
        const author = participants[(base + c) % participants.length];
        const top = await VideoComment.create({
          video: created._id,
          author: author._id,
          body: `Top comment ${c + 1} on ${created.title}`,
          parentComment: null,
          rootComment: null,
          isDeleted: false,
          likesCount: (base + c) % 25,
        });
        totalComments += 1;

        const depth2 = await VideoComment.create({
          video: created._id,
          author: participants[(base + c + 1) % participants.length]._id,
          body: `Reply to top comment ${c + 1}`,
          parentComment: top._id,
          rootComment: top._id,
          isDeleted: false,
          likesCount: (base + c + 1) % 12,
        });
        totalComments += 1;

        const depth3 = await VideoComment.create({
          video: created._id,
          author: participants[(base + c + 2) % participants.length]._id,
          body: `Deep reply chain level 3`,
          parentComment: depth2._id,
          rootComment: top._id,
          isDeleted: false,
          likesCount: (base + c + 2) % 9,
        });
        totalComments += 1;

        if ((base + c) % 2 === 0) {
          await VideoComment.create({
            video: created._id,
            author: participants[(base + c + 3) % participants.length]._id,
            body: `Deep reply chain level 4`,
            parentComment: depth3._id,
            rootComment: top._id,
            isDeleted: false,
            likesCount: (base + c + 3) % 7,
          });
          totalComments += 1;
        }

        await VideoComment.updateOne({ _id: top._id }, { $inc: { repliesCount: 2 + (((base + c) % 2 === 0) ? 1 : 0) } });
        await VideoComment.updateOne({ _id: depth2._id }, { $inc: { repliesCount: 1 + (((base + c) % 2 === 0) ? 1 : 0) } });
        if ((base + c) % 2 === 0) {
          await VideoComment.updateOne({ _id: depth3._id }, { $inc: { repliesCount: 1 } });
        }

        const likeCandidates = participants.slice(0, Math.min(4, participants.length));
        for (let l = 0; l < likeCandidates.length; l += 1) {
          if ((base + c + l) % 2 !== 0) continue;
          await VideoCommentLike.updateOne(
            { comment: top._id, user: likeCandidates[l]._id },
            { $setOnInsert: { comment: top._id, user: likeCandidates[l]._id } },
            { upsert: true }
          );
        }
      }

      await Video.updateOne({ _id: created._id }, { $set: { commentsCount: totalComments } });
    }
  }

  // Always inject a few fresh video posts so newest feed remains mixed (not image-only).
  if (vidFiles.length > 0) {
    // Ensure each seeded user has enough video posts for top-of-feed variety.
    for (let u = 0; u < users.length; u += 1) {
      const owner = users[u];
      const existingVideos = await Video.countDocuments({
        creator: owner._id,
        isDeleted: false,
        isPublished: true,
        mediaType: 'video',
      });
      const minVideosPerUser = 4;
      const missing = Math.max(0, minVideosPerUser - existingVideos);
      for (let m = 0; m < missing; m += 1) {
        const base = hashOf(`${owner.username}:video-min:${m}:${Date.now()}`);
        const file = vidFiles[(u + m) % vidFiles.length];
        await Video.create({
          creator: owner._id,
          title: `${owner.username} guaranteed video ${Date.now()}_${m + 1}`,
          description: 'Guaranteed seeded video for feed quality',
          videoUrl: `/vids/${file}`,
          thumbnailUrl: `https://source.unsplash.com/random/720x1280?sig=${base + 999}`,
          tags: ['mock', 'seeded', 'video', 'guaranteed'],
          category: 'general',
          mediaType: 'video',
          mediaProvider: 'mux',
          visibility: 'public',
          allowComments: true,
          priceGhs: null,
          isPublic: true,
          isPublished: true,
          publishedAt: new Date(),
          status: 'ready',
          duration: 12 + (base % 35),
          views: 300 + (base % 6000),
          likes: 15 + (base % 900),
          shares: 4 + (base % 200),
          commentsCount: 0,
        });
      }
    }

    const injectCount = 6;
    for (let e = 0; e < injectCount; e += 1) {
      const owner = users[e % users.length];
      const base = hashOf(`${owner.username}:feed-mix:${e}:${Date.now()}`);
      const file = vidFiles[base % vidFiles.length];

      const created = await Video.create({
        creator: owner._id,
        title: `${owner.username} feed mix video ${Date.now()}_${e + 1}`,
        description: 'Fresh seeded video to keep top feed mixed',
        videoUrl: `/vids/${file}`,
        thumbnailUrl: `https://source.unsplash.com/random/720x1280?sig=${base + 777}`,
        tags: ['mock', 'seeded', 'video', 'feedmix'],
        category: 'general',
        mediaType: 'video',
        mediaProvider: 'mux',
        visibility: 'public',
        allowComments: true,
        priceGhs: null,
        isPublic: true,
        isPublished: true,
        publishedAt: new Date(),
        status: 'ready',
        duration: 10 + (base % 40),
        views: 500 + (base % 9000),
        likes: 30 + (base % 1500),
        shares: 8 + (base % 400),
        commentsCount: 0,
      });

      const participants = users.filter((u) => String(u._id) !== String(owner._id));
      let totalComments = 0;
      for (let c = 0; c < 4; c += 1) {
        const top = await VideoComment.create({
          video: created._id,
          author: participants[(base + c) % participants.length]._id,
          body: `Feed mix top comment ${c + 1}`,
          parentComment: null,
          rootComment: null,
          isDeleted: false,
          likesCount: (base + c) % 12,
        });
        totalComments += 1;
        const reply1 = await VideoComment.create({
          video: created._id,
          author: participants[(base + c + 1) % participants.length]._id,
          body: `Reply level 2`,
          parentComment: top._id,
          rootComment: top._id,
          isDeleted: false,
          likesCount: (base + c + 2) % 8,
        });
        totalComments += 1;
        const reply2 = await VideoComment.create({
          video: created._id,
          author: participants[(base + c + 2) % participants.length]._id,
          body: `Reply level 3`,
          parentComment: reply1._id,
          rootComment: top._id,
          isDeleted: false,
          likesCount: (base + c + 3) % 6,
        });
        totalComments += 1;
        await VideoComment.updateOne({ _id: top._id }, { $inc: { repliesCount: 2 } });
        await VideoComment.updateOne({ _id: reply1._id }, { $inc: { repliesCount: 1 } });
        await VideoCommentLike.updateOne(
          { comment: top._id, user: participants[(base + c + 3) % participants.length]._id },
          { $setOnInsert: { comment: top._id, user: participants[(base + c + 3) % participants.length]._id } },
          { upsert: true }
        );
        await VideoCommentLike.updateOne(
          { comment: reply2._id, user: participants[(base + c + 4) % participants.length]._id },
          { $setOnInsert: { comment: reply2._id, user: participants[(base + c + 4) % participants.length]._id } },
          { upsert: true }
        );
      }
      await Video.updateOne({ _id: created._id }, { $set: { commentsCount: totalComments } });
    }
  }
};
