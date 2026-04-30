# Community Rooms Backend Request (Discovery, Open, Join, Search)

This document defines the frontend contract expected for room discovery and joining flows.
Base route in backend is already ` /api/v1/vip/rooms `.

## Goals
- Retrieve rooms with pagination and query support.
- Open a room details page with complete room metadata.
- Join free/paid rooms via one endpoint.
- Support promo code on paid entry (discount/free access when valid).
- Retrieve joined rooms and creator-owned rooms.

## 1) List Public Rooms (Discover)
`GET /api/v1/vip/rooms`

Query params:
- `scope=public` (default public list)
- `q` (optional search by room name, description, creator)
- `type` (optional: `all | free | paid`)
- `cursor` (optional)
- `limit` (optional, default 20)
- `sort` (optional: `recent | popular | fee_asc | fee_desc`)

Expected response:
```json
{
  "status": "success",
  "data": {
    "rooms": [
      {
        "id": "69f391025ebb952005821f6d",
        "name": "Magie",
        "description": "Good room in the town",
        "entry_fee_ghs": 5,
        "currency": "GHS",
        "is_public": true,
        "allow_tips": true,
        "status": "active",
        "capacity": 1000,
        "member_count": 0,
        "online_count": 0,
        "creator_id": "69f0f17204b032a2cf44440e",
        "creator_username": "creator_username",
        "creator_display_name": "Creator Name",
        "welcome_message": "Welcome to the room. Keep it respectful.",
        "has_joined": false,
        "has_paid": false,
        "created_at": "2026-04-30T17:27:30.769Z",
        "updated_at": "2026-04-30T17:27:30.769Z"
      }
    ],
    "next_cursor": null
  }
}
```

## 2) Room Details (Open Room)
`GET /api/v1/vip/rooms/:roomId`

Expected response:
```json
{
  "status": "success",
  "data": {
    "id": "69f391025ebb952005821f6d",
    "name": "Magie",
    "description": "Good room in the town",
    "entry_fee_ghs": 5,
    "currency": "GHS",
    "is_public": true,
    "allow_tips": true,
    "status": "active",
    "capacity": 1000,
    "member_count": 0,
    "online_count": 0,
    "creator_id": "69f0f17204b032a2cf44440e",
    "creator_username": "creator_username",
    "creator_display_name": "Creator Name",
    "welcome_message": "Welcome to the room. Keep it respectful.",
    "has_joined": false,
    "has_paid": false,
    "role": "member",
    "share_url": "https://tamkko.com/rooms/69f391025ebb952005821f6d",
    "deep_link": "tamkko://rooms/69f391025ebb952005821f6d",
    "created_at": "2026-04-30T17:27:30.769Z",
    "updated_at": "2026-04-30T17:27:30.769Z"
  }
}
```

## 3) Join Room (Free or Paid)
`POST /api/v1/vip/rooms/:roomId/join`

Request body:
```json
{
  "code_string": "CAMPUS25"
}
```
`code_string` is optional.

Expected behavior:
- Free room (`entry_fee_ghs = 0`) -> immediate join.
- Paid room without valid discount -> return payment-required state.
- Paid room with valid code reducing amount to 0 -> immediate join.
- Room full -> `409` with message `Room has reached maximum member capacity.`

Expected success shapes:

Immediate join:
```json
{
  "status": "success",
  "data": {
    "joined": true,
    "message": "Joined successfully.",
    "room": {
      "id": "69f391025ebb952005821f6d",
      "has_joined": true,
      "has_paid": true
    }
  }
}
```

Payment required:
```json
{
  "status": "success",
  "data": {
    "joined": false,
    "payment_required": true,
    "message": "Payment required to join this room.",
    "original_amount_ghs": 5,
    "discount_amount_ghs": 1,
    "payable_amount_ghs": 4,
    "code_applied": "CAMPUS25"
  }
}
```

Invalid/expired code:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Promo code is invalid, expired, or exhausted."
}
```

## 4) Joined Rooms
`GET /api/v1/vip/rooms/joined`

Query params:
- `cursor` optional
- `limit` optional (default 20)
- `q` optional

Response shape mirrors list public rooms:
```json
{
  "status": "success",
  "data": {
    "rooms": [],
    "next_cursor": null
  }
}
```

## 5) My Created Rooms
`GET /api/v1/vip/rooms/mine`

Query params:
- `cursor` optional
- `limit` optional (default 20)
- `q` optional

Response shape mirrors list public rooms.

## 6) Search Rooms Endpoint (Optional if query on list is enough)
If backend prefers a dedicated route:
`GET /api/v1/vip/rooms/search?q=<query>&cursor=<cursor>&limit=20`

Return same shape as room list for easy frontend reuse.

## 7) Promo Code Preview (Optional but recommended)
To show discounted fee before join:
`POST /api/v1/vip/rooms/:roomId/promo-code/preview`

Request:
```json
{ "code_string": "CAMPUS25" }
```

Response:
```json
{
  "status": "success",
  "data": {
    "valid": true,
    "code_string": "CAMPUS25",
    "original_amount_ghs": 5,
    "discount_amount_ghs": 1,
    "payable_amount_ghs": 4,
    "message": "Promo code applied."
  }
}
```

## 8) Access Pass (Promo Code) Management for Creators
- `GET /api/v1/vip/rooms/:roomId/access-passes`
- `POST /api/v1/vip/rooms/access-passes`
- `PATCH /api/v1/vip/rooms/access-passes/:passId`
- `DELETE /api/v1/vip/rooms/access-passes/:passId`

Each access pass item expected:
```json
{
  "id": "pass_123",
  "room_id": "69f391025ebb952005821f6d",
  "label": "Campus Promo",
  "code": "CAMPUS25",
  "discount_type": "percent",
  "discount_amount_ghs": 25,
  "max_uses": 200,
  "used_count": 3,
  "expires_at": "2026-06-01T00:00:00.000Z",
  "campus": "University of Ghana",
  "is_active": true,
  "created_at": "2026-04-30T19:10:00.000Z"
}
```

## Error contract (recommended)
All failures should include consistent shape:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Human-readable error message",
  "errors": {}
}
```

## Notes
- Frontend already supports snake_case payload fields for these room APIs.
- Pagination should be cursor-based with `next_cursor`.
- If fields are temporarily unavailable, return safe defaults instead of null where possible.
