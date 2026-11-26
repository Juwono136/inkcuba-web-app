# 07 — Pages & Features

## Public pages

| Route | Description |
|---|---|
| `/` | Landing page / exhibition homepage |
| `/explore` | Explore published portfolios (currently mock data) |
| `/courses` | Courses preview surface |
| `/stats` | Campus stats surface |
| *(any unknown URL)* | Custom branded `not-found` (404) page |

### Homepage composition

1. **SiteHeader** — nav + search + auth actions / user menu  
2. **HeroSection** — brand-forward CTA  
3. **PortfolioShowcase** — bento/filter showcase (mock)  
4. **AboutSection**  
5. **CoursesPreviewSection**  
6. **HowItWorksSection** (compact)  
7. **TeamSection**  
8. **BinusSocialSection**  
9. **CtaSection**  
10. **SiteFooter**  
11. **ScrollToTop** — floating button after scroll threshold  

### Shared public UX

- Active nav underline
- Responsive mobile menu (Framer Motion)
- Global search dialog (`⌘K` / Ctrl+K) via Zustand UI store
- Toast notifications (Sonner, top-center)
- Global loading UI (`InkcubaLoader`) via `loading.tsx`

---

## Authentication pages

All use `AuthShell` (brand panel + form panel), guest-only.

| Route | Feature highlights |
|---|---|
| `/auth/sign-in` | Email/password, remember credentials, forgot password link, expired-session notice |
| `/auth/sign-up` | Campus select, password checklist; no avatar upload (defaults generated) |
| `/auth/forgot-password` | Email request + inbox confirmation state |
| `/auth/reset-password` | Token-gated new password form / invalid-token recovery |

---

## Dashboard pages

Dashboard chrome is **role-aware**:

| Layout | Routes | Chrome |
|---|---|---|
| `(workspace)` | `/dashboard/student`, `/lecturer`, `/settings` | Public `SiteHeader` + `SiteFooter` **plus** collapsible workspace sidebar + breadcrumb toolbar (not an admin clone) |
| `admin` | `/dashboard/admin/*` | Dedicated `AdminShell` (full console chrome with brand-colored sidebar/navbar) |

| Route | Access | Current content |
|---|---|---|
| `/dashboard` | Any auth user | Redirect by role |
| `/dashboard/student` | STUDENT | Welcome shell |
| `/dashboard/lecturer` | LECTURER | Overview + recent workspaces CTA |
| `/dashboard/lecturer/workspaces` | LECTURER | Workspace list / create / detail (Phase 1) |
| `/dashboard/admin` | ADMIN | Admin overview console |
| `/dashboard/admin/users` | ADMIN | User Management (list, detail modal, trash) |
| `/dashboard/admin/directory` | ADMIN | Directory Options (campus, major, batch, semester, department) |
| `/dashboard/admin/settings` | ADMIN | My Settings inside admin chrome |
| `/dashboard/settings` | Student / Lecturer | My Settings (admins redirect to `/dashboard/admin/settings`) |

`DashboardShell` / `AdminPageHeader` render page title/description/content only.

### Student / Lecturer workspace UX

- Keeps the public marketing chrome (`SiteHeader` / `SiteFooter`) — intentionally **different** from the admin console
- Desktop: sticky sidebar (`top` below SiteHeader) so Navigate + Account stay visible while scrolling long pages; Account (My Settings) sits directly under Navigate
- Lecturer Navigate: **Overview**, **Workspaces**
- Student Navigate: **Overview**, **Workspaces**, **Project lists**
- Mobile: solid overlay drawer; main column always full width
- Toggle via toolbar icon; desktop preference in `inkcuba.workspace-sidebar-open`

### Student Workspaces

- Overview at `/dashboard/student` shows recent joined workspaces + join CTA + public profile shortcut
- List at `/dashboard/student/workspaces` — animated cards, debounced search, **semester + class filters** (facet options from joined workspaces), page size, pagination
- Detail at `/dashboard/student/workspaces/[workspaceId]` with tabs (`?tab=people|submission`; Info is default):
  - **Info** — compact lecturer sidebar, then the current active submission card, then workspace details
  - **People** — read-only lecturer card + student roster (debounced search, page size, pagination); no add/remove/invite actions
  - **Submission** — published slots with debounced search, status/type filters, sort (updated, title, opening date, score, status, and direction), and pagination. Filters collapse behind **Search & filters** on small screens. Cards open the detail view. Long descriptions collapse behind **Show full description**. Under the schedule, a shortcut says which group the student is in and offers **Go to groups** plus a status-aware CTA (`Prepare project` / `Open project` / `View submitted project` / `Revise project` / `View published project`). Group cards are listed before the waiting list. A student can still move only themselves, and only into a group that has not started a project. Once any member opens Prepare project, that group is locked for student self-moves. **While the group project is in moderation** (`SUBMITTED` / `IN_REVIEW` / `REVISED`) **or published**, both student and lecturer group moves are blocked so scoring stays consistent; moves unlock again on `DRAFT` / `NEED_REVISION`. Member lists scroll on their own when they are long. Waiting-list and group pages each use a full-width pager
