# Post Publishing - Final Publish Endpoint Request

## Context
We have integrated frontend upload flow with your confirmed endpoints:

- Video upload init (Mux): implemented
- Video upload status: implemented
- Image upload config (Cloudinary): implemented

From your confirmation doc, the remaining blocker is:

- **Final publish endpoint** (create post with visibility/comment/pricing rules)

## Request
Please implement and confirm the endpoint for **final post publishing** (single endpoint handling both image and video posts).

Important:
- We are **not suggesting your endpoint path name**.
- Please provide the endpoint URL + method your backend uses.

## Required Request Payload
Frontend expects to send:

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

Rules:
- `media_type`: `video | image`
- `visibility`: `public | paid | followers_only | private`
- `price_ghs`:
  - required if `visibility = paid`
  - null/omitted for non-paid
- `allow_comments`: boolean
- `caption`: optional string

For image posts:
- If your publish endpoint needs Cloudinary `public_id` or URL instead of `upload_id`, please confirm exact payload shape.

## Required Backend Validation
Please enforce:

1. Authenticated creator/admin only
2. `upload_id` exists and belongs to requesting user
3. Media is publish-ready
4. Video duration max 60s
5. Valid visibility enum
6. `price_ghs` required when paid; rejected otherwise if invalid

## Required Success Response Shape
Please return a complete published post object:

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

For image post response:
- `media.provider = cloudinary`
- include canonical image URL + metadata (`public_id`, width, height, format, bytes)
- omit video playback fields

## Required Error Response Shape
Please return structured errors:

```json
{
  "status": "error",
  "error": {
    "code": "UPLOAD_NOT_READY",
    "message": "Media is still processing. Try again shortly."
  }
}
```

Expected error cases:
- upload not found
- upload ownership mismatch
- upload not ready
- invalid visibility
- invalid paid pricing payload
- media processing failed

## Needed Back From Backend
Please reply with:

1. Final endpoint URL + HTTP method
2. Final request payload contract (video + image)
3. Final success/error response examples
4. Any constraints (caption max length, paid minimum amount, etc.)

