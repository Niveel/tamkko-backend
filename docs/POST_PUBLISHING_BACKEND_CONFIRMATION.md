# Post Publishing Backend Confirmation

This document confirms the current backend endpoints and payload/response shapes for post publishing flow.

Environment note:
- `# Mux stream` and `# Cloudinary` keys are configured in `.env.docker` and used by the backend.

## Auth
- Protected endpoints require: `Authorization: Bearer <access_token>`
- Creator-only operations require role: `creator` or `admin`

## A) Video Upload Init (Mux)

### Endpoint
- `POST /api/v1/videos/upload-url`

### Status
- Implemented

### Request Body (current)
```json
{
  "title": "Creator Upload Draft",
  "description": "Optional",
  "tags": ["test", "mux"],
  "category": "general"
}
```

### Response (current)
```json
{
  "status": "success",
  "data": {
    "post_id": "69f5d869767b59d4b3bb9d25",
    "upload_id": "hhsWvgzKaJMNKBUhD01VEXzYr875AtciekaN6egwMcms",
    "upload_url": "https://direct-uploads....mux.com/upload/...",
    "status": "processing"
  }
}
```

### Notes / Differences vs request doc
- Uses Mux direct upload URL.
- Current payload does not require `media_type`, `mime_type`, `file_name`, `file_size_bytes`, `duration_seconds`.
- TUS protocol metadata fields (`upload_protocol`, `expires_at`, `max_duration_seconds`, `max_file_size_bytes`) are not yet returned.

## B) Video Upload Confirm

### Endpoint
- Not yet implemented as a separate confirm API.

### Current behavior
- Backend updates upload state from Mux webhook events:
  - `video.upload.asset_created`
  - `video.asset.ready`
  - `video.asset.errored`
  - `video.asset.deleted`

## C) Video Upload Status

### Endpoints
- `GET /api/v1/videos/:videoId/upload-status` (recommended)
- `GET /api/v1/videos/status/:uploadId` (legacy; expects video id param in current implementation)

### Status
- Implemented

### Response (current: `/api/v1/videos/:videoId/upload-status`)
```json
{
  "status": "success",
  "data": {
    "post_id": "69f5d869767b59d4b3bb9d25",
    "upload_id": "hhsWvgzKaJMNKBUhD01VEXzYr875AtciekaN6egwMcms",
    "asset_id": null,
    "playback_id": null,
    "playback_url": "pending://moo88ctu",
    "thumbnail_url": null,
    "duration": 0,
    "status": "processing",
    "ready_to_stream": false
  }
}
```

## D) Image Upload Config (Cloudinary)

### Endpoint
- `GET /api/v1/media/image-upload-config`

### Status
- Implemented

### Response (current)
```json
{
  "status": "success",
  "data": {
    "cloud_name": "dpnixzh3j",
    "upload_preset": "tamkko_images_unsigned",
    "upload_url": "https://api.cloudinary.com/v1_1/dpnixzh3j/image/upload",
    "folder": "tamkko/posts/images",
    "allowed_formats": ["jpg", "jpeg", "png", "webp"],
    "max_size_mb": 10
  }
}
```

### Notes / Differences vs request doc
- Unsigned preset flow; no `signature`, `api_key`, or `timestamp` returned.
- `provider` and `expires_at` fields are not yet returned.

## E) Image Upload Confirm

### Endpoint
- Not yet implemented.

### Current behavior
- Frontend can upload directly to Cloudinary using config endpoint.
- Backend does not yet expose a dedicated image confirm/register endpoint.

## F) Publish Post (single publish op for image/video)

### Endpoint
- Not yet implemented.

### Current behavior
- Video draft/upload tracking exists.
- Final publish with `visibility`, `allow_comments`, and `price_ghs` is pending.

## Mux Webhook Endpoint

### Endpoint
- `POST /api/v1/videos/webhook/mux/`

### Status
- Implemented

### Behavior
- Uses raw body parsing and verifies `mux-signature` using `MUX_WEBHOOK_SECRET`.
- Updates video records with Mux upload/asset/playback state.

## Summary (Implemented vs Pending)

### Implemented
- `POST /api/v1/videos/upload-url`
- `GET /api/v1/videos/:videoId/upload-status`
- `GET /api/v1/media/image-upload-config`
- `POST /api/v1/videos/webhook/mux/`

### Pending
- Video upload confirm endpoint
- Image upload confirm endpoint
- Final publish endpoint with visibility/pricing/comment settings
- Full response parity with frontend request document for A-F fields

