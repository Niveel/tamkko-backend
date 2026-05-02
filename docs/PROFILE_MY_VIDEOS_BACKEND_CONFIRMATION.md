# Profile Workspace - My Videos Backend Confirmation

This confirms the currently available backend endpoints for **Profile Workspace > My Videos**.

## Implemented Endpoints

1. `GET /api/v1/videos/mine`
- Purpose: List authenticated user's uploaded posts
- Query: `cursor`, `limit`, `filter=all|free|paid`
- Auth: `user | creator | admin`

2. `GET /api/v1/videos/mine/:videoId`
- Purpose: Open one owned post details
- Auth: `user | creator | admin`
- Owner-only access enforced

3. `PATCH /api/v1/videos/mine/:videoId`
- Purpose: Edit owned post settings
- Editable: `title`, `caption`, `visibility`, `allow_comments`
- Auth: `user | creator | admin`
- Owner-only access enforced
- Paid visibility uses creator `subscriptionPriceGhs` as canonical price

4. `DELETE /api/v1/videos/:videoId`
- Purpose: Delete owned post
- Auth: `creator | admin`
- Owner-only delete enforced in service

## Notes
- If you want delete to be available to all authenticated users (not only `creator|admin`), we can align route auth to `user|creator|admin` while keeping owner checks.

