# 10 — User Manual

This manual explains how to use inkcuba from an end-user perspective.

---

## 1. Browse as a visitor (no login)

1. Open the homepage.
2. Use top navigation:
   - **Home**
   - **Explore**
   - **Courses**
   - **Campus Stats**
3. Use search:
   - Click the search field, or press **⌘K** / **Ctrl+K**.
4. Scroll the homepage to view exhibition highlights, about, courses, team, and BINUS links.
5. Use the floating **scroll-up** button (bottom-right) to return to top quickly.
6. Click **Sign In** or **Get Started** to enter the platform.

---

## 2. Create an account

1. Go to **Get Started** (`/auth/sign-up`).
2. Fill required fields:
   - Full name
   - BINUS email (`@binus.edu` or `@binus.ac.id`)
   - BINUSIAN ID
   - Campus
   - Password + confirm password
3. Follow the password checklist:
   - at least 8 characters
   - 1 uppercase
   - 1 lowercase
   - 1 number
4. Click **Create Account**.
5. Check your BINUS inbox for the verification email.
6. Click **Verify Email Address** — you cannot sign in until this is done.
7. Return to Sign In and log in.

### Tips

- Public registration always creates a **Student** account (a default avatar is assigned automatically).
- Change your profile photo later in **My Settings**.
- Lecturer/Admin roles are assigned by operators, not via public sign-up.

---

## 3. Sign in

1. Open `/auth/sign-in`.
2. Enter BINUS email and password.
3. (Optional) Check **Remember my login details** to autofill next time on this device.
4. Click **Sign In**.
5. You are redirected to your role dashboard.

### If login fails

- Verify email first (check inbox/spam).
- Confirm email domain is BINUS.
- Use **Forgot password?** if needed.

### Remember me vs session

- **Remember me** = saves login details on this device for convenience.
- **Session** = keeps you signed in up to 7 days of platform use/security policy. This is separate from the checkbox.

---

## 4. Forgot / reset password

1. On Sign In, click **Forgot password?**
2. Enter your BINUS email.
3. Open the reset email (valid for **1 hour**).
4. Click **Reset Password**.
5. Enter a new strong password twice.
6. Sign in with the new password.

After reset, previous sessions are signed out for security.

---

## 5. Use the platform while logged in

### Header changes

- Sign In / Get Started buttons disappear.
- Your profile image appears instead.

### Profile menu

Click your profile image to open:

- Short profile info (name, email, role)
- **Dashboard**
- **My Settings**
- **Log out**

### Logout

1. Open profile menu → **Log out**.
2. Confirm in the modal.
3. You return to the Sign In page.

### Navigation continuity

While logged in, you can still use Home / Explore / Courses / Campus Stats from the same navbar on dashboard pages.

---

## 6. Dashboards by role

### Student dashboard (`/dashboard/student`)

For student accounts. Overview shows recent **workspaces**, join shortcuts, and a link to your **public profile**.

#### Workspaces

1. Open **Workspaces** in the sidebar — search (debounced), filter by **semester** or **class**, change page size, and paginate as the list grows.
2. Open a workspace card (only **Active** workspaces you belong to). Use the tabs:
   - **Info** — compact lecturer sidebar, the current active submission (if any), then workspace details and description (tap lecturer to open their public profile).
   - **People** — lecturer + full student roster (search with debounce, pagination). View only — no edit/add/remove.
   - **Submission** — search, filter, and sort published slots. On a phone, open **Search & filters** to reach those controls. Open a card for the full slot. Under the schedule, **Go to groups** jumps to the group cards, and **Prepare project** opens the project when your group is ready. Group cards are shown before the waiting list. You can join a group that has not started a project, then confirm the move. After anyone in a group opens Prepare project, you cannot switch groups yourself. Only the lecturer can move you. Use **Back to all submissions** to leave the detail view.
3. To join a new class: open the lecturer’s invite link (`/join?code=…`) or use **Join with code**.
   - If you are not signed in, you see a dedicated gate page asking you to sign in first.
   - After sign-in you return to the join flow and land **inside that workspace** (not the generic dashboard home).
