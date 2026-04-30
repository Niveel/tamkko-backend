# Community Rooms - Backend API Request (Chunk 1: Create Room + Access Pass Management)

## Context
This document defines the frontend contract for **Community Rooms: Create Room flow**.

Scope in this chunk:
- Create room (free vs paid)
- Validate entry fee format (max 2 decimal places)
- Room visibility and tips toggle
- Access pass code lifecycle (create/edit/delete/list) as a **separate system** from room creation
- Manage room updates after creation
- Room deletion

Out of scope for this chunk:
- Room join/payment polling details
- Live chat/socket events
- Moderation tools

---

## Naming Update
Please use **Access Pass** (or `room_access_pass`) instead of "creator code".

Reason:
- Clearer user meaning
- Not tightly coupled to creator identity
- Works for campus, promo, partner, or invite use cases

---

## Core Rules
1. A room is **free** when `entry_fee_ghs = "0.00"`.
2. A room is **paid** when `entry_fee_ghs > "0.00"`.
3. Entry fee must be a money string with **at most 2 decimal places**.
4. Access passes are managed in separate endpoints.
5. User may create/edit/delete many access passes before room creation.
6. User may later edit room details and manage access passes from room management screen.
7. Frontend must **not** set room capacity/member limits; backend controls max room size.

---

## Data Types and Enums

### Money
- String decimal with up to 2 dp
- Examples: `"0.00"`, `"5.00"`, `"12.5"` (backend may normalize to `"12.50"`)

### Room status
- `draft | active | closed | archived`

### Access pass discount type
- `free` -> full waiver
- `fixed` -> fixed amount off (GHS)
- `percent` -> percentage off

---

## API Contracts

## 1) Create Room Draft (optional but recommended)
Create a temporary draft container so access passes can be prepared before final room creation.

### POST `/api/v1/rooms/drafts`
Auth: required

Request:
```json
{
  "name": "Campus Vibes Room",
  "description": "Talk music, events, and student life.",
  "entry_fee_ghs": "5.00",
  "is_public": true,
  "allow_tips": true,
  "welcome_message": "Welcome everyone!"
}
```

Response:
```json
{
  "status": "success",
  "message": "Room draft created.",
  "data": {
    "room_draft": {
      "draft_id": "rdf_123",
      "name": "Campus Vibes Room",
      "description": "Talk music, events, and student life.",
      "entry_fee_ghs": "5.00",
      "is_free": false,
      "capacity": 500,
      "is_public": true,
      "allow_tips": true,
      "welcome_message": "Welcome everyone!",
      "created_at": "2026-04-30T10:00:00Z",
      "updated_at": "2026-04-30T10:00:00Z"
    }
  }
}
```

Validation errors:
- invalid amount format (>2 dp)
- negative amount

---

## 2) Access Pass CRUD (Pre-room and Post-room)
Access passes should support being attached to:
- room draft (`draft_id`) before room creation, or
- room (`room_id`) after room exists

### POST `/api/v1/rooms/access-passes`
Auth: required

Request:
```json
{
  "draft_id": "rdf_123",
  "label": "UG Student Free Pass",
  "code_string": "UG-FREE-2026",
  "campus": "University of Ghana",
  "discount_type": "free",
  "discount_amount_ghs": null,
  "max_uses": 200,
  "expires_at": "2026-06-01T23:59:59Z",
  "is_active": true
}
```

Response:
```json
{
  "status": "success",
  "message": "Access pass created.",
  "data": {
    "access_pass": {
      "id": "pass_001",
      "owner_type": "draft",
      "owner_id": "rdf_123",
      "label": "UG Student Free Pass",
      "code_string": "UG-FREE-2026",
      "campus": "University of Ghana",
      "discount_type": "free",
      "discount_amount_ghs": null,
      "max_uses": 200,
      "used_count": 0,
      "is_active": true,
      "expires_at": "2026-06-01T23:59:59Z",
      "created_at": "2026-04-30T10:05:00Z",
      "updated_at": "2026-04-30T10:05:00Z"
    }
  }
}
```

Validation rules:
- `code_string` unique per owner room/draft (case-insensitive)
- `discount_type = free` => `discount_amount_ghs = null`
- `discount_type = fixed` => `discount_amount_ghs > 0`
- `discount_type = percent` => `discount_amount_ghs` between 1 and 100
- max active passes per room/draft: 5

### GET `/api/v1/rooms/access-passes?draft_id=rdf_123`
or
### GET `/api/v1/rooms/access-passes?room_id=room_123`

Response:
```json
{
  "status": "success",
  "data": {
    "access_passes": []
  }
}
```

### PATCH `/api/v1/rooms/access-passes/{pass_id}`
Auth: required (room owner)

Request (partial):
```json
{
  "label": "UG Student 50%",
  "discount_type": "percent",
  "discount_amount_ghs": 50,
  "max_uses": 300,
  "expires_at": "2026-07-01T23:59:59Z",
  "is_active": true
}
```