- **Project lists** at `/dashboard/student/projects` — lasting library, separate from the prepare flow. Responsive cards (1 / 2 / 3 columns) show a prominent status, full workspace name (no truncation), class, semester, submission, Individual/Group, and an access label (`Editable`, `View only · Left group`, `Detached`, `Archived · Restorable`, and so on). Title search waits 450 ms. Cards offer **Edit/Open**, **Submission** when still reachable, **Restore** for archived projects, and **Delete** with confirmation. Delete removes DB rows and SeaweedFS objects. Archive keeps files; Restore returns draft/revision. Projects remain after workspace/submission delete via snapshots. Former group members keep view access; only current members edit a live group project
- **Prepare / project detail** at `/dashboard/student/projects/[id]?source=submission|lists` — Back follows `source` and reachability. Unsaved title/description/link edits open a confirm modal before in-app Back, browser Back/Forward, same-origin nav clicks, refresh, or tab close (`useUnsavedChangesGuard` + `beforeunload`). Overview media UI: image grid with cover label + **Replace/Remove**, video card with preview/`key` remount, length/size, Replace/Remove (confirm modals; client size checks). Callout explains **Save draft** (persist fields, stay editable) vs **Archive** (shelve draft/revision as read-only; Restore later). Archive only for `DRAFT`/`NEED_REVISION`. After submit, a **single prominent lock banner** replaces stacked alerts (lecturer reviewing / waiting for moderation) with clear Back / submission actions; the sticky action bar repeats the lock state. Revision and publish banners show sanitized rich-text feedback and score. **Assessment panel** tabs: **Scoring rubric** (criteria before grading) and **Scoring results** (latest score sheet after publish or revision feedback; empty state while pending). History opens in a paginated modal (infinite “Load older”, no “N events” count, actor and timestamp on separate lines). After submit (`SUBMITTED`/`IN_REVIEW`/`REVISED`/`PUBLISHED`), students cannot edit, archive, or delete while the submission link remains (API + UI lock for individual and group). Unlock for edit again only on `NEED_REVISION` while the schedule window is open. `PUBLISHED` stays read-only. Submit follows the lecturer schedule window. Action buttons use a full-width bar (More/Delete/Archive|Restore + Save/Submit); on phones the bar sits in normal page flow at the end. Delete/Archive/Restore fold into a More menu on small screens. Submit uses `Idempotency-Key`. Concurrent group edits reject a stale `updatedAt`. Image/video/document replace or remove keeps SeaweedFS in sync (no orphan previous keys). Shared `Button` uses `cursor-pointer`
- **Mobile workspace chrome** — below `lg`, a fixed bottom tab bar mirrors Overview / Workspaces / Project lists / My Settings (lecturer omits Project lists). Sidebar + mobile nav: Overview=`LayoutDashboard`, Workspaces=`FolderKanban`, Project lists=`ClipboardList` (distinct from workspaces), Settings=`Settings`. The sidebar drawer remains available. Main content and the scroll-to-top control leave space above the tab bar
- Public join gate at `/join?code=…` (no Better Auth `useSession` on SSR):
  - Guests see a dedicated “sign in to join” landing (workspace preview when code is valid/Active), then `/auth/sign-in?callbackUrl=/join?code=…`
  - After sign-in, students return to `/join`, auto-join, then land on the workspace detail page (not the generic dashboard)
  - Non-students see a clear blocked state

### Public user profiles (`/u/[identifier]`)

- Public pages for **STUDENT** and **LECTURER** (no login required), styled distinctly by role; content width aligns with site navbar (`max-w-7xl`)
- Identifier: **BINUSIAN ID** stored on `user.nim` when present (`/u/{binusianId}`), otherwise user id — same for students and lecturers
- Shows identity labels (campus/major/batch/department/title) with distinct icons, **Skills above About** (About supports **Show more / Show less** for long bios), Connect sidebar for social links only (share actions live in the header), avatar with scroll-zoom + drag lightbox
- Verified portfolio/project showcase section (empty until verification ships)
- Lecturer People tab names + student workspace lecturer cards link here
- My Settings → Public Profile: Copy link + View public page (BINUSIAN ID is URL-only, not displayed as marketing copy)
- API: `GET /api/public/profiles/[identifier]` (rate limited); never exposes email/NIDN

