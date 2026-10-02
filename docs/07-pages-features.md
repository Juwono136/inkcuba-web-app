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
- Lecturer Navigate: **Overview**, **Workspaces** (Reviews/Portfolios placeholders removed)
- Mobile: solid overlay drawer; main column always full width
- Toggle via toolbar icon; desktop preference in `inkcuba.workspace-sidebar-open`

### Lecturer Workspaces (Phase 1)

- List + create at `/dashboard/lecturer/workspaces` (+ `/new`)
- List supports **debounced search**, semester filter, status (`Draft` / `Active` / `Inactive`), sort (name/class/semester/dates), and **pagination** (6/12/24/48); filters collapse behind **Search & filters** on small screens
- Detail at `/dashboard/lecturer/workspaces/[workspaceId]` with tabs:
  - **Info** — compact lecturer card + workspace details; edit opens a dialog with confirm-before-save (includes **status** picker)
  - **People / Submission / Scoring** — Coming Soon placeholders (distinct tab icons)
- Required fields: name, class name, semester (Directory Options). Optional: background ≤10MB, description ≤8000 plain chars (TipTap + images). Status defaults to **Draft** on create so students cannot access until the lecturer sets **Active**
- Confirm modals for create, update, and delete; SeaweedFS keys under `workspaces/…` stay in sync on replace/delete
- Student-facing workspace views are deferred; server helpers already deny student access when status is Draft or Inactive

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
| Public Profile | Student + Lecturer | Editable bio (TipTap, plain text max **8000**), skills, social URLs, up to **4** custom-named links; confirm before save / remove |
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
| `RichTextEditor` | TipTap bio editor (StarterKit with `link: false` + single Link extension; toolbar keeps selection; link dialog) |
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

1. Portfolio submission workspace for students
2. Lecturer Workspaces Phase 2 — People (Excel/manual), Submission cards, Scoring
3. Student workspace access (Info + Submission only)
4. Public exhibition pipeline for approved portfolios
5. Real explore filters backed by DB
6. Audit trail visibility UI for admins (writes already exist from User Management)

See [01 — Product Overview](./01-product-overview.md) status matrix.

---

## Next reading

- [08 — API Reference](./08-api-reference.md)
- [10 — User Manual](./10-user-manual.md)
