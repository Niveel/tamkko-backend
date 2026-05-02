# Post Publishing - Backend API Request (Publish Only)

## Scope
This request is for **post publishing only**.

- We are **not** requesting post management endpoints yet (edit/delete/list/status updates after publish will be requested later).
- Please provide the endpoint URLs/methods your backend already has (or will create) for the operations below.
- Frontend flow should feel the same to users for image/video, but provider integration differs:
  - **Videos:** Mux (TUS/resumable)
  - **Images:** Cloudinary (direct upload using backend-provided config)

## Supported Post Types
1. Video post:
- Short video only, max duration **60 seconds**
- Optional caption

2. Image post:
- Single image
- Optional caption

## Visibility + Interaction Requirements
Each published post must support:

- `public` (free)
- `paid`
- `followers_only` (free but only creator followers can view)
- `private` (only creator can view)
- `allow_comments` (true/false)

## Upload + Publish Flow
From user perspective the steps are the same:
1. Select media
2. Upload media
3. Publish post

Provider differences:
- Video upload target and processing: **Mux**
- Image upload target: **Cloudinary**

## Backend Operations Needed (Please Provide Your Endpoint Names)

### A) Video upload init (Mux)
Purpose:
- Frontend requests a Mux upload session before uploading video.
- Frontend uses `tus-js-client` for resumable upload.

Frontend request expectation:

```json
{
  "media_type": "video",
  "mime_type": "video/mp4",
  "file_name": "clip_20260502.mp4",
  "file_size_bytes": 12400458,
  "duration_seconds": 42.1
}
```

Frontend response expectation:

```json
{
  "upload_id": "upl_123",
  "provider": "mux",
  "upload_url": "https://....",
  "upload_protocol": "tus",
  "expires_at": "2026-05-02T14:03:22Z",
  "max_duration_seconds": 60,
  "max_file_size_bytes": 104857600,
  "provider_asset_ref": "mux_upload_or_asset_ref_if_available"
}
```

Required behavior:
- `upload_url` must be directly usable by TUS client.
- Backend validates max duration and media rules.

---

### B) Video upload confirm
Purpose:
- Frontend notifies backend when Mux upload is completed client-side.

Frontend request expectation:

```json
{
  "upload_id": "upl_123",
  "client_upload_completed_at": "2026-05-02T14:10:00Z"
}
```

Frontend response expectation:

```json
{
  "upload_id": "upl_123",
  "status": "processing",
  "provider": "mux",
  "provider_asset_ref": "mux_asset_ref",
  "message": "Upload confirmed and processing started."
}
```

Allowed statuses:
- `uploading`
- `processing`
- `ready`
- `failed`

---

### C) Video upload status (preferred)
Purpose:
- Frontend may poll until video becomes publish-ready.

Frontend response expectation:

```json
{
  "upload_id": "upl_123",
  "status": "ready",
  "provider": "mux",
  "provider_asset_ref": "mux_asset_ref",
  "duration_seconds": 42.08,
  "thumbnail_url": "https://....jpg",
  "playback": {
    "playback_id": "mux_playback_id",
    "hls_url": "https://stream.mux.com/<playback_id>.m3u8"
  },
  "error_code": null,
  "error_message": null
}
```

---

### D) Image upload config (Cloudinary)
Purpose:
- Frontend requests short-lived Cloudinary upload configuration from backend.
- Frontend then uploads image directly to Cloudinary.

Frontend response expectation:

```json
{
  "provider": "cloudinary",
  "cloud_name": "tamkko-cloud",
  "upload_preset": "mobile_unsigned_or_signed_preset",
  "folder": "posts/images",
  "constraints": {
    "max_size_mb": 10,
    "allowed_types": ["image/jpeg", "image/png", "image/webp"]
  },
  "signature": null,
  "api_key": null,
  "timestamp": null,
  "expires_at": "2026-05-02T14:03:22Z"
}
```

Notes:
- If you use **signed** Cloudinary upload, include `signature`, `api_key`, and `timestamp`.
- If you use unsigned preset, those can be null/omitted.

---

### E) Image upload confirm to backend
Purpose:
- After direct Cloudinary upload succeeds, frontend sends uploaded asset details to backend.
- Backend validates and registers media as publishable.

Frontend request expectation:

```json
{
  "media_type": "image",
  "provider": "cloudinary",
  "image_url": "https://res.cloudinary.com/.../image/upload/...jpg",
  "image_public_id": "posts/images/tamkko_1746200000",
  "width": 1080,
  "height": 1350,
  "format": "jpg",
  "bytes": 345672
}
```

Frontend response expectation:

```json
{
  "upload_id": "upl_img_123",
  "status": "ready",
  "provider": "cloudinary",
  "provider_asset_ref": "posts/images/tamkko_1746200000",
  "image": {
    "url": "https://res.cloudinary.com/.../image/upload/...jpg",
    "width": 1080,
    "height": 1350,
    "format": "jpg",
    "bytes": 345672
  }
}
```

---

### F) Publish post (single publish operation for image/video)
Purpose:
- Create final post from a confirmed upload.

Frontend request expectation:

```json
{
  "media_type": "video",
  "upload_id": "upl_123",
  "caption": "My latest drop",
  "visibility": "followers_only",
  "allow_comments": true,
  "price_ghs": null
}
```

Rules:
- `visibility` supports: `public | paid | followers_only | private`
- `price_ghs`:
  - required when `visibility = paid`
  - null/omitted for non-paid posts
- Backend validates media readiness:
  - video: Mux asset ready
  - image: Cloudinary asset confirmed

Frontend publish response expectation:

```json
{
  "post": {
    "id": "post_123",
    "creator_id": "usr_123",
    "media_type": "video",
    "caption": "My latest drop",
    "visibility": "followers_only",
    "allow_comments": true,
    "price_ghs": null,
    "created_at": "2026-05-02T14:12:10Z",
    "media": {
      "provider": "mux",
      "thumbnail_url": "https://....jpg",
      "duration_seconds": 42.08,
      "playback_id": "mux_playback_id",
      "hls_url": "https://stream.mux.com/<playback_id>.m3u8"
    }
  }
}
```

For image post response, `media` should include Cloudinary image URL + metadata and omit video playback fields.

## Validation + Error Expectations
Please return clear structured errors for:

- video duration exceeds 60 seconds
- invalid media type
- upload not found / expired
- upload not ready
- invalid visibility
- `price_ghs` missing for paid post
- cloudinary asset rejected/invalid
- mux asset not ready/failed
- permission/authentication failures

Preferred error shape:

```json
{
  "error": {
    "code": "UPLOAD_NOT_READY",
    "message": "Media is still processing. Try again shortly."
  }
}
```

## Provider Fields Frontend Needs
Video (Mux) required by publish time:
- `provider = mux`
- `playback_id`
- HLS playback URL
- thumbnail URL
- final duration

Image (Cloudinary) required by publish time:
- `provider = cloudinary`
- canonical image URL (`secure_url`-style)
- `public_id`
- width/height/format/bytes

## What We Need Back From Backend
Please provide:

1. Exact endpoint URLs + HTTP methods for operations A-F above.
2. Any differences from payload/response shapes proposed here.
3. Required auth headers/scopes for each operation.
4. Rate limits and expiry policy:
   - Mux upload URL expiry
   - Cloudinary upload config/signature expiry
5. Whether video status polling is required or publish endpoint can internally wait until ready.