### Lecturer Workspaces (Phase 1 + People)

- List + create at `/dashboard/lecturer/workspaces` (+ `/new`)
- List supports **debounced search**, semester filter, status (`Draft` / `Active` / `Inactive`), sort (name/class/semester/dates), and **pagination** (6/12/24/48); filters collapse behind **Search & filters** on small screens
- Detail at `/dashboard/lecturer/workspaces/[workspaceId]` with tabs (`?tab=people|submission|scoring` persists on refresh; Info is default when omitted):
  - **Info** — compact lecturer card, current active submission card underneath, workspace details; edit opens a dialog with confirm-before-save (includes **status** picker)
  - **People** — invite panel collapses via the chevron only; member list uses **responsive cards on mobile/tablet** and a full table on desktop (Student, Student ID/NIM, Academic Program, Batch, Status, Joined via); debounced search + pagination; Excel template (styled + major/batch dropdowns from Directory Options) → preview/edit → async BullMQ commit with progress polling (stops when complete/failed). Large files insert preview rows in batches; commit drains chunks under one stable job id (no duplicate parallel commits). Invite emails go through the outbox + worker. Students receive invite/welcome emails for manual add, Excel import, and join via link/code.
  - **Submission** — create/edit slots use a two-tab dialog (**Details** + **Assessment rubric**). The dialog does **not** use a sticky footer (actions scroll with the form for better mobile layout) and does **not** close on backdrop click or Escape—only the **×** control (or Cancel) dismisses it so long edits are not lost accidentally. Details: title, Draft/Active status, date window or no deadline, max score 1–1000, optional rich text ≤2500, individual or group (group size + formation fill a 2-column row; type/formation freeze once any project is submitted or reviewed). Rubric tab is required: component weights must total 100% with inline format validation. **Close** still locks an active slot. Delete asks the lecturer to type the submission title. Groups are removed. Student projects stay. Detail shows a redesigned read-only **Scoring rubric** (numbered criteria, weight bars, max points), a compact **Scoring & moderation** card (counts + **Score this submission**) that jumps into the Scoring tab for that slot, then the groups board. Long descriptions stay collapsed with **Show full description**. Group boards keep **Unassigned** visually separate from project groups. On a phone, press and hold the drag handle (touch scrolling no longer cancels the gesture). Moves, adding groups, and deleting an empty group each open a confirmation. **Add groups** asks how many empty groups to create at once (1–50 per request, 200 groups maximum on one submission). The board separates **seats each** (the per-group limit) from **total seats** (groups multiplied by that limit). A unique member constraint blocks duplicates. **Group moves are blocked for lecturer and student while any portfolio on that group is in moderation or published**; lecturers may move again during draft or revision. The list has debounced search, status/type filters, sort, and pagination; filters collapse on small screens. The waiting list and the group list each paginate with a full-width pager under that list. Long member lists scroll inside the card.
  - **Scoring** — two-level flow: scoring slots → submitted projects only. Cards show **Published** / **Revision requested** badges; single **Review** (no batch). Review: **journey timeline**, compact **Previous/Next** text controls (top + bottom), bento media, then **Assessment & moderation** tabs in order **Moderation → Scoring rubric → Scoring results**. Long rubric/result lists scroll inside the panel. **Decision rules:** **Publish** requires complete rubric scores for the chosen mode (`INDIVIDUAL` / `GROUP_ONLY` / `GROUP_AND_INDIVIDUAL`); feedback is optional; the Publish button stays disabled until scores are complete. **Request revision** hides scoring inputs, requires feedback, and records no score sheet (blocked after 2 rounds → must Publish). Group + individual scoring picks one student at a time via chips (progress “N/M complete”). **Scoring results** adapts by mode: individual shows a single project total; group-only shows shared group rubric + equal member finals; group + individual shows blend weights, group rubric, and a member chip strip with per-student component breakdown. History stores mode, component scores, and member finals in event metadata. Confirm + Idempotency-Key. Emails: submit/resubmit; revision (round X of 2); published.
