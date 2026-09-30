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

For student accounts. Currently shows a welcome workspace shell for upcoming portfolio tools.

### Lecturer dashboard (`/dashboard/lecturer`)

For lecturer accounts. Currently shows a review-workspace shell for upcoming course/review tools.

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
- **User Management** at `/dashboard/admin/users` — search, filter, sort, paginate; edit role, activation, and institutional identity; trash / restore / permanent remove
- **Directory Options** at `/dashboard/admin/directory` — maintain campus, major, batch, semester, and department lists used by User Management selects
- Settings at `/dashboard/admin/settings`

#### Directory Options tips

1. Switch category with the tabs (desktop) or the category dropdown (mobile).
2. Use **search** to find options by label; results update after a short debounce. Pagination controls appear at the bottom (10 / 20 / 50 per page).
3. **Add option** only needs a label and active checkbox — the system stores the value automatically. Edit can change the label or active state, not the stored value.
4. Drag the **grip handle** to reorder how options appear in forms. Clear any active search before reordering.
5. **Delete** asks for confirmation; existing profile data is left as-is, but the value will no longer appear in selects.

#### User Management tips

1. Open a user with **Details** to see and edit identity fields (selects come from Directory Options).
2. Change **Role** or **Account status**, then confirm **Save changes**.
3. Inactive users cannot sign in until an admin reactivates them.
4. **Move to trash** soft-deletes for 30 days; use **Open trash** to restore or permanently remove.
5. You cannot deactivate or delete your own admin account, or remove the last active administrator.

#### My Settings (students & lecturers)

1. **Account Identity** — students see NIM, major, batch, semester, department, title (read-only). Lecturers see NIDN, major, department, title and may edit **name** + **title** with confirmation.

### My Settings

**Students / Lecturers** — `/dashboard/settings`  
**Admins** — `/dashboard/admin/settings` (same features, admin console chrome)

1. **Account Identity** — view-only institutional fields (paired with Profile Photo on large screens).
2. **Profile Photo** — change/remove with confirmations; SeaweedFS stays in sync.
3. **Public Profile** (students & lecturers) — bio (up to 8,000 characters), skills, social links, and up to 4 custom-named links (label + URL).
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

1. Seed admin with `npm run db:seed-admin`.
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
