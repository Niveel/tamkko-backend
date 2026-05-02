import Mux from '@mux/mux-node';
import { env } from '@config/env';
import { ApiError } from '@utils/apiError';

const ensureMuxCredentials = () => {
  if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) {
    throw new ApiError(500, 'MUX_TOKEN_ID and MUX_TOKEN_SECRET are required for Mux uploads.');
  }
};

const muxClient = () => {
  ensureMuxCredentials();
  return new Mux({
    tokenId: env.MUX_TOKEN_ID as string,
    tokenSecret: env.MUX_TOKEN_SECRET as string,
  });
};

export const createDirectUploadUrl = async (options?: { corsOrigin?: string; passthrough?: string }) => {
  const mux = muxClient();
  const playbackPolicy = env.MUX_PLAYBACK_POLICY || 'public';
  const upload = await mux.video.uploads.create({
    cors_origin: options?.corsOrigin || '*',
    new_asset_settings: {
      playback_policy: [playbackPolicy],
      passthrough: options?.passthrough,
    },
  });

  return {
    uploadId: upload.id,
    uploadUrl: upload.url,
    uploadProtocol: 'tus',
    maxDurationSeconds: env.MUX_MAX_DURATION_SECONDS,
    maxFileSizeBytes: env.MUX_MAX_UPLOAD_SIZE_BYTES,
    playbackPolicy,
  };
};

export const getAssetDetails = async (assetId: string) => {
  const mux = muxClient();
  const asset = await mux.video.assets.retrieve(assetId);
  const playbackId = asset.playback_ids?.[0]?.id || null;

  return {
    assetId: asset.id,
    status: asset.status,
    duration: asset.duration || 0,
    playbackId,
    playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
    thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null,
  };
};

export const getAssetTechnicalDetails = async (assetId: string) => {
  const mux = muxClient();
  const asset: any = await mux.video.assets.retrieve(assetId);
  const tracks: any[] = Array.isArray(asset?.tracks) ? asset.tracks : [];
  const videoTrack = tracks.find((t) => t?.type === 'video') || {};

  return {
    codec: (videoTrack.codec || '').toString().toLowerCase() || null,
    profile: (videoTrack.profile || '').toString().toLowerCase() || null,
    width: Number(videoTrack.max_width || videoTrack.width || 0),
    height: Number(videoTrack.max_height || videoTrack.height || 0),
  };
};

export const deleteAsset = async (assetId: string) => {
  const mux = muxClient();
  await mux.video.assets.delete(assetId);
  return true;
};
