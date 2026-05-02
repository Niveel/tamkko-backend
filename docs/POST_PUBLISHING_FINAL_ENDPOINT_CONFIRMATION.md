# Final Publish Endpoint Confirmation

Implemented endpoint for final image/video post publishing.

## 1) Endpoint URL + Method
- `POST /api/v1/videos/publish`

## 2) Auth
- Required: `Authorization: Bearer <token>`
- Roles: `creator`, `admin`

## 3) Request Payload Contract

### Video publish
```json
{
  "media_type": "video",
  "upload_id": "hhsWvgzKaJMNKBUhD01VEXzYr875AtciekaN6egwMcms",
  "caption": "My latest drop",
  "visibility": "followers_only",
  "allow_comments": true,
  "price_ghs": null
}
```

### Image publish
```json
{
  "media_type": "image",
  "caption": "Image post",
  "visibility": "public",
  "allow_comments": true,
  "price_ghs": null,
  "image_url": "https://res.cloudinary.com/.../image/upload/...jpg",
  "image_public_id": "tamkko/posts/images/abc",
  "width": 1080,
  "height": 1350,
  "format": "jpg",
  "bytes": 345672
}
```

## 4) Validations Enforced
- Authenticated `creator/admin` only
- `media_type` in `video | image`
- `visibility` in `public | paid | followers_only | private`
- `price_ghs`:
  - required and `> 0` when `visibility=paid`
  - must be null/omitted for non-paid
- Video publish:
  - `upload_id` required
  - upload must exist and belong to creator
  - media status must be `ready`
  - duration must be `<= 60s`
- Image publish:
  - requires `image_url`, `image_public_id`, `width`, `height`, `format`, `bytes`

## 5) Success Response

### Video
```json
{
  "status": "success",
  "data": {
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
}
```

### Image
```json
{
  "status": "success",
  "data": {
    "post": {
      "id": "post_123",
      "creator_id": "usr_123",
      "media_type": "image",
      "caption": "Image post",
      "visibility": "public",
      "allow_comments": true,
      "price_ghs": null,
      "created_at": "2026-05-02T14:12:10Z",
      "media": {
        "provider": "cloudinary",
        "url": "https://res.cloudinary.com/.../image/upload/...jpg",
        "public_id": "tamkko/posts/images/abc",
        "width": 1080,
        "height": 1350,
        "format": "jpg",
        "bytes": 345672
      }
    }
  }
}
```

## 6) Error Model
```json
{
  "status": "error",
  "error": {
    "code": "UPLOAD_NOT_READY",
    "message": "Media is still processing. Try again shortly."
  }
}
```

### Error codes currently returned
- `UPLOAD_NOT_FOUND`
- `UPLOAD_NOT_READY`
- `MEDIA_PROCESSING_FAILED`
- `VIDEO_DURATION_EXCEEDED`
- `INVALID_PAID_PRICING`
- `INVALID_IMAGE_PAYLOAD`

## 7) Constraints
- Caption max length: `2000`
- Paid price: must be `> 0`
- Video max duration: `60 seconds`

