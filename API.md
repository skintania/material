# Skintania API Reference

## Table of Contents

- [Auth](#auth)
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/verify-otp](#post-authverify-otp)
  - [POST /auth/resend-otp](#post-authresend-otp)
  - [POST /auth/forgot-password](#post-authforgot-password)
  - [POST /auth/reset-password](#post-authreset-password)
  - [GET /auth/me](#get-authme)
- [Users](#users)
  - [POST /users/register/member](#post-usersregistermember)
  - [POST /users/register/osk](#post-usersregisterosk)
  - [GET /users/me](#get-usersme)
  - [GET /users/:id](#get-usersid)
  - [GET /users/search](#get-userssearchqlimit20offset0)
  - [PATCH /users/:id](#patch-usersid)
  - [PATCH /users/:id/password](#patch-usersidpassword)
  - [DELETE /users/:id](#delete-usersid)
  - [POST /users/:id/ban](#post-usersidban)
  - [POST /users/:id/unban](#post-usersidunban)
  - [PATCH /users/:id/role](#patch-usersidrole)
  - [GET /users/:id/avatar](#get-usersidavatar)
  - [PUT /users/:id/avatar](#put-usersidavatar)
  - [DELETE /users/:id/avatar](#delete-usersidavatar)
- [Events](#events)
  - [GET /events](#get-eventslimit20cursor)
  - [GET /events/:id](#get-eventsid)
  - [POST /events/announcement](#post-eventsannouncement)
  - [POST /events/poll](#post-eventspoll)
  - [POST /events/activity](#post-eventsactivity)
  - [PATCH /events/:id](#patch-eventsid)
  - [DELETE /events/:id](#delete-eventsid)
  - [PUT /events/:id/image](#put-eventsidimage)
  - [POST /events/:id/choices](#post-eventsidchoices)
  - [PATCH /events/:id/choices/:choiceId](#patch-eventsidchoiceschoiceid)
  - [DELETE /events/:id/choices/:choiceId](#delete-eventsidchoiceschoiceid)
  - [PUT /events/:id/choices/:choiceId/image](#put-eventsidchoiceschoiceidimage)
  - [DELETE /events/:id/choices/:choiceId/image](#delete-eventsidchoiceschoiceidimage)
  - [POST /events/:id/vote](#post-eventsidvote)
  - [POST /events/:id/join](#post-eventsidjoin)
- [Admin](#admin)
  - [GET /admin/stats](#get-adminstats)
  - [GET /admin/users](#get-adminuserslimit20cursorroleisverifiedisbanned)
  - [GET /admin/users/search](#get-adminuserssearchqlimit20offset0)
  - [GET /admin/users/:id](#get-adminusersid)
  - [GET /admin/events](#get-admineventslimit20cursortype)
  - [GET /admin/events/:id](#get-admineventsid)
  - [GET /admin/config](#get-adminconfig)
  - [PATCH /admin/config](#patch-adminconfig)
  - [GET /admin/audit](#get-adminaudit)
- [Courses](#courses)
  - [GET /courses](#get-courses)
  - [POST /courses](#post-courses)
  - [GET /courses/:courseId](#get-coursescourseid)
  - [PATCH /courses/:courseId](#patch-coursescourseid)
  - [DELETE /courses/:courseId](#delete-coursescourseid)
  - [GET /courses/:courseId/clips](#get-coursescourseIdclipscursor)
  - [GET /courses/:courseId/clips/*](#get-coursescourseidclips)
  - [PUT /courses/:courseId/clips/:clipId](#put-coursescourseidclipsclipidd)
  - [DELETE /courses/:courseId/clips/:clipId](#delete-coursescourseidclipsclipidd)
  - [GET /courses/:courseId/files](#get-coursescourseidfilescursor)
  - [GET /courses/:courseId/files/:fileId](#get-coursescourseidfilesfileid)
  - [PUT /courses/:courseId/files/:fileId](#put-coursescourseidfilesfileid)
  - [DELETE /courses/:courseId/files/:fileId](#delete-coursescourseidfilesfileid)
- [Assets](#assets)
- [SKDrive](#skdrive)
- [Calculator](#calculator)
  - [POST /calculator](#post-calculator)
  - [GET /calculator/grades](#get-calculatorgrades)
- [Rate Limiting](#rate-limiting)
- [HTTP Status Codes](#http-status-codes)

---

Base URL: `https://skintania-api.skintania143.workers.dev/`

All responses are JSON. Successful responses include `"success": true`. Failed responses include `"success": false` and `"error": "..."`.

Authentication uses **Bearer token** in the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## Auth

### POST /auth/login
Login with username, email, or CU number and password.

**Body**
```json
{ "identifier": "username | email | CU number", "password": "..." }
```

> Emails are normalized to lowercase before lookup, so `User@Example.com` and `user@example.com` resolve to the same account.

**Response 200**
```json
{
  "success": true,
  "token": "...",
  "expiresInMinutes": 10080,
  "user": { "id": 1, "username": "...", "role": "member", "auth_level": 1, "email": "...", "is_verified": 1, "is_2fa_enabled": 0 }
}
```

---

### POST /auth/verify-otp
Verify the OTP sent to the user's email after registration. Send **one** of `email`, `username`, or `student_id` along with `otp`.

**Body**
```json
{ "email": "user@example.com", "otp": "123456" }
```
> Also accepted: `{ "username": "beams", "otp": "123456" }` or `{ "student_id": "6400000000", "otp": "123456" }`

---

### POST /auth/resend-otp
Resend OTP. Send **one** of `email`, `username`, or `student_id`.

**Body**
```json
{ "email": "user@example.com" }
```
> Also accepted: `{ "username": "beams" }` or `{ "student_id": "6400000000" }`

> Subject to `OTP_RESEND_COOLDOWN_SECONDS` (default 60s). Returns 400 with remaining wait time if called too soon.

---

### POST /auth/forgot-password
Send a password-reset OTP to the given email.

**Body**
```json
{ "email": "user@example.com" }
```

> Subject to `OTP_RESEND_COOLDOWN_SECONDS` (default 60s).

---

### POST /auth/reset-password
Reset password using the OTP from `/auth/forgot-password`.

**Body**
```json
{ "email": "user@example.com", "otp": "123456", "newPassword": "newSecret123" }
```

> `newPassword` must be at least 6 characters. The OTP is consumed and cannot be reused.

---

### GET /auth/me
Get the current authenticated user's profile.

**Auth required** — returns 401 if token is missing or invalid.

**Response 200**
```json
{
  "success": true,
  "user": {
    "id": 1, "username": "beam", "firstname": "Beam", "lastname": "S",
    "email": "beam@example.com", "role": "member",
    "profile_url": null, "is_verified": 1, "is_2fa_enabled": 0
  }
}
```

---

## Users

### POST /users/register/member
Register a new member account (public, no auth). Returns 400 if `REGISTRATION_OPEN` is false, `MAX_REGISTRATIONS` is reached, or the email/username/student ID is already taken.

**Body**
```json
{
  "name": "Beam",
  "surname": "S",
  "username": "beams",
  "CU_number": "6400000000",
  "email": "beam@example.com",
  "password": "secret123"
}
```

---

### POST /users/register/osk
Register a new OSK account (public, no auth). Returns 400 if `REGISTRATION_OPEN` is false, `MAX_REGISTRATIONS` is reached, or the email/username/student ID is already taken.

**Body**
```json
{
  "name": "Beam", "surname": "S", "username": "beams",
  "OSK_gen": 30, "OSK_number": "12345",
  "CU_number": "6400000000",
  "email": "beam@example.com", "password": "secret123"
}
```

---

### GET /users/me
Get the authenticated user's own full profile.

**Auth required**

**Response 200**
```json
{
  "success": true,
  "user": {
    "id": 1, "firstname": "Beam", "lastname": "S", "username": "beams",
    "email": "beam@example.com", "role": "member", "profile_url": null,
    "is_verified": 1, "is_2fa_enabled": 0,
    "student_id": "6400000000", "osk_gen": null, "osk_id": null
  }
}
```

> Unlike `GET /auth/me`, this endpoint includes `student_id`, `osk_gen`, and `osk_id`.

---

### GET /users/:id
Get a user's public profile by ID.

**Auth required**

**Response 200** (non-admin)
```json
{
  "success": true,
  "user": { "id": 1, "firstname": "Beam", "lastname": "S", "username": "beams", "role": "member", "profile_url": null }
}
```

**Response 200** (admin — includes private fields)
```json
{
  "success": true,
  "user": {
    "id": 1, "firstname": "Beam", "lastname": "S", "username": "beams",
    "email": "beam@example.com", "role": "member", "profile_url": null,
    "is_verified": 1, "is_banned": 0, "student_id": "6400000000",
    "osk_gen": null, "osk_id": null
  }
}
```

> Banned users are hidden from non-admins (returns 404).

---

### GET /users/search?q=&limit=20&offset=0
Search users by name or username. Returns public profile only (no email, no ban status).

**Auth required**

| Query param | Type | Default |
|-------------|------|---------|
| `q` | string | required |
| `limit` | number | 20 |
| `offset` | number | 0 |

**Response 200**
```json
{
  "success": true,
  "users": [
    { "id": 1, "firstname": "Beam", "lastname": "S", "username": "beams", "profile_url": null, "role": "member" }
  ]
}
```

---

### PATCH /users/:id
Update user profile fields.

**Auth required** — self only.

**Body** (all fields optional)
```json
{
  "firstname": "Beam",
  "lastname": "S",
  "email": "new@example.com",
  "otp": "123456",
  "student_id": "6400000001",
  "osk_gen": 30,
  "osk_id": "12345",
  "profile_url": null
}
```

> `username`, `role`, and `password` cannot be changed through this endpoint.
>
> Changing `email` to a **different address** requires `otp` — call `POST /auth/resend-otp` with the current email first. After the update succeeds, the account is marked unverified and an OTP is automatically sent to the new email for re-verification.
>
> If `email` is the same as the existing one, `otp` is not required and the field is ignored.

---

### PATCH /users/:id/password
Change a user's password.

**Auth required** — self requires `currentPassword`. Admin can skip `currentPassword`.

**Body**
```json
{ "currentPassword": "old123", "newPassword": "new456" }
```

---

### DELETE /users/:id
Delete a user account.

**Auth required** — self or admin only.

---

### POST /users/:id/ban
Ban a user. **Admin only.**

---

### POST /users/:id/unban
Unban a user. **Admin only.**

---

### PATCH /users/:id/role
Change a user's role. **Admin only.**

**Body**
```json
{ "role": "member" }
```
Valid roles: `member`, `OSK`, `admin`

---

### GET /users/:id/avatar
Fetch a user's profile picture. Returns the raw image stream with the correct `Content-Type`.

**Auth required**

**Response** — raw image (`image/jpeg`, `image/png`, or `image/webp`). Returns 404 if the user has no avatar.

> This is how the frontend resolves `profile_url`. When `profile_url` is non-null, fetch the image from `GET /users/{id}/avatar`.

---

### PUT /users/:id/avatar
Upload a profile avatar. Send raw image body.

**Auth required** — self only.

**Headers**
```
Content-Type: image/jpeg | image/png | image/webp
Content-Length: <bytes>
```
Max size: **5MB**

---

### DELETE /users/:id/avatar
Remove the user's avatar.

**Auth required** — self only.

---

## Events

All event endpoints require a verified auth token.

### GET /events?limit=20&cursor=
List all events (newest first).

| Query param | Type | Description |
|-------------|------|-------------|
| `limit` | number | Page size (default 20) |
| `cursor` | number | Last `id` from previous page — omit for first page |

**Response 200**
```json
{
  "success": true,
  "events": [ { "id": 1, "type": "Poll", "header": "...", "createdAt": "..." } ],
  "nextCursor": 42
}
```

> `nextCursor` is `null` when there are no more pages.

---

### GET /events/:id
Get a single event with type-specific details.

- **Poll** — includes `choices` (with vote counts) and `userVote`
- **Activity** — includes `participantCount` and `isJoined`
- **Announcement** — base fields only

---

### POST /events/announcement
Create an announcement.

**Body**
```json
{ "header": "Title", "description": "Optional body", "imgLink": null }
```

---

### POST /events/poll
Create a poll.

**Body**
```json
{
  "header": "Vote for something",
  "description": "Optional",
  "choices": [
    { "choiceText": "Option A", "imgLink": null },
    { "choiceText": "Option B", "imgLink": null }
  ]
}
```
Minimum **2 choices** required.

---

### POST /events/activity
Create an activity.

**Body**
```json
{ "header": "Club Run", "description": "Optional", "imgLink": null }
```

---

### PATCH /events/:id
Edit an event header, description, or cover image link. **Creator only.**

**Body** (all optional)
```json
{ "header": "New title", "description": "New body", "imgLink": null }
```

---

### DELETE /events/:id
Delete an event and all related data (votes, participants, images). Creator or admin only.

---

### PUT /events/:id/image
Upload a cover image for an event. Creator or admin only.

**Headers**
```
Content-Type: image/jpeg | image/png | image/webp
Content-Length: <bytes>
```
Max size: **10MB**

---

### POST /events/:id/choices
Add a new choice to a poll. Creator or admin only.

**Body**
```json
{ "choiceText": "Option C" }
```

---

### PATCH /events/:id/choices/:choiceId
Edit the text of an existing poll choice. Creator or admin only.

**Body**
```json
{ "choiceText": "Updated option text" }
```

---

### DELETE /events/:id/choices/:choiceId
Delete a poll choice. Creator or admin only.

> Requires at least 2 choices to remain. All votes for the deleted choice are also removed.

---

### PUT /events/:id/choices/:choiceId/image
Upload or replace an image for a poll choice. Creator or admin only.

**Headers** — same as event image upload.

---

### DELETE /events/:id/choices/:choiceId/image
Remove the image from a poll choice. Creator or admin only.

---

### POST /events/:id/vote
Vote, change, or remove a vote in a poll.

**Body**
```json
{ "choiceId": 3 }
```
Pass `"choiceId": null` to remove an existing vote.

**Response 200**
```json
{
  "success": true,
  "message": "Vote recorded",
  "userVote": 3,
  "choices": [
    { "id": 1, "choiceText": "Option A", "voteCount": 5, "imgLink": null },
    { "id": 3, "choiceText": "Option B", "voteCount": 12, "imgLink": null }
  ]
}
```

> `message` is `"Vote changed"` when switching choices, `"Vote removed"` when `choiceId` is `null`. `userVote` is `null` after removal.

---

### POST /events/:id/join
Toggle join/leave for an activity.

**Response 200**
```json
{ "success": true, "message": "Joined activity", "isJoined": true, "participantCount": 42 }
```

---

## Admin

All admin endpoints require a verified auth token with **admin** role.

### GET /admin/stats
Get system-wide statistics.

**Response 200**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 120, "verifiedUsers": 100, "bannedUsers": 2,
    "adminCount": 3, "oskCount": 20, "memberCount": 97,
    "totalEvents": 45, "pollCount": 15, "activityCount": 20, "announcementCount": 10,
    "totalActivityJoins": 300, "totalVotes": 800
  }
}
```

---

### GET /admin/users?limit=20&cursor=&role=&is_verified=&is_banned=
List all users with full details (newest first).

| Query param | Type | Description |
|-------------|------|-------------|
| `limit` | number | Page size (default 20) |
| `cursor` | number | Last `id` from previous page — omit for first page |
| `role` | string | Filter: `member`, `OSK`, `admin` |
| `is_verified` | boolean | Filter: `true` / `false` |
| `is_banned` | boolean | Filter: `true` / `false` |

**Response 200**
```json
{ "success": true, "users": [ { ... } ], "nextCursor": 55 }
```

> `nextCursor` is `null` when there are no more pages.

---

### GET /admin/users/search?q=&limit=20&offset=0
Search users — returns full details including email and ban status.

---

### GET /admin/users/:id
Get full details for a single user.

---

### GET /admin/events?limit=20&cursor=&type=
List all events with creator info (newest first).

| Query param | Type | Description |
|-------------|------|-------------|
| `limit` | number | Page size (default 20) |
| `cursor` | number | Last `id` from previous page — omit for first page |
| `type` | string | Filter: `Poll`, `Activity`, `Announcement` |

**Response 200**
```json
{ "success": true, "events": [ { ..., "creatorName": "Beam S", "creatorUsername": "beams" } ], "nextCursor": 30 }
```

---

### GET /admin/events/:id
Get a single event with full type-specific details (choices + vote counts, or participant list).

---

### GET /admin/config
Get the current runtime configuration.

**Response 200**
```json
{
  "success": true,
  "config": {
    "SERVER_CLOSE": false,
    "ENABLE_TOKEN_CHECK": true,
    "REGISTRATION_OPEN": true,
    "MAX_REGISTRATIONS": 0,
    "OTP_EXPIRES_MINUTES": 10,
    "OTP_RESEND_COOLDOWN_SECONDS": 60,
    "JWT_EXPIRES_DAYS": 7,
    "RATE_LIMIT_ENABLED": true,
    "RATE_LIMIT_REQUESTS": 100,
    "RATE_LIMIT_WINDOW_SECONDS": 60
  }
}
```

---

### PATCH /admin/config
Update one or more runtime config values. Changes are persisted to D1 and take effect immediately.

**Body** (all fields optional)
```json
{
  "SERVER_CLOSE": true,
  "ENABLE_TOKEN_CHECK": true,
  "REGISTRATION_OPEN": false,
  "MAX_REGISTRATIONS": 50,
  "OTP_EXPIRES_MINUTES": 15,
  "OTP_RESEND_COOLDOWN_SECONDS": 120,
  "JWT_EXPIRES_DAYS": 7,
  "RATE_LIMIT_ENABLED": true,
  "RATE_LIMIT_REQUESTS": 100,
  "RATE_LIMIT_WINDOW_SECONDS": 60
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `SERVER_CLOSE` | boolean | `false` | When `true`, non-admin requests receive 503. Admins remain unaffected. |
| `REGISTRATION_OPEN` | boolean | `true` | When `false`, all new registrations are rejected. |
| `MAX_REGISTRATIONS` | number | `0` | Max total users allowed. `0` = unlimited. |
| `OTP_EXPIRES_MINUTES` | number | `10` | How long a generated OTP is valid. |
| `OTP_RESEND_COOLDOWN_SECONDS` | number | `60` | How long a user must wait before requesting another OTP. |
| `JWT_EXPIRES_DAYS` | number | `7` | Token lifetime for newly issued JWTs. |
| `ENABLE_TOKEN_CHECK` | boolean | `true` | Toggle token verification globally. |
| `RATE_LIMIT_ENABLED` | boolean | `true` | Enable or disable IP-based rate limiting. |
| `RATE_LIMIT_REQUESTS` | number | `100` | Max requests per IP per window. |
| `RATE_LIMIT_WINDOW_SECONDS` | number | `60` | Rolling window size in seconds. |

**Response 200**
```json
{ "success": true, "message": "Config updated", "config": { ... } }
```

---

### GET /admin/audit
Get the audit log of admin actions. **Admin only.**

| Query param | Type | Description |
|-------------|------|-------------|
| `limit` | number | Page size (default 50) |
| `cursor` | number | Last `id` from previous page — omit for first page |
| `actor_id` | number | Filter by admin who performed the action |
| `action` | string | Filter by action type (see table below) |
| `target_type` | string | Filter by `user`, `event`, `config`, `skdrive` |
| `target_id` | string | Filter by specific resource ID or key |
| `from` | ISO string | Filter entries on or after this timestamp |
| `to` | ISO string | Filter entries on or before this timestamp |

**Logged actions**

| Action | Triggered by |
|--------|-------------|
| `ban_user` | Admin bans a user |
| `unban_user` | Admin unbans a user |
| `delete_user` | Admin deletes another user's account |
| `change_role` | Admin changes a user's role |
| `delete_event` | Admin deletes an event they didn't create |
| `config_update` | Admin updates runtime config |
| `skdrive_upload` | Admin uploads a SKDrive file |
| `skdrive_delete` | Admin deletes a SKDrive file |

**Response 200**
```json
{
  "success": true,
  "logs": [
    {
      "id": 12,
      "actor_id": 3,
      "actor_role": "admin",
      "action": "change_role",
      "target_type": "user",
      "target_id": "7",
      "detail": { "from": "member", "to": "OSK" },
      "created_at": "2026-04-28T10:00:00.000Z"
    }
  ],
  "nextCursor": 11
}
```

> `nextCursor` is `null` when there are no more pages. The `detail` field contains action-specific context (e.g. old/new role, changed config keys).

---

## Courses

All course endpoints require a verified auth token.
- **Read** (GET) — all roles
- **Write** (POST / PATCH / PUT / DELETE) — admin only

### GET /courses
List all courses.

**Response 200**
```json
{
  "success": true,
  "courses": [
    { "id": 1, "title": "Introduction to Skin Care", "description": "...", "createdAt": "..." }
  ]
}
```

---

### POST /courses
Create a new course. **Admin only.**

**Body**
```json
{ "folder": "intro-skin-care", "title": "Course Title", "description": "Optional description" }
```

> `folder` is required and is used as the R2 key prefix for all clips and files belonging to this course.

**Response 201**
```json
{ "success": true, "message": "Course created", "id": 1 }
```

---

### GET /courses/:courseId
Get a single course by ID.

**Response 200**
```json
{ "success": true, "course": { "id": 1, "folder": "intro-skin-care", "title": "...", "description": "...", "createdAt": "...", "updatedAt": "..." } }
```

---

### PATCH /courses/:courseId
Update a course. **Admin only.**

**Body** (all optional)
```json
{ "title": "New Title", "description": "New description" }
```

---

### DELETE /courses/:courseId
Delete a course and all its clips and files from R2. **Admin only.**

---

### GET /courses/:courseId/clips?cursor=
List clips for a course. Supports R2 pagination via `cursor`.

---

### GET /courses/:courseId/clips/*
Stream a video clip using the `key` from the clip list response.

**Auth** — Bearer token in `Authorization` header, or `?token=` query parameter (required for `<video>` tag).

**Example** — `GET /courses/1/clips/material%2FLecture%2010%20Mechanical%20Properties%20II.mp4?token=eyJ...`

**Response** — raw video stream with correct `Content-Type`. Supports HTTP Range requests (`206 Partial Content`) for seeking and buffering without downloading the full file.

> Use the `key` field from `GET /courses/:courseId/clips` URL-encoded as the path suffix.
>
> ```html
> <video src="https://.../courses/1/clips/material%2FLecture%202.mp4?token=eyJ..." controls></video>
> ```

---

### PUT /courses/:courseId/clips/:clipId
Upload a video clip. **Admin only.**

**Headers**
```
Content-Type: video/mp4 | video/webm | video/quicktime
Content-Length: <bytes>
```
Max size: **2GB**

---

### DELETE /courses/:courseId/clips/:clipId
Delete a clip. **Admin only.**

---

### GET /courses/:courseId/files?cursor=
List files for a course.

---

### GET /courses/:courseId/files/:fileId
Download a course file.

**Response** — raw file stream.

---

### PUT /courses/:courseId/files/:fileId
Upload a course file. **Admin only.**

**Headers**
```
Content-Type: application/pdf
              application/zip
              application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)
              application/vnd.openxmlformats-officedocument.presentationml.presentation (.pptx)
              application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (.xlsx)
              image/jpeg | image/png
Content-Length: <bytes>
```
Max size: **100MB**

---

### DELETE /courses/:courseId/files/:fileId
Delete a course file. **Admin only.**

---

## Assets

Assets are general-purpose images stored in `ASSETS_BUCKET`.

### GET /assets/*
Serve an asset by key (e.g., `GET /assets/banner.jpg`).

**Auth required** — any authenticated user.

---

### PUT /assets/*
Upload an asset. **Admin only.**

**Headers**
```
Content-Type: image/jpeg | image/png | image/webp | image/svg+xml | image/gif
Content-Length: <bytes>
```
Max size: **10MB**

---

### DELETE /assets/*
Delete an asset by key. **Admin only.**

---

## SKDrive

Shared file storage for the organization. All authenticated users can read; **admin only** can upload and delete.

### GET /skdrive/*
Serve a file by key (e.g., `GET /skdrive/documents/guidelines.pdf`).

**Auth required**

**Response** — raw file stream with correct `Content-Type`.

---

### GET /skdrive?prefix=&cursor=
List files at an optional path prefix.

**Auth required**

| Query param | Type | Description |
|-------------|------|-------------|
| `prefix` | string | Filter by key prefix (optional) |
| `cursor` | string | Pagination cursor from previous response |

**Response 200**
```json
{
  "success": true,
  "files": [
    { "key": "documents/guidelines.pdf", "name": "guidelines.pdf", "size": 204800, "uploaded": "...", "contentType": "application/pdf" }
  ],
  "folders": [{ "key": "documents/", "name": "documents" }],
  "truncated": false,
  "cursor": null
}
```

---

### PUT /skdrive/*
Upload a file. **Admin only.**

**Headers**
```
Content-Type: application/pdf | application/zip
              application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)
              application/vnd.openxmlformats-officedocument.presentationml.presentation (.pptx)
              application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (.xlsx)
              image/jpeg | image/png | image/webp | image/svg+xml | image/gif
              text/plain
Content-Length: <bytes>
```
Max size: **100MB**

---

### DELETE /skdrive/*
Delete a file by key. **Admin only.**

---

## Calculator

GPA/admission-chance calculator. Loads weights and historical data from R2 (`Calculator/weight.json` and `Calculator/data.json`). Saves the user's grade selections to D1 so they persist across sessions.

**Auth:** Bearer token required for both endpoints.

---

### POST /calculator
Submit grades for a department. Runs the weighted GPA calculation, returns the result and an all-department comparison table, and persists the grades to D1.

**Request body**
```json
{
  "department": "CPE",
  "grades": [
    { "subject": "General Physics 1", "grade": 3.5 },
    { "subject": "Calculus 1", "grade": 4.0 }
  ]
}
```

**Response**
```json
{
  "success": true,
  "department": "CPE",
  "gpax": 3.72,
  "weightedScore": 44.6,
  "fullScore": 60.0,
  "chancePercent": 65.00,
  "allDepartments": [
    { "department": "CPE", "name": "Computer Engineering", "minScore": 280.5, "maxScore": 310.0, "chance": 65.00 },
    { "department": "EE",  "name": "Electrical Engineering", "minScore": 260.0, "maxScore": 295.0, "chance": 55.00 }
  ]
}
```

| Field | Description |
|-------|-------------|
| `gpax` | Weighted GPA for the selected department |
| `weightedScore` | Raw weighted score (`sum(grade × weight)`) |
| `fullScore` | Maximum possible score (`totalWeight × 4`) |
| `chancePercent` | Estimated admission chance (0–100.00), or `null` if no history data |
| `allDepartments` | Chance for every department in `weight.json`, sorted by code. `minScore`/`maxScore` from most recent history year. |

---

### GET /calculator/grades
Retrieve the current user's last saved grade selections.

**Response**
```json
{
  "success": true,
  "grades": [
    { "subject": "General Physics 1", "grade": 3.5 },
    { "subject": "Calculus 1", "grade": 4.0 }
  ]
}
```

---

## Rate Limiting

All requests are rate-limited per IP. Every response includes these headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests allowed in the window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

When you reach **80%** of the limit, responses include `X-RateLimit-Warning: true` so clients can back off proactively.

When the limit is exceeded, the API returns `429 Too Many Requests`:
```json
{ "success": false, "error": "Too many requests. Try again in 12s." }
```
With a `Retry-After: 12` header indicating seconds to wait.

Defaults: **100 requests per 60 seconds** per IP. Tunable via `PATCH /admin/config`.

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (CORS preflight) |
| 400 | Bad request / validation error |
| 401 | Missing or invalid token |
| 403 | Permission denied |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Server under maintenance |
