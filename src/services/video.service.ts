import { Video, IVideo } from '@models/Video';
import { ApiError } from '@utils/apiError';

export class VideoService {
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
}

export const videoService = new VideoService();
