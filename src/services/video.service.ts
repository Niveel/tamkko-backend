import { Video, IVideo } from '@models/Video';
import { ApiError } from '@utils/apiError';
import crypto from 'crypto';
import { env } from '@config/env';
import { createDirectUploadUrl } from '@services/mux.service';
import { User } from '@models/User';
import { getAssetTechnicalDetails } from '@services/mux.service';
import { VideoComment } from '@models/VideoComment';
import { VideoCommentLike } from '@models/VideoCommentLike';

export class VideoService {
  private allowedVideoCodecs = new Set(
    (env.MUX_ALLOWED_VIDEO_CODECS || 'h264')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );

  private allowedVideoProfiles = new Set(
    (env.MUX_ALLOWED_VIDEO_PROFILES || 'baseline,main,high')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );

  private publishError(statusCode: number, code: string, message: string): never {
    throw new ApiError(statusCode, message, true, { code: [code] });
  }

  async publishPost(
    actorId: string,
    payload: {
      media_type: 'video' | 'image';
      upload_id?: string;
      caption?: string;
      visibility: 'public' | 'paid' | 'followers_only' | 'private';
      allow_comments: boolean;
      price_ghs?: number | null;
      image_url?: string;
      image_public_id?: string;
      width?: number;
      height?: number;
      format?: string;
      bytes?: number;
    }
  ) {
    const creator = await User.findOne({ _id: actorId, isDeleted: false }).select('subscriptionPriceGhs');
    if (!creator) this.publishError(404, 'CREATOR_NOT_FOUND', 'Creator account not found.');

    const creatorSubscriptionPrice = Number(creator.subscriptionPriceGhs ?? 0);

    if (payload.visibility === 'paid') {
      if (!Number.isFinite(creatorSubscriptionPrice) || creatorSubscriptionPrice <= 0) {
        this.publishError(
          400,
          'SUBSCRIPTION_PRICE_NOT_SET',
          'Set Subscription Pricing first in Profile Workspace > Subscription Pricing before publishing paid posts.'
        );
      }

      if (
        payload.price_ghs != null &&
        Math.abs(Number(payload.price_ghs) - creatorSubscriptionPrice) > 0.0001
      ) {
        this.publishError(
          400,
          'INVALID_PAID_PRICING',
          `price_ghs does not match your saved Subscription Pricing (${creatorSubscriptionPrice} GHS).`
        );
      }
    } else if (payload.price_ghs != null) {
      this.publishError(400, 'INVALID_PAID_PRICING', 'price_ghs must be null or omitted for non-paid posts.');
    }

    if (payload.media_type === 'video') {
      if (!payload.upload_id) this.publishError(400, 'UPLOAD_NOT_FOUND', 'upload_id is required for video publish.');

      const video = await Video.findOne({ muxUploadId: payload.upload_id, creator: actorId, isDeleted: false });
      if (!video) this.publishError(404, 'UPLOAD_NOT_FOUND', 'Upload not found for this creator.');
      if (video.status === 'failed') {
        if (video.processingErrorCode === 'UNSUPPORTED_VIDEO_CODEC') {
          this.publishError(409, 'UNSUPPORTED_VIDEO_CODEC', video.processingErrorMessage || 'Unsupported video codec. Re-export with H.264 and re-upload.');
        }
        if (video.processingErrorCode === 'UNSUPPORTED_VIDEO_PROFILE') {
          this.publishError(409, 'UNSUPPORTED_VIDEO_PROFILE', video.processingErrorMessage || 'Unsupported video profile. Re-export with baseline/main/high profile and re-upload.');
        }
        this.publishError(409, 'MEDIA_PROCESSING_FAILED', 'Video processing failed.');
      }
      if (video.status !== 'ready') this.publishError(409, 'UPLOAD_NOT_READY', 'Media is still processing. Try again shortly.');
      if (Number(video.duration || 0) > 60) this.publishError(400, 'VIDEO_DURATION_EXCEEDED', 'Video duration exceeds 60 seconds.');

      const visibility = payload.visibility;
      const priceGhs = visibility === 'paid' ? creatorSubscriptionPrice : null;
      video.mediaType = 'video';
      video.mediaProvider = 'mux';
      video.description = payload.caption || '';
      video.visibility = visibility;
      video.allowComments = payload.allow_comments;
      video.priceGhs = priceGhs;
      video.isPublic = visibility === 'public';
      video.isPublished = true;
      video.publishedAt = new Date();
      await video.save();

      return {
        post: {
          id: String(video._id),
          creator_id: String(video.creator),
          media_type: 'video',
          caption: video.description || '',
          visibility: video.visibility,
          allow_comments: Boolean(video.allowComments),
          price_ghs: video.priceGhs ?? null,
          created_at: video.createdAt.toISOString(),
          media: {
            provider: 'mux',
            thumbnail_url: video.thumbnailUrl || null,
            duration_seconds: Number(video.duration || 0),
            aspect_ratio: video.aspectRatio || null,
            playback_id: video.muxPlaybackId || null,
            hls_url: video.videoUrl || null,
          },
        },
      };
    }

    if (!payload.image_url || !payload.image_public_id || !payload.width || !payload.height || !payload.format || payload.bytes == null) {
      this.publishError(400, 'INVALID_IMAGE_PAYLOAD', 'image_url, image_public_id, width, height, format and bytes are required for image publish.');
    }

    const created = await Video.create({
      creator: actorId,
      title: 'Image post',
      description: payload.caption || '',
      videoUrl: payload.image_url,
      thumbnailUrl: payload.image_url,
      tags: [],
      category: 'general',
      mediaType: 'image',
      mediaProvider: 'cloudinary',
      imagePublicId: payload.image_public_id,
      imageWidth: payload.width,
      imageHeight: payload.height,
      imageFormat: payload.format,
      imageBytes: payload.bytes,
      visibility: payload.visibility,
      allowComments: payload.allow_comments,
      priceGhs: payload.visibility === 'paid' ? creatorSubscriptionPrice : null,
      isPublic: payload.visibility === 'public',
      isPublished: true,
      publishedAt: new Date(),
      status: 'ready',
      duration: 0,
    });

    return {
      post: {
        id: String(created._id),
        creator_id: String(created.creator),
        media_type: 'image',
        caption: created.description || '',
        visibility: created.visibility,
        allow_comments: Boolean(created.allowComments),
        price_ghs: created.priceGhs ?? null,
        created_at: created.createdAt.toISOString(),
        media: {
          provider: 'cloudinary',
          url: created.videoUrl,
          public_id: created.imagePublicId,
          width: created.imageWidth,
          height: created.imageHeight,
          format: created.imageFormat,
          bytes: created.imageBytes,
        },
      },
    };
  }

