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
| `(workspace)` | `/dashboard/student`, `/lecturer`, `/settings` | Public `SiteHeader` + `SiteFooter` |
| `admin` | `/dashboard/admin/*` | Dedicated `AdminShell` (collapsible sidebar, admin navbar with breadcrumbs + profile menu, admin footer) — **no** public header/footer |

| Route | Access | Current content |
|---|---|---|
| `/dashboard` | Any auth user | Redirect by role |
| `/dashboard/student` | STUDENT | Welcome shell |
| `/dashboard/lecturer` | LECTURER | Welcome shell |
| `/dashboard/admin` | ADMIN | Admin overview console |
| `/dashboard/admin/settings` | ADMIN | My Settings inside admin chrome |
| `/dashboard/settings` | Student / Lecturer | My Settings (admins redirect to `/dashboard/admin/settings`) |

`DashboardShell` / `AdminPageHeader` render page title/description/content only.

### Admin console UX

- Collapsible sidebar with a mid-edge chevron toggle that appears on hover (desktop); state persisted in `localStorage`
- No horizontal overflow when collapsed (icon-only rail + `title` tooltips)
- Brand wordmark always visible in the mobile drawer
- Primary modules at the top; **My Settings** pinned at the bottom under Account
- Admin navbar: breadcrumbs, **Public site** button, profile menu
- Compact admin footer (no decorative middle-dot separators)
- Mobile drawer overlay + Escape to close
- Upcoming modules shown as placeholders (User Management, Portfolios, Audit)

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
| Account Identity | All | Read-only institutional fields; empty values render as `-` |
| Profile Photo | All | Upload/replace/remove with confirm modals (5MB; HEIC→JPEG); updates `user.image`; previous SeaweedFS object deleted; navbar avatar syncs immediately |
| Public Profile | Student + Lecturer | Editable bio (TipTap: bold/italic/lists/links), skills, social + portfolio URLs with brand icons; confirm before save / remove |
| Security | All | Password fields with placeholders, show/hide toggles, live strength checklist, confirm modal + notification email; validation toasts show the specific field message |

Admins skip Public Profile. Major/batch/campus/BINUSIAN ID and related identity fields are admin-managed later (not editable here).

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
| `ConfirmDialog` | Reusable confirmation modal |
| `UserAvatar` | Resolves storage/Dicebear/fallback initials |
| `PasswordInput` | Show/hide password |
| `PasswordRequirements` | Live password rule checklist |
| `AvatarUploadField` | Local preview only until submit |
| `SettingsPageClient` + section cards | Full My Settings experience |
| `RichTextEditor` | TipTap bio editor (StarterKit with `link: false` + single Link extension; toolbar keeps selection; link dialog) |
| `AuthShell` | Shared auth layout |
| `InkcubaLoader` | Branded loading state |
| `ScrollToTop` | Homepage convenience control |
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
2. Lecturer review / publish workflow  
3. Admin User Management (edit locked identity fields)  
4. Real explore filters backed by DB  
5. Audit trail visibility for admins  

See [01 — Product Overview](./01-product-overview.md) status matrix.

---

## Next reading

- [08 — API Reference](./08-api-reference.md)
- [10 — User Manual](./10-user-manual.md)
