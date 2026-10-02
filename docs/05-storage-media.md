# 05 — Storage & Media

## Overview

inkcuba stores uploaded profile images in **SeaweedFS** (or compatible object storage behind nginx Basic Auth / S3-compatible mode).

Config module: `src/config/storage-env.ts`  
Client: `src/lib/storage/client.ts`  
Avatar helpers: `src/lib/storage/avatar.ts`

---

## Environment variables

| Variable | Description |
|---|---|
| `STORAGE_AUTH_MODE` | `nginx-basic` or `s3` |
| `STORAGE_ENDPOINT` | Base URL (e.g. `http://localhost:8333`) |
| `STORAGE_BUCKET` | Bucket/folder name (e.g. `inkcuba`) |
| `STORAGE_REGION` | Region label (required by config) |
| `USERNAME_STORAGE` | Basic auth / access key |
| `PASSWORD_STORAGE` | Basic auth / secret key |

Object URL shape:

```
{STORAGE_ENDPOINT}/{STORAGE_BUCKET}/{key}
```

Example:

```
http://localhost:8333/inkcuba/avatars/register/{hash}/{timestamp}-photo.jpg
```

---

## Avatar upload mechanism

### Sign-up avatar behavior (current)

Sign-up **does not** upload a profile photo. The form assigns a Dicebear default via `generateDefaultAvatarUrl()` and users change photos later in My Settings (`/api/settings/avatar`).

### Legacy registration upload API (`POST /api/auth/avatar`)

Still available for tooling/compat (JPG/PNG/WebP ≤ 2MB, prefix `avatars/register/`), but the public sign-up UI no longer calls it.

### Delete (legacy)

`DELETE /api/auth/avatar?key=...` only allows keys under `avatars/register/`.

---

## Media proxy

Private SeaweedFS objects are not directly readable by browsers (Basic Auth).  
UI therefore uses:

```
/api/media/avatars/...
/api/media/workspaces/...
```

Resolver: `src/lib/media/resolve-avatar-url.ts` (avatars)  
Component: `UserAvatar`

Behavior:

1. If image URL contains `/avatars/` → rewrite to `/api/media/...`
2. Proxy fetches with server credentials and streams bytes.
3. On error → fallback initials avatar.

Allowed proxy prefixes: `avatars/`, `workspaces/` (includes tmp drafts under `workspaces/tmp/{lecturerId}/`).

---

## Workspace media (SeaweedFS)

| Asset | Prefix | Max size | Notes |
|---|---|---|---|
| Background | `workspaces/{workspaceId}/background/` | **10MB** | JPG/PNG/WebP/HEIC; recommended **1600×480 px** (≈10:3 landscape); replace = upload → DB → delete previous |
| Description images | `workspaces/{workspaceId}/description/` | **5MB** | TipTap inserts; orphans removed on description update/delete |
| Create-time drafts | `workspaces/tmp/{lecturerId}/` | **5MB** | Used while creating a workspace before an id exists |
| People Excel imports | `workspaces/{workspaceId}/imports/{jobId}/source.xlsx` | **5MB** | Deleted after successful commit; cancelled jobs cleaned on next upload |

Default background in UI (no storage object): brand gradient + inkcuba logo.

---

## Default avatars

If no photo is provided:

```
https://api.dicebear.com/10.x/glyphs/svg?seed={random}
```

Seed is random per registration for variety.

---

## Settings avatar (`POST|DELETE /api/settings/avatar`)

Authenticated users can replace or remove their profile photo from My Settings.

| Rule | Value |
|---|---|
| Allowed types | `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` |
| Max size | **5 MB** (`MAX_AVATAR_SIZE_BYTES`) |
| HEIC/HEIF | Converted to JPEG with `sharp` before upload |
| Key prefix | `avatars/users/{userId}/...` |
| On replace | Upload new object → update `user.image` → delete previous storage object (no orphans / no duplicates) |
| On remove | Delete previous storage object (when key-based); set Dicebear default URL |
| Source of truth | Previous image key is read from the database (not a stale session cache) |
| UI | My Settings asks for confirmation before replace (existing custom photo) and before remove; navbar avatar syncs via optimistic event + `getSession({ disableCookieCache: true })` + `router.refresh()` |
| Rate limit | 10 / 15 minutes / user |

## Admin user avatar (`POST|DELETE /api/admin/users/[userId]/avatar`)

Admins can replace/remove another user’s photo from User Management details. Same SeaweedFS rules as settings avatar (upload → DB update → delete previous key; remove → Dicebear → delete key). Audited as `user.avatar_update` / `user.avatar_delete`. Rate limited per admin actor.

Registration avatar upload (`/api/auth/avatar`) remains **2 MB**, JPG/PNG/WebP only.

---

## Limits & validation

| Rule | Registration avatar | Settings avatar |
|---|---|---|
| Allowed types | jpeg/png/webp | jpeg/png/webp + heic/heif |
| Max size | 2 MB | 5 MB |
| Magic-byte check | Yes | Yes |
| Rate limit | 10 / 15 min / IP | 10 / 15 min / user |

Shared constants live in `src/lib/storage/types.ts`.

---

## Health & startup

- `checkStorageHealth()` uploads and deletes a probe object.
- `ensureStorageBucket()` probes bucket readiness at instrumentation/startup.
- Health API includes storage status in detailed mode.

---

## Operational tips

1. Ensure SeaweedFS/nginx is running before testing avatar registration.
2. Confirm `STORAGE_*` and credentials in `.env`.
3. If dashboard avatar is broken, check:
   - Stored `user.image` value
   - Storage availability
   - `/api/media/...` response
4. Prefer media proxy for private objects; do not expose Basic Auth to the browser.

---

## Next reading

- [06 — Email System](./06-email-system.md)
- [08 — API Reference](./08-api-reference.md)