Response: same shape as create (`access_pass` object updated)

### DELETE `/api/v1/rooms/access-passes/{pass_id}`
Auth: required (room owner)

Response:
```json
{
  "status": "success",
  "message": "Access pass deleted."
}
```

---

## 3) Final Create Room (from draft)

### POST `/api/v1/rooms`
Auth: required

Request (draft finalize path):
```json
{
  "draft_id": "rdf_123"
}
```

Alternative request (direct create path, no draft):
```json
{
  "name": "Campus Vibes Room",
  "description": "Talk music, events, and student life.",
  "entry_fee_ghs": "5.00",
  "is_public": true,
  "allow_tips": true,
  "welcome_message": "Welcome everyone!"
}
```

Response:
```json
{
  "status": "success",
  "message": "Room created successfully.",
  "data": {
    "room": {
      "id": "room_123",
      "name": "Campus Vibes Room",
      "description": "Talk music, events, and student life.",
      "entry_fee_ghs": "5.00",
      "is_free": false,
      "capacity": 500,
      "member_count": 1,
      "online_count": 1,
      "is_public": true,
      "allow_tips": true,
      "welcome_message": "Welcome everyone!",
      "status": "active",
      "created_at": "2026-04-30T10:30:00Z",
      "updated_at": "2026-04-30T10:30:00Z"
    },
    "access_passes": [
      {
        "id": "pass_001",
        "owner_type": "room",
        "owner_id": "room_123",
        "label": "UG Student Free Pass",
        "code_string": "UG-FREE-2026",
        "campus": "University of Ghana",
        "discount_type": "free",
        "discount_amount_ghs": null,
        "max_uses": 200,
        "used_count": 0,
        "is_active": true,
        "expires_at": "2026-06-01T23:59:59Z"
      }
    ]
  }
}
```

Expected backend behavior:
- If `draft_id` provided, backend migrates draft + draft passes to real room.
- Room owner auto-joins as member.

---

## 4) Manage Room (Edit Details)

### PATCH `/api/v1/rooms/{room_id}`
Auth: required (owner)

Request (partial):
```json
{
  "name": "Campus Vibes Room - Official",
  "description": "Updated details.",
  "entry_fee_ghs": "2.50",
  "is_public": true,
  "allow_tips": true,
  "welcome_message": "Updated welcome."
}
```

Response:
```json
{
  "status": "success",
  "message": "Room updated.",
  "data": {
    "room": {
      "id": "room_123",
      "name": "Campus Vibes Room - Official",
      "description": "Updated details.",
      "entry_fee_ghs": "2.50",
      "is_free": false,
      "capacity": 800,
      "is_public": true,
      "allow_tips": true,
      "welcome_message": "Updated welcome.",
      "status": "active",
      "created_at": "2026-04-30T10:30:00Z",
      "updated_at": "2026-04-30T11:00:00Z"
    }
  }
}
```

Notes:
- Changing entry fee affects new entrants only.
- Existing members keep access.
- Capacity is backend-managed and returned read-only.

---

## 5) Delete Room

### DELETE `/api/v1/rooms/{room_id}`
Auth: required (owner)

Response:
```json
{
  "status": "success",
  "message": "Room deleted."
}
```

Notes:
- Deleting a room should also remove or archive associated access passes.
- Backend decides hard-delete vs soft-delete behavior.

---

## 6) Access Pass Stats (for manage screen)

### GET `/api/v1/rooms/access-passes/{pass_id}/stats`
Auth: required (owner)

Response:
```json
{
  "status": "success",
  "data": {
    "pass_id": "pass_001",
    "code_string": "UG-FREE-2026",
    "uses_count": 47,
    "max_uses": 200,
    "remaining_uses": 153,
    "members_from_pass": 47,
    "revenue_waived_ghs": "235.00",
    "first_used_at": "2026-05-01T09:00:00Z",
    "last_used_at": "2026-05-12T16:00:00Z"
  }
}
```

---

## Validation and Error Expectations

Use consistent error envelope:
```json
{
  "success": false,
  "message": "Validation failed.",
  "statusCode": 400,
  "errors": {
    "field_name": ["reason"]
  }
}
```

Important validations:
- `entry_fee_ghs` max 2 decimal places
- non-negative entry fee
- access pass rules by discount type
- access pass expiry date validity

---

## Frontend Build Assumptions
- Room is free if `is_free = true` OR normalized `entry_fee_ghs == "0.00"`
- Access pass management is independent from final room create action
- Manage Room can edit room and passes at any time
- Room capacity is backend-owned and not user-editable from frontend payloads

---

## Requested Outcome
Please implement these endpoints/contracts for Chunk 1 so frontend Create Room + Manage Room + Access Pass flows work end-to-end without extra contract changes.