  async createUploadUrlDraft(input: {
    creatorId: string;
    media_type?: 'video';
    mime_type: string;
    file_name: string;
    file_size_bytes: number;
    duration_seconds: number;
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
  }) {
    const allowedMimeTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska']);
    if (!allowedMimeTypes.has(input.mime_type)) {
      this.publishError(400, 'INVALID_MEDIA_TYPE', `Unsupported video mime_type: ${input.mime_type}`);
    }
    if (input.duration_seconds > env.MUX_MAX_DURATION_SECONDS) {
      this.publishError(400, 'VIDEO_DURATION_EXCEEDED', `Video duration exceeds ${env.MUX_MAX_DURATION_SECONDS} seconds.`);
    }
    if (input.file_size_bytes > env.MUX_MAX_UPLOAD_SIZE_BYTES) {
      this.publishError(400, 'MAX_UPLOAD_SIZE_EXCEEDED', `File size exceeds ${env.MUX_MAX_UPLOAD_SIZE_BYTES} bytes.`);
    }

    const draft = await Video.create({
      creator: input.creatorId,
      title: input.title || 'Untitled video',
      description: input.description || '',
      videoUrl: `pending://${Date.now().toString(36)}`,
      thumbnailUrl: '',
      tags: input.tags || [],
      category: input.category || 'general',
      status: 'processing',
    });

    const upload = await createDirectUploadUrl({ passthrough: String(draft._id) });

    draft.muxUploadId = upload.uploadId;
    await draft.save();

    return {
      post_id: String(draft._id),
      upload_id: upload.uploadId,
      upload_url: upload.uploadUrl,
      upload_protocol: upload.uploadProtocol,
      max_duration_seconds: upload.maxDurationSeconds,
      max_file_size_bytes: upload.maxFileSizeBytes,
      provider: 'mux',
      playback_policy: upload.playbackPolicy,
      status: draft.status,
    };
  }

  verifyMuxWebhookSignature(signatureHeader: string | undefined, rawBody: string): boolean {
    if (!env.MUX_WEBHOOK_SECRET) return true;
    if (!signatureHeader) return false;

    const parts = signatureHeader.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) return false;