- **Soft delete / trash** — Delete asks the lecturer to type the workspace name, then moves it to trash (`deleted_at` + closed as Inactive). Trash at `/dashboard/lecturer/workspaces/trash` supports restore or permanent delete. Items auto hard-purge after **30 days** (workspace row and workspace SeaweedFS files). Student project rows and `projects/` files are kept. Lifecycle status DRAFT/ACTIVE/INACTIVE stays separate from trash.
- Required fields: name, class name, semester (Directory Options). Optional: background ≤10MB, description ≤8000 plain chars (TipTap + images). Status defaults to **Draft** on create so students cannot access until the lecturer sets **Active**
- Confirm modals for create, update, soft-delete (typed name), member remove, and import commit; SeaweedFS keys under `workspaces/…` (including `imports/`) stay in sync on replace/hard-delete
- Student join: `/join?code=…` + `POST /api/student/workspaces/join` (Active, non-trashed workspaces only) + welcome email. New invited users activate via `/auth/activate`

### Admin console UX

- Full dedicated console (no public header/footer)
- Brand-colored gradient header strip + solid white sidebar (no translucent mobile drawer)
- Desktop: collapsible rail with hover-edge toggle; My Settings pinned under Account
- Mobile/tablet: opaque slide-over drawer with clear labels + dimmed backdrop; body scroll locked while open
- Navbar breadcrumbs + **Public site** + profile menu

### Admin User Management (`/dashboard/admin/users`)

- Paginated directory of all roles (Student, Lecturer, Admin) with last-login column
- Debounced search (name, email, campus, NIM/NIDN), role/status filters, sortable columns
- Detail modal: edit **role**, **active/inactive**, and institutional identity. ID fields are role-scoped: **Student** → BINUSIAN ID / NIM; **Lecturer** → BINUSIAN ID + NIDN; **Admin** → BINUSIAN ID only. Also campus, major, batch, semester, department, title.
- Campus / major / batch / semester / department use **Directory Options** selects
- Soft delete → Trash (30-day retention) with restore / permanent remove; hard delete also clears SeaweedFS avatars
- Confirm dialogs for save, soft delete, restore, and hard delete
- Every mutation writes detailed `audit_log` metadata (`user.update` field-level `changes`)
- APIs under `/api/admin/users/*` (ADMIN-only, rate limited)

### Admin Directory Options (`/dashboard/admin/directory`)

- CRUD for selectable institutional values: campus, major, batch, semester, department
- **Label-only** create/edit forms — stored `value` is system-generated from the label at create time and stays immutable (so profile references remain stable)
- Renaming a **label** updates display everywhere via server-side `value → label` resolution (`directoryLabels` on settings + admin user detail); profiles keep the same `value` key
- **Drag-and-drop** reorder via grip handles (Framer Motion); sort order is not shown as a numeric field; drag is disabled while a search filter is active
- Debounced search (label/value), pagination (10/20/50), responsive card layout on small screens and compact rows on tablet/desktop
- Active options drive User Management selects and public `GET /api/directory-options`
- Default campuses are seeded automatically when the campus category is empty
- Mutations audited as `directory_option.create|update|delete|reorder`

### Admin Field Permissions (`/dashboard/admin/field-permissions`)

- Matrix of which **My Settings** identity fields each role may self-edit (`name`, `title`, `campus`, `nim`, `nidn`, `major`, `batch`, `semester`, `department`)
- Defaults: students read-only; lecturers & admins can edit **name** + **title**
- Irrelevant fields per role show as N/A (e.g. NIDN for students)
- Changes are audited as `role_field_permission.update` and enforced by `PATCH /api/settings/identity`

### Admin User Management extras

- User detail dialog can **upload / remove** profile photos (SeaweedFS; previous object deleted on replace/remove)
- ADMIN identity extras (**title**, major, department) persist on `lecturer_profile` so My Settings stays in sync with User Management
- Directory-backed identity fields share one source of truth: Directory Options → stored values on user/profile → resolved labels on My Settings / User Management / future consumers

### Identity sync model (cross-page)

| Surface | Writes | Reads / display |
|---|---|---|
| Directory Options | label, active, order | Admin table shows current labels |
| User Management | stores directory `value` keys (+ IDs, role, avatar) | Detail uses `directoryLabels` for read-only views; selects show current labels |
| Field Permissions | which fields My Settings may edit | Enforced on `PATCH /api/settings/identity` |
| My Settings (all roles) | allowed identity fields + avatar + public profile | Identity card shows `directoryLabels`; form selects bind to stored values |
---

## Navigation when authenticated

### Desktop

