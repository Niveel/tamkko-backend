# Profile Workspace - My Videos Backend API Request

## Scope
This request is only for **Profile Workspace > My Videos** (creator's own uploaded posts).

Included:
- Paginated list of creator's uploaded posts
- Filter by `free` and `paid`
- Endpoint to open one post's details
- Endpoint to edit post metadata/settings

Excluded for now:
- Saved videos of other creators
- Liked videos of other creators
- Public feed/search behavior

## Functional Requirements

### 1) My Videos List (paginated)
Need an endpoint that returns the authenticated creator's uploaded posts with cursor pagination.

Query params needed:
- `cursor` (optional)
- `limit` (optional, default backend-defined, max backend-defined)
- `filter` (optional): `all | free | paid`

Filter meanings:
- `free` => non-paid posts only
- `paid` => paid posts only
- `all` => both

Expected response shape:

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "post_123",
        "title": "Campus drop",
        "caption": "Friday vibes",
        "media_type": "video",
        "visibility": "public",
        "is_paid": false,
        "price_ghs": null,
        "allow_comments": true,
        "created_at": "2026-05-03T10:30:00Z",
        "thumbnail_url": "https://....jpg",
        "duration_seconds": 34.2,
        "views_count": 1200,
        "likes_count": 89,
        "comments_count": 14
      }
    ],
    "next_cursor": "cursor_abc",
    "has_more": true
  }
}
```

Notes:
- For image posts, `duration_seconds` can be null/omitted.
- `is_paid` can be derived from `visibility = paid` if you prefer; include at least one explicit indicator for easier frontend filtering.

---

### 2) Open Video/Post Details
Need endpoint to fetch one owned post in full detail for edit screen.

Expected response shape:

```json
{
  "status": "success",
  "data": {
    "post": {
      "id": "post_123",
      "title": "Campus drop",
      "caption": "Friday vibes",
      "media_type": "video",
      "visibility": "followers_only",
      "allow_comments": true,
      "is_paid": false,
      "price_ghs": null,
      "created_at": "2026-05-03T10:30:00Z",
      "media": {
        "provider": "mux",
        "playback_id": "abc",
        "hls_url": "https://stream.mux.com/abc.m3u8",
        "thumbnail_url": "https://....jpg",
        "duration_seconds": 34.2
      }
    }
  }
}
```

---

### 3) Edit Post Settings
Need endpoint to update:
- `title`
- `caption`
- `visibility` (`public | paid | followers_only | private`)
- `allow_comments`

If `visibility = paid`:
- backend should enforce creator subscription pricing as source of truth (as already confirmed in publish flow).
- backend can ignore client `price_ghs` or validate against stored creator subscription price.

Expected request payload:

```json
{
  "title": "Updated title",
  "caption": "Updated caption",
  "visibility": "paid",
  "allow_comments": false
}
```

Expected response shape:

```json
{
  "status": "success",
  "data": {
    "post": {
      "id": "post_123",
      "title": "Updated title",
      "caption": "Updated caption",
      "visibility": "paid",
      "allow_comments": false,
      "is_paid": true,
      "price_ghs": 20
    }
  }
}
```

## Validation + Error Expectations
Please return clear errors for:
- Not owner of post
- Post not found
- Invalid visibility value
- Paid visibility without valid creator subscription price
- Invalid title/caption constraints

Preferred error shape:

```json
{
  "status": "error",
  "error": {
    "code": "SUBSCRIPTION_PRICE_NOT_SET",
    "message": "Set Subscription Pricing first in Profile Workspace > Subscription Pricing before setting post to paid."
  }
}
```

## Needed Back From Backend
Please provide:

1. Exact endpoint URL + method for:
   - list my uploaded posts
   - get one uploaded post
   - update one uploaded post
2. Final query params for pagination/filtering.
3. Final request/response payload shapes.
4. Any title/caption limits and rate limits.

