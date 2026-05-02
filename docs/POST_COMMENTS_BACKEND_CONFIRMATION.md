# Post Comments Backend Confirmation

This confirms the implemented backend contract for post comments.

## Base
- Auth required for all endpoints below: `Authorization: Bearer <token>`
- Roles allowed: `user | creator | admin`

## 1) Fetch comments for a post

- **GET** `/api/v1/videos/:videoId/comments`

### Query params
- `cursor` (optional)
- `limit` (optional, default `30`, max `100`)
- `sort` (optional): `oldest | newest` (default `oldest`)

### Response
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
          "username": "ama_boateng",
          "display_name": "Ama Boateng",
          "avatar_url": null
        },
        "body": "Top-level comment",
        "parent_comment_id": null,
        "root_comment_id": null,
        "is_deleted": false,
        "deleted_by": null,
        "parent_deleted": false,
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

## 2) Create new comment (top-level or reply)

- **POST** `/api/v1/videos/:videoId/comments`

### Request body
Top-level:
```json
{
  "body": "Nice drop!"
}
```

Reply:
```json
{
  "body": "Replying here",
  "parent_comment_id": "cmt_123"
}
```

### Response
```json
{
  "status": "success",
  "data": {
    "id": "cmt_456",
    "post_id": "post_123",
    "author": {
      "id": "usr_1",
      "username": "ama_boateng",
      "display_name": "Ama Boateng",
      "avatar_url": null
    },
    "body": "Replying here",
    "parent_comment_id": "cmt_123",
    "root_comment_id": "cmt_123",
    "is_deleted": false,
    "deleted_by": null,
    "parent_deleted": false,
    "liked_by_me": false,
    "likes_count": 0,
    "replies_count": 0,
    "created_at": "2026-05-03T12:01:00Z",
    "updated_at": "2026-05-03T12:01:00Z"
  }
}
```

## 3) Like / unlike comment (toggle)

- **POST** `/api/v1/videos/comments/:commentId/like-toggle`

### Response
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

## 4) Delete comment

- **DELETE** `/api/v1/videos/comments/:commentId`

### Delete rules
- Author can delete own comment.
- Post creator can delete any comment on own post.
- Admin can delete any comment.
- Parent deletion keeps replies (tombstone behavior).

### Response
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

`deleted_by` values:
- `author`
- `post_creator`
- `admin`

## Deleted-parent reply behavior
- Replies remain after parent delete.
- List payload includes:
  - `parent_comment_id`
  - `parent_deleted: true|false`

Frontend can use `parent_deleted: true` to show:
- “Comment replied to has been deleted.”

## Validation and constraints
- `body`: required, `1..2000` chars
- `parent_comment_id`: if provided, must exist in same post
- returns not-found / permission errors with structured shape

## Error shape
```json
{
  "status": "error",
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You can only delete your own comment."
  }
}
```

Common codes:
- `POST_NOT_FOUND`
- `COMMENT_NOT_FOUND`
- `PARENT_COMMENT_NOT_FOUND`
- `PERMISSION_DENIED`
- `COMMENTS_DISABLED`