- Sign In / Get Started buttons are replaced by **profile avatar**.
- Clicking avatar opens `UserMenu` dropdown:
  - Name, email, role badge
  - Dashboard
  - My Settings
  - Log out (destructive styling + confirm modal)

### Mobile

- Auth section shows profile card + Dashboard / Settings actions + logout button.
- Logout still uses the shared confirm modal.

---

## My Settings

| Audience | Route |
|---|---|
| Student / Lecturer | `/dashboard/settings` |
| Admin | `/dashboard/admin/settings` |

Shared settings logic (`src/components/settings/`):

| Section | Roles | Behavior |
|---|---|---|
| Account Identity | All | Fields shown by role. Self-editability is configured in **Field Permissions** (defaults: students RO; lecturers/admins may edit name + title). Confirm modal on save |
| Profile Photo | All | Upload/replace/remove with confirm modals (5MB; HEIC→JPEG); updates `user.image`; previous SeaweedFS object deleted; navbar avatar syncs immediately |
| Public Profile | Student + Lecturer | Editable bio (TipTap with **H1/H2/H3**, bold, italic, lists, links; plain text max **8000**), skills, social URLs, up to **4** custom-named links; confirm before save / remove; share URL prefers BINUSIAN ID |
| Security | All | Password fields with placeholders, show/hide toggles, live strength checklist, confirm modal + notification email; validation toasts show the specific field message |
| Login History | All | Last **7 days** of sign-ins beside Security on large screens; friendly location labels (no raw IPv6 blobs); paginated |

Admins skip Public Profile. Which identity fields users can edit on My Settings is controlled by Field Permissions. Admins can always override all identity fields (and avatars) from User Management — those writes stay in sync with My Settings.

---

## Important UI components

| Component | Purpose |
|---|---|
| `SiteHeader` / `AuthNavActions` | Adaptive public/auth header actions |
| `UserMenu` / `MobileUserAccountActions` | Account dropdown + logout |
| `useLiveSessionUser` | Keeps navbar avatar in sync after settings photo changes (bypasses cookie-cache lag) |
| `SocialBrandIcons` + `SocialLinksPreview` | LinkedIn / GitHub / Instagram / YouTube / X / TikTok brand marks in settings preview |
| `AdminShell` / `AdminSidebar` / `AdminNavbar` | Dedicated admin console chrome |
| `AdminBreadcrumb` | Path breadcrumbs in admin navbar |
| `UsersPageClient` / `UserDetailDialog` | Admin User Management table + detail/edit modal |
| `ConfirmDialog` | Reusable confirmation modal |
| `ScrollToTop` | Global FAB (mounted in `AppProviders` for all pages) |
| `WorkspaceShell` / `WorkspaceSidebar` / `WorkspaceToolbar` | Student/lecturer: public header/footer + collapsible sidebar + breadcrumbs |
| `AppBreadcrumb` | Shared breadcrumb for admin + workspace navbars |
| `LoginHistorySection` | Paginated 7-day login history on My Settings |
| `UserAvatar` | Resolves storage/Dicebear/fallback initials |
| `PasswordInput` | Show/hide password |
| `PasswordRequirements` | Live password rule checklist |
| `AvatarUploadField` | Local preview only until submit |
| `SettingsPageClient` + section cards | Full My Settings experience |
| `RichTextEditor` / `WorkspaceRichTextEditor` | TipTap editors (StarterKit with `link: false` + Link; workspace variant may allow images). Formatting toolbar stays pinned at the top of the editor while long content scrolls inside a capped pane (`max-h` ≈ 28rem / 65vh) so Bold/Italic/lists/links remain usable without scrolling the toolbar away |
| `AuthShell` | Shared auth layout |
| `InkcubaLoader` | Branded loading state |
| `PortfolioSearchDialog` | Global search modal |

---

## Data currently used for exhibition UI

Mock datasets in `src/data/`:

- `showcase-portfolios.ts`
- `showcase-courses.ts`
- `binus-links.ts`

These power the public exhibition experience until live portfolio APIs are connected.

---

## Planned feature surfaces (schema-ready)

1. Public exhibition of `PUBLISHED` projects and lecturer take-down UI (moderation and scoring are live; publish flags are stored)
2. Public exhibition pipeline for published projects
3. Real explore filters backed by DB
4. Audit trail visibility UI for admins (writes already exist from User Management)

See [01 — Product Overview](./01-product-overview.md) status matrix.

---

## Next reading

- [08 — API Reference](./08-api-reference.md)
- [10 — User Manual](./10-user-manual.md)