4. **Prepare project** opens its own page from the live submission (`?source=submission`). **Back** returns to that submission detail while the workspace and slot still exist. The title is a full-width field above academic tiles and members. Status is shown clearly (Draft, Submitted, and so on). Fill the description, demo URL, 1–3 overview images, and one project document. Optional: product video, source URL, and up to 3 other links. File add/replace/remove, save, submit, archive, and delete each ask for confirmation. **Submit** only works while the lecturer’s schedule window is open (and the slot is Active). After the deadline, you can still open Prepare, save a draft, and manage the project from **Project lists**, but submit stays locked. Action buttons stay on the left so they are not covered by scroll-to-top. On a phone, use the bottom tab bar (Overview, Workspaces, Project lists, My Settings) or the sidebar menu. After you submit, editing stays closed until a lecturer asks for a revision.
5. **Project lists** (sidebar) is a separate lasting library. Cards show the full workspace name, class, semester, submission, type (Individual or Group), access label, and a clear status. Use **Edit** / **Open**, **Submission** (when the slot is still reachable), and **Delete** when allowed. Opening a card uses library mode (`?source=lists`), so **Back** returns here. If a lecturer moves you out of a group after prepare started, you still see the shared project as **View only · Left group**; only current members can edit or delete it, and only the lecturer can move members. If the workspace or submission is removed, the project stays here as **Detached** with its snapshot and files. **Archive** keeps files; **Delete** removes the project and its SeaweedFS objects.

### Public profiles (`/u/…`)

Anyone can open a student or lecturer public page without signing in:

- Students and lecturers: usually `/u/{BINUSIAN ID}` (from `user.nim`; falls back to user id if unset).
- Content comes from My Settings (identity labels, photo, bio with headings, skills above about, social links). Long About text can be expanded with **Show more**. Photo supports scroll-to-zoom and drag-to-pan. Use header **Share / Copy link** to promote the profile.
- Verified portfolios will appear in a dedicated section once that workflow ships.
- From **My Settings → Public Profile**, use **Copy link** or **View public page**.
- In a lecturer workspace **People** tab, click a student name/avatar to open their public page.
### Lecturer dashboard (`/dashboard/lecturer`)

For lecturer accounts. Overview shows a create-workspace CTA and your recent workspaces. Use **Workspaces** in the sidebar for the full list.

#### Workspaces

1. Open **Workspaces** → use search, semester/status filters, and sort as the list grows; on mobile, tap **Search & filters** to expand or collapse those controls. Change page size at the bottom.
2. **Create workspace** — enter **workspace name**, **class name**, and **semester** (from Directory Options). Choose **status** (**Draft** by default, **Active**, or **Inactive**). Optionally upload a background (**recommended 1600 × 480 px**, ≤10MB) and write a rich description. Confirm in the modal before creating.
3. After create, open the workspace: **Info** shows your lecturer profile, the current active submission under it, and workspace details. Tabs stay on refresh via the URL (`?tab=people`). **Edit** opens a dialog (including status); confirm before saving. **Delete** soft-deletes: type the workspace name to move it to **Trash** (closed to students). From Trash you can restore or permanently delete; items auto-remove after 30 days.
4. Only **Active** workspaces (not in trash) can be accessed by students. **Draft** and **Inactive** stay lecturer-only.
5. **People** tab:
   - Use the **chevron** on Invite students to show/hide link + code (tap the arrow only — the rest of the header does not toggle).
   - Member table columns: **Student** (name + email — name/avatar open the student’s public profile), **Student ID / NIM**, **Academic Program**, **Batch**, **Status**, **Joined via**, **Actions**.
   - **Add students** — search registered students (debounced), multi-select with a live selection count, confirm → invite emails.
   - **Template** asks for a short confirmation before download; the Excel file has styled headers, an example row, Instructions + Majors/Batches reference sheets, and Academic Program + Batch dropdowns synced with Admin Directory Options. Invited students are notified by email (manual add, Excel import, and when they join via link/code).
   - **Import Excel** — upload `.xlsx` (upload progress), fix preview errors, then **Commit** (BullMQ chunked ImportJob + progress bar + retryable invite emails).
   - Member list supports **debounced search**, page size, and pagination.