    const payload = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac('sha256', env.MUX_WEBHOOK_SECRET).update(payload).digest('hex');

    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  }

  async handleMuxWebhook(event: any) {
    const eventType = String(event?.type || '');
    const data = event?.data || event?.object || {};
    const uploadId = data?.upload_id || data?.upload?.id;

    if (eventType === 'video.upload.asset_created') {
      const createdAssetId = data?.id || data?.asset_id;
      if (!uploadId || !createdAssetId) {
        return { processed: false, reason: 'missing_upload_or_asset_id', event_type: eventType };
      }

      const uploadMapped = await Video.findOneAndUpdate(
        { muxUploadId: uploadId, isDeleted: false },
        { $set: { muxAssetId: createdAssetId, status: 'processing' } },
        { new: true }
      );

      if (!uploadMapped) {
        return { processed: false, reason: 'video_not_found', upload_id: uploadId, event_type: eventType };
      }

      return { processed: true, event_type: eventType, video_id: String(uploadMapped._id), asset_id: createdAssetId };
    }

    const assetId = data?.id || data?.asset_id || data?.object?.id;
    if (!assetId) return { processed: false, reason: 'missing_asset_id', event_type: eventType };

    const update: Record<string, unknown> = {};

    if (eventType === 'video.asset.ready') {
      const playbackId = data?.playback_ids?.[0]?.id;
      let codec: string | null = null;
      let profile: string | null = null;
      let width = Number(data?.tracks?.[0]?.max_width || 0);
      let height = Number(data?.tracks?.[0]?.max_height || 0);

      try {
        const tech = await getAssetTechnicalDetails(assetId);
        codec = tech.codec;
        profile = tech.profile;
        width = width || tech.width || 0;
        height = height || tech.height || 0;
      } catch {
        // Keep webhook resilient; if inspection fails we still rely on ready status.
      }

      update.status = 'ready';
      update.muxAssetId = assetId;
      update.processingErrorCode = null;
      update.processingErrorMessage = null;
      if (typeof data?.duration === 'number') update.duration = data.duration;
      if (width > 0 && height > 0) update.aspectRatio = `${width}:${height}`;
      if (codec) update.videoCodec = codec;
      if (profile) update.videoProfile = profile;

      if (codec && !this.allowedVideoCodecs.has(codec)) {
        update.status = 'failed';
        update.processingErrorCode = 'UNSUPPORTED_VIDEO_CODEC';
        update.processingErrorMessage = `Unsupported video codec (${codec}). Re-export with H.264 and re-upload.`;
      } else if (profile && !this.allowedVideoProfiles.has(profile)) {
        update.status = 'failed';
        update.processingErrorCode = 'UNSUPPORTED_VIDEO_PROFILE';
        update.processingErrorMessage = `Unsupported video profile (${profile}). Re-export with baseline/main/high and re-upload.`;
      }

      if (playbackId) {
        update.muxPlaybackId = playbackId;
        update.videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
        update.thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;
      }
    } else if (eventType === 'video.asset.errored' || eventType === 'video.asset.deleted') {
      update.status = 'failed';
      update.muxAssetId = assetId;
      update.processingErrorCode = data?.errors?.[0]?.type || (eventType === 'video.asset.deleted' ? 'ASSET_DELETED' : 'TRANSCODE_FAILED');
      update.processingErrorMessage = data?.errors?.[0]?.messages?.[0] || data?.errors?.[0]?.message || 'Video transcoding failed.';
    } else {
      return { processed: true, skipped: true, event_type: eventType };
    }

    const video = await Video.findOneAndUpdate(
      { $or: [{ muxAssetId: assetId }, { cloudflareId: assetId }], isDeleted: false },
      { $set: update },
      { new: true }
    );

    if (!video) {
      return { processed: false, reason: 'video_not_found', asset_id: assetId, event_type: eventType };
    }

    return { processed: true, event_type: eventType, video_id: String(video._id), asset_id: assetId };
  }

  async initializeUpload(input: {
    creatorId: string;
    title: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    tags?: string[];
    category?: string;
  }): Promise<IVideo> {
    return Video.create({
      creator: input.creatorId,
      title: input.title,
      description: input.description || '',
      videoUrl: input.videoUrl || `pending://${Date.now().toString(36)}`,
      thumbnailUrl: input.thumbnailUrl || '',
      tags: input.tags || [],
      category: input.category || 'general',
      status: 'processing',
    });
  }

  async getUploadStatus(videoId: string) {
    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, 'Video not found');
    return { video_id: video._id, status: video.status, ready_to_stream: video.status === 'ready' };
  }

  async getUploadStatusByVideoId(videoId: string, actorId: string, actorRole: string) {
    const video = await Video.findById(videoId);
    if (!video || video.isDeleted) throw new ApiError(404, 'Video not found');

    const isOwner = String(video.creator) === actorId;
    const isPrivileged = actorRole === 'admin';
    if (!isOwner && !isPrivileged) throw new ApiError(403, 'You do not have permission to access this upload status.');

    return {
      post_id: String(video._id),
      upload_id: video.muxUploadId || null,
      asset_id: video.muxAssetId || null,
      playback_id: video.muxPlaybackId || null,
      playback_url: video.videoUrl || null,
      thumbnail_url: video.thumbnailUrl || null,
      duration: Number(video.duration || 0),
      aspect_ratio: video.aspectRatio || null,
      video_codec: video.videoCodec || null,
      video_profile: video.videoProfile || null,
      error_code: video.processingErrorCode || null,
      error_message: video.processingErrorMessage || null,
      status: video.status,
      ready_to_stream: video.status === 'ready',
    };
  }

  async getFeed(limit = 20, cursor?: string) {
    const query: Record<string, unknown> = { isPublic: true, isDeleted: false };
    if (cursor) query._id = { $lt: cursor };
    const videos = await Video.find(query).sort({ _id: -1 }).limit(Math.min(limit, 50)).populate('creator', 'username profile');
    return {
      videos,
      next_cursor: videos.length ? videos[videos.length - 1]._id.toString() : null,
      has_more: videos.length === limit,
    };
  }

  async listMyVideos(userId: string, query: { cursor?: string; limit?: number; filter?: 'all' | 'free' | 'paid' }) {
    const limit = Math.min(Number(query.limit || 20), 50);
    const filter: Record<string, unknown> = { creator: userId, isDeleted: false, isPublished: true };
    if (query.cursor) filter._id = { $lt: query.cursor };
    if (query.filter === 'paid') filter.visibility = 'paid';
    if (query.filter === 'free') filter.visibility = { $ne: 'paid' };

    const rows = await Video.find(filter).sort({ _id: -1 }).limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((v) => ({
        id: String(v._id),
        title: v.title || '',
        caption: v.description || '',
        media_type: v.mediaType || 'video',
        visibility: v.visibility || 'public',
        is_paid: v.visibility === 'paid',
        price_ghs: v.priceGhs ?? null,
        allow_comments: Boolean(v.allowComments),
        created_at: v.createdAt.toISOString(),
        thumbnail_url: v.thumbnailUrl || null,
        duration_seconds: (v.mediaType || 'video') === 'video' ? Number(v.duration || 0) : null,
        views_count: Number(v.views || 0),
        shares_count: Number((v as any).shares || 0),
        likes_count: Number(v.likes || 0),
        comments_count: Number((v as any).commentsCount || 0),
      })),
      next_cursor: hasMore ? String(page[page.length - 1]._id) : null,
      has_more: hasMore,
    };
  }

  async getMyVideoDetails(userId: string, videoId: string) {
    const post = await Video.findOne({ _id: videoId, creator: userId, isDeleted: false });
    if (!post) this.publishError(404, 'POST_NOT_FOUND', 'Post not found.');

    return {
      post: {
        id: String(post._id),
        title: post.title || '',
        caption: post.description || '',
        media_type: post.mediaType || 'video',
        visibility: post.visibility || 'public',
        allow_comments: Boolean(post.allowComments),
        is_paid: post.visibility === 'paid',
        price_ghs: post.priceGhs ?? null,
        created_at: post.createdAt.toISOString(),
        media: (post.mediaType || 'video') === 'video'
          ? {
              provider: 'mux',
              playback_id: post.muxPlaybackId || null,
              hls_url: post.videoUrl || null,
              thumbnail_url: post.thumbnailUrl || null,
              duration_seconds: Number(post.duration || 0),
            }
          : {
              provider: 'cloudinary',
              url: post.videoUrl || null,
              public_id: post.imagePublicId || null,
              width: post.imageWidth || null,
              height: post.imageHeight || null,
              format: post.imageFormat || null,
              bytes: post.imageBytes || null,
            },
      },
    };
  }

  async updateMyVideo(
    userId: string,
    videoId: string,
    payload: { title?: string; caption?: string; visibility?: 'public' | 'paid' | 'followers_only' | 'private'; allow_comments?: boolean }
  ) {
    const post = await Video.findOne({ _id: videoId, creator: userId, isDeleted: false });
    if (!post) this.publishError(404, 'POST_NOT_FOUND', 'Post not found.');

    if (payload.visibility === 'paid') {
      const creator = await User.findOne({ _id: userId, isDeleted: false }).select('subscriptionPriceGhs');
      const price = Number(creator?.subscriptionPriceGhs ?? 0);
      if (!Number.isFinite(price) || price <= 0) {
        this.publishError(
          400,
          'SUBSCRIPTION_PRICE_NOT_SET',
          'Set Subscription Pricing first in Profile Workspace > Subscription Pricing before setting post to paid.'
        );
      }
      post.priceGhs = price;
    } else if (payload.visibility) {
      post.priceGhs = null;
    }

    if (payload.title !== undefined) post.title = payload.title;
    if (payload.caption !== undefined) post.description = payload.caption;
    if (payload.visibility !== undefined) {
      post.visibility = payload.visibility;
      post.isPublic = payload.visibility === 'public';
    }
    if (payload.allow_comments !== undefined) post.allowComments = payload.allow_comments;

    await post.save();

    return {
      post: {
        id: String(post._id),
        title: post.title || '',
        caption: post.description || '',
        visibility: post.visibility || 'public',
        allow_comments: Boolean(post.allowComments),
        is_paid: post.visibility === 'paid',
        price_ghs: post.priceGhs ?? null,
      },
    };
  }

  async getVideo(videoId: string) {
    const video = await Video.findOne({ _id: videoId, isDeleted: false }).populate('creator', 'username profile');
    if (!video) throw new ApiError(404, 'Video not found');
    return video;
  }

  async incrementView(videoId: string) {
    const video = await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } }, { new: true });
    if (!video) throw new ApiError(404, 'Video not found');
    return { video_id: video._id, views: video.views };
  }

  async getUserVideos(userId: string, limit = 20, cursor?: string) {
    const query: Record<string, unknown> = { creator: userId, isDeleted: false };
    if (cursor) query._id = { $lt: cursor };
    const videos = await Video.find(query).sort({ _id: -1 }).limit(Math.min(limit, 50));
    return {
      videos,
      next_cursor: videos.length ? videos[videos.length - 1]._id.toString() : null,
      has_more: videos.length === limit,
    };
  }

  async reportVideo(videoId: string, reporterId: string, reason: string, description?: string) {
    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, 'Video not found');
    return {
      video_id: video._id,
      reporter_id: reporterId,
      reason,
      description,
      status: 'received',
    };
  }

  async deleteVideo(videoId: string, userId: string) {
    const video = await Video.findOneAndUpdate(
      { _id: videoId, creator: userId },
      { isDeleted: true },
      { new: true }
    );
    if (!video) throw new ApiError(404, 'Video not found or permission denied');
  }

  private mapCommentItem(comment: any, likedByMe: boolean, parentDeleted: boolean) {
    return {
      id: String(comment._id),
      post_id: String(comment.video),
      author: {
        id: String(comment.author?._id || ''),
        username: comment.author?.username || '',
        display_name: comment.author?.profile?.displayName || comment.author?.username || '',
        avatar_url: comment.author?.profile?.avatarUrl || null,
      },
      body: comment.isDeleted ? '' : comment.body,
      parent_comment_id: comment.parentComment ? String(comment.parentComment) : null,
      root_comment_id: comment.rootComment ? String(comment.rootComment) : null,
      is_deleted: Boolean(comment.isDeleted),
      deleted_by: comment.deletedBy || null,
      parent_deleted: parentDeleted,
      liked_by_me: likedByMe,
      likes_count: Number(comment.likesCount || 0),
      replies_count: Number(comment.repliesCount || 0),
      created_at: comment.createdAt.toISOString(),
      updated_at: comment.updatedAt.toISOString(),
    };
  }

  async listComments(
    actorId: string,
    videoId: string,
    query: { cursor?: string; limit?: number; sort?: 'oldest' | 'newest' }
  ) {
    const post = await Video.findOne({ _id: videoId, isDeleted: false });
    if (!post) this.publishError(404, 'POST_NOT_FOUND', 'Post not found.');

    const sortMode = query.sort || 'oldest';
    const limit = Math.min(Number(query.limit || 30), 100);
    const filter: Record<string, any> = { video: videoId };
    if (query.cursor) {
      filter._id = sortMode === 'oldest' ? { $gt: query.cursor } : { $lt: query.cursor };
    }

    const sort = sortMode === 'oldest' ? { _id: 1 } : { _id: -1 };
    const rows = await VideoComment.find(filter)
      .sort(sort as any)
      .limit(limit + 1)
      .populate('author', 'username profile.displayName profile.avatarUrl')
      .lean();

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const commentIds = page.map((c) => c._id);
    const likedRows = await VideoCommentLike.find({ user: actorId, comment: { $in: commentIds } }).select('comment').lean();
    const likedSet = new Set(likedRows.map((r) => String(r.comment)));

    const parentIds = page.filter((c) => c.parentComment).map((c) => c.parentComment as any);
    const parentRows = parentIds.length
      ? await VideoComment.find({ _id: { $in: parentIds } }).select('_id isDeleted').lean()
      : [];
    const parentDeletedSet = new Set(parentRows.filter((p) => p.isDeleted).map((p) => String(p._id)));

    return {
      items: page.map((c) => this.mapCommentItem(c, likedSet.has(String(c._id)), c.parentComment ? parentDeletedSet.has(String(c.parentComment)) : false)),
      next_cursor: hasMore ? String(page[page.length - 1]._id) : null,
      has_more: hasMore,
    };
  }

  async createComment(actorId: string, videoId: string, body: { body: string; parent_comment_id?: string }) {
    const post = await Video.findOne({ _id: videoId, isDeleted: false });
    if (!post) this.publishError(404, 'POST_NOT_FOUND', 'Post not found.');
    if (!post.allowComments) this.publishError(403, 'COMMENTS_DISABLED', 'Comments are disabled for this post.');

    let parent: any = null;
    let rootComment: any = null;
    if (body.parent_comment_id) {
      parent = await VideoComment.findOne({ _id: body.parent_comment_id, video: videoId });
      if (!parent) this.publishError(404, 'PARENT_COMMENT_NOT_FOUND', 'Parent comment not found.');
      rootComment = parent.rootComment || parent._id;
    }

    const created = await VideoComment.create({
      video: videoId,
      author: actorId,
      body: body.body,
      parentComment: parent?._id || null,
      rootComment: rootComment || null,
      isDeleted: false,
    });

    if (parent) {
      await VideoComment.updateOne({ _id: parent._id }, { $inc: { repliesCount: 1 } });
    }

    const hydrated = await VideoComment.findById(created._id).populate('author', 'username profile.displayName profile.avatarUrl');
    const parentDeleted = Boolean(parent?.isDeleted);
    return this.mapCommentItem(hydrated, false, parentDeleted);
  }

  async toggleCommentLike(actorId: string, commentId: string) {
    const comment = await VideoComment.findById(commentId);
    if (!comment) this.publishError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');

    const existing = await VideoCommentLike.findOne({ comment: commentId, user: actorId });
    if (existing) {
      await VideoCommentLike.deleteOne({ _id: existing._id });
      await VideoComment.updateOne({ _id: commentId, likesCount: { $gt: 0 } }, { $inc: { likesCount: -1 } });
      const refreshed = await VideoComment.findById(commentId).select('likesCount');
      return { comment_id: commentId, liked_by_me: false, likes_count: Number(refreshed?.likesCount || 0) };
    }

    await VideoCommentLike.create({ comment: commentId, user: actorId });
    await VideoComment.updateOne({ _id: commentId }, { $inc: { likesCount: 1 } });
    const refreshed = await VideoComment.findById(commentId).select('likesCount');
    return { comment_id: commentId, liked_by_me: true, likes_count: Number(refreshed?.likesCount || 0) };
  }

  async deleteComment(actorId: string, actorRole: string, commentId: string) {
    const comment = await VideoComment.findById(commentId);
    if (!comment) this.publishError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');

    const post = await Video.findById(comment.video).select('creator');
    if (!post) this.publishError(404, 'POST_NOT_FOUND', 'Post not found.');

    const isAuthor = String(comment.author) === actorId;
    const isPostCreator = String(post.creator) === actorId;
    const isAdmin = actorRole === 'admin';

    if (!isAuthor && !isPostCreator && !isAdmin) {
      this.publishError(403, 'PERMISSION_DENIED', 'You can only delete your own comment.');
    }

    const deletedBy = isAdmin ? 'admin' : isPostCreator && !isAuthor ? 'post_creator' : 'author';
    comment.isDeleted = true;
    comment.deletedBy = deletedBy as any;
    comment.body = '[deleted]';
    await comment.save();

    return { comment_id: commentId, is_deleted: true, deleted_by: deletedBy };
  }
}

export const videoService = new VideoService();
