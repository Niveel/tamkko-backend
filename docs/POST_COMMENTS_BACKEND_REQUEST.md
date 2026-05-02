# Post Comments Backend API Request

## Scope
This request is for post comments only.

Needed capabilities:
- Fetch all comments for a post
- Post a new comment
- Like/unlike a comment
- Reply to a comment (support deep reply chains)
- Delete own comment

## Key Product Rules

1. Replies can be nested in multiple levels (reply chains).
2. Users can only delete comments they authored.
3. Post creator can delete any comment on their own post (moderation).
4. If a parent comment is deleted, its replies must remain.
5. For replies whose parent was deleted, backend should return enough metadata for frontend to show:
   - "Comment replied to has been deleted."

## Performance Requirements (High Volume)
Comments can be thousands, so endpoints must be pagination-first and frontend-friendly.

Please support:
- Cursor pagination (not page-number only)
- Stable sorting (newest/oldest strategy must be explicit and consistent)
- Lightweight payloads for list calls
- `has_more` and `next_cursor`
- Optional reply preview/count fields to avoid over-fetching

## Operations Needed (Please provide your endpoint URL + method)

### 1) Fetch comments for a post (paginated)
Request needs:
- `post_id` or path-param equivalent
- `cursor` (optional)
- `limit` (optional)
- optional sort (`oldest` default preferred for conversation readability, but backend can confirm)

Expected response shape:

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "cmt_123",
        "post_id": "post_123",
        "author": {
          "id": "usr_1",
          "username": "@klasique",
          "display_name": "Klasique",
          "avatar_url": "https://..."
        },
        "body": "Top-level comment",
        "parent_comment_id": null,
        "root_comment_id": null,
        "is_deleted": false,
        "liked_by_me": false,
        "likes_count": 12,
        "replies_count": 4,
        "created_at": "2026-05-03T12:00:00Z",
        "updated_at": "2026-05-03T12:00:00Z"
      }
    ],
    "next_cursor": "cur_abc",
    "has_more": true
  }
}
```

### 2) Post a new comment
Create top-level comment on a post.

Request payload:

```json
{
  "body": "Nice drop!"
}
```

Response:
- return full created comment object (same shape as fetch item).

### 3) Reply to a comment (nested)
Create reply to any comment level.

Request payload:

```json
{
  "body": "Replying here",
  "parent_comment_id": "cmt_123"
}
```

Response:
- return full created reply object.
- include `parent_comment_id` and `root_comment_id`.

### 4) Like / unlike a comment
Need toggle behavior or explicit like/unlike endpoints (backend can choose).

Response must include at least:

```json
{
  "status": "success",
  "data": {
    "comment_id": "cmt_123",
    "liked_by_me": true,
    "likes_count": 13
  }
}
```

### 5) Delete own comment
Delete permission model:
- Comment author can delete own comment.
- Post creator can delete any comment on their own post.
- Admin can delete any comment.

Behavior:
- If parent comment is deleted, child replies stay.
- For deleted comments, either:
  - soft-delete with `is_deleted = true`, or
  - remove body and keep tombstone metadata
- If deletion is performed by post creator/admin (not original author), include metadata so frontend can display moderation context.

Expected frontend-supporting response:

```json
{
  "status": "success",
  "data": {
    "comment_id": "cmt_123",
    "is_deleted": true,
    "deleted_by": "author"
  }
}
```

`deleted_by` expected values:
- `author`
- `post_creator`
- `admin`

## Deleted Parent Reply Handling
For replies whose parent is deleted, please return metadata such as:

```json
{
  "parent_comment_id": "cmt_deleted",
  "parent_deleted": true
}
```

So frontend can show:
- "Comment replied to has been deleted."

## Error Expectations
Please return clear structured errors for:
- post not found
- comment not found
- parent comment not found
- permission denied on delete
- validation (empty body, too long, etc.)
- rate-limited actions

Preferred error shape:

```json
{
  "status": "error",
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You can only delete your own comment."
  }
}
```

Additional permission case:
- If a non-author/non-post-creator/non-admin attempts delete, return `PERMISSION_DENIED`.

## Needed Back From Backend
Please provide:

1. Exact endpoint URLs + methods for operations 1-5.
2. Final request/response shapes.
3. Max comment length and moderation constraints.
4. Pagination defaults/limits.
5. Whether replies are fetched:
   - inline in main comment list, or
   - via a dedicated replies endpoint per comment.