6. **Submission** tab:
   - **New submission** or **Edit** — title, status (**Draft** or **Active**), schedule (separate date and time for open and close, or no deadline), maximum score (whole number), optional short rich-text description, and individual or group. Confirm before saving. **Active** is visible to students immediately. **Draft** stays lecturer-only until you change it.
   - The list supports debounced search, status and type filters, and sort (last updated, title, opening date, score, or status, ascending or descending). On a small screen, those controls sit behind **Search & filters**. Cards use a pointer cursor and open the detail view. Use **Back to all submissions** to return.
   - **Close** locks groups and new submits. **Delete** asks you to type the submission title. Groups are removed. Student projects stay on **Project lists** with their files. The page lists those projects and their status. Accept, reject, and scoring are not available yet.
   - Group slots: set a maximum size (2–20) and either let students drag between groups or **Assign randomly** (even split, replaces the current arrangement). Random assignment is refused after any student has opened Prepare project, so an existing project is not detached from its group. You can still move students one by one, including members of a group that has already started. **Unassigned** is a separate waiting list from the group cards. On a phone, press and hold the handle, then drop on a group. **Move to** does the same job. Either way, confirm before the student changes groups. **Add groups** opens a dialog where you choose how many empty groups to create at once (up to 50 per confirmation, 200 groups on one submission). Deleting an empty group also asks for confirmation. The board shows active students, the number of groups, seats in each group, and total seats. Total seats is every group multiplied by the seats in each group, so three groups with a limit of 2 have 6 seats altogether. Search names by pausing briefly after typing (the list waits, then updates). The waiting list and the group list each have their own full-width pager, placed directly under that list, and only when that list needs another page. Long member lists scroll inside the card. Long descriptions can be expanded or collapsed. The detail header shows schedule, maximum score, and type.
7. **Scoring** is not available yet. Open a submission to see the student projects and their status. There are no accept or reject buttons.

### Admin dashboard (`/dashboard/admin`)

Dedicated administration console (not the public site header/footer):

### Student / Lecturer dashboard

- Public site header/footer (same family as the marketing site)
- Workspace menu: use the panel icon beside breadcrumbs to show/hide. On phones it opens as a solid drawer; on desktop it stays sticky beside the page (My Settings sits under Navigate, always easy to reach).
- Brand-colored welcome cards (cyan / purple / orange accents from the inkcuba logo)
- Settings at `/dashboard/settings`

### Admin console

- Dedicated admin chrome (not the public header)
- Brand-colored overview + collapsible sidebar
- **User Management** at `/dashboard/admin/users` — search, filter, sort, paginate; edit role, activation, identity, and profile photo; trash / restore / permanent remove
- **Directory Options** at `/dashboard/admin/directory` — maintain campus, major, batch, semester, and department lists used by User Management selects
- **Field Permissions** at `/dashboard/admin/field-permissions` — choose which identity fields each role may edit on My Settings
- Settings at `/dashboard/admin/settings`

#### Directory Options tips

1. Switch category with the tabs (desktop) or the category dropdown (mobile).
2. Use **search** to find options by label; results update after a short debounce. Pagination controls appear at the bottom (10 / 20 / 50 per page).
3. **Add option** only needs a label and active checkbox — the system stores the value automatically. Edit can change the label or active state, not the stored value.
4. After you **rename a label**, My Settings and User Management show the new text automatically (profiles keep the original value key).
5. Drag the **grip handle** to reorder how options appear in forms. Clear any active search before reordering.
6. **Delete** asks for confirmation; existing profile data is left as-is, but the value will no longer appear in selects.

#### Field Permissions tips

1. Open **Field Permissions** and toggle checkboxes per role (Student / Lecturer / Administrator).
2. Save to apply immediately — My Settings only offers fields you enable for that role.
3. User Management can always edit every identity field and profile photo, regardless of these toggles.

#### User Management tips

1. Open a user with **Details** to see and edit identity fields (selects come from Directory Options).
2. Edit identity IDs by role: **Student** → BINUSIAN ID / NIM; **Lecturer** → BINUSIAN ID + NIDN; **Admin** → BINUSIAN ID only.
3. Change **Role** or **Account status**, then confirm **Save changes**. Saved identity values stay in sync with that user’s My Settings (including renamed Directory Options labels).
4. Use the camera / trash controls under the avatar to replace or remove the profile photo (SeaweedFS stays in sync).
5. Inactive users cannot sign in until an admin reactivates them.
6. **Move to trash** soft-deletes for 30 days; use **Open trash** to restore or permanently remove.
7. You cannot deactivate or delete your own admin account, or remove the last active administrator.

#### My Settings (students & lecturers)

1. **Account Identity** — fields shown by role. Self-edit is controlled by Field Permissions (defaults: students read-only; lecturers may edit name + title). Campus / major / batch / semester / department always show the **current** Directory Options label.

### My Settings

**Students / Lecturers** — `/dashboard/settings`  
**Admins** — `/dashboard/admin/settings` (same features, admin console chrome)

1. **Account Identity** — students: view-only institutional fields by default. Lecturers & admins: edit fields allowed by Field Permissions (default name + title) with confirmation; other institutional fields stay admin-managed / read-only unless enabled. Full name allows common punctuation (e.g. `Manuaba, Ph.D`). Paired with Profile Photo on large screens.
2. **Profile Photo** — change/remove with confirmations; SeaweedFS stays in sync.
3. **Public Profile** (students & lecturers) — bio (up to 8,000 characters; toolbar includes Heading 1–3, bold, italic, lists, links), skills, social links, and up to 4 custom-named links (label + URL). Copy link / View public page actions are available at the top of the section.
4. **Security** + **Login History** — shown **side by side** on large screens so you do not scroll past empty space. Login history covers the last 7 days with plain-language locations (e.g. “Private network”, “This computer”) instead of raw IP strings.

A **Scroll to top** button appears on every page after you scroll down (~400px).

---

## 7. Access rules (what you can / cannot do)

| Situation | Result |
|---|---|
| Not logged in + open `/dashboard/*` | Redirected to Sign In |
| Logged in + open `/auth/sign-in`, `/auth/sign-up`, forgot/reset pages | Redirected to dashboard |
| Session expired while on dashboard | Signed out and prompted to log in again |
| Non-BINUS email on register/login | Rejected as invalid |

---

## 8. Admin operator notes (brief)

1. Seed admin with `npm run db:seed-admin`. Local workspace testing can also add 10 dummy students with `npm run db:seed-dev-students` (localhost database only; see the environment setup doc).
2. Ensure DB migrations are applied before onboarding users.
3. Keep SMTP/storage/Redis healthy (`/api/health?detailed=true`).
4. Monitor auth rate-limit behavior under abuse.

Full operator setup: [09 — Environment & Setup](./09-environment-setup.md).

---

## 9. FAQ

**Q: Can I sign in with Google?**  
No. inkcuba only supports BINUS email + password.

**Q: Why didn’t I receive an email?**  
Check spam, confirm SMTP configuration, and ensure the email is a valid BINUS address.

**Q: Why is my profile photo broken?**  
Storage may be offline, or the media proxy cannot fetch the object. Contact an admin/operator.

**Q: I checked Remember me but got logged out after days.**  
That is expected. Remember me autofills the form; session security still expires after the configured period (7 days).

**Q: Can lecturers and students use the same registration page?**  
Yes. Role is inferred from email domain.

---

## Related docs

- [01 — Product Overview](./01-product-overview.md)
- [03 — Authentication & Security](./03-authentication-security.md)
- [07 — Pages & Features](./07-pages-features.md)
