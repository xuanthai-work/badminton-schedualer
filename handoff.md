# Handoff

## Summary
- **Phase 1:** Auth (email/password + Google OAuth) and group creation/listing on the dashboard.
- **Phase 2:** Group detail with Matches & Members tabs; match detail with RSVP + expense entry + auto-split + reopen.
- **Phase 2.5:** Stitch design port across all screens; bottom mobile nav; profile page (display name + bank + password + avatar + payment QR); group settings tab (rename + delete with type-to-confirm); Google Maps URL on matches; username-or-email sign-in.
- **Phase 2.6:** Internationalization — Vietnamese (default) + English via a client Context + `localStorage`. Every screen and shared component reads from `t()`. Language switcher on the profile page. Committed `74d7af5`.

## Key files

### Routes
- `src/app/page.tsx` — Auth landing. Username + email field on sign-in; one unified "Tên đăng nhập" field on sign-up.
- `src/app/dashboard/page.tsx` — Group list with personalized greeting + bento group cards.
- `src/app/dashboard/CreateGroupPanel.tsx` — Create-group FAB modal (sits at `bottom-24` to clear the bottom nav).
- `src/app/dashboard/groups/[id]/page.tsx` — Group detail with three tabs: Lịch đánh, Thành viên, **Cài đặt** (admin-only).
- `src/app/dashboard/groups/[id]/MatchesPanel.tsx` — List + create. Card design has date/time/location/attendees + "Chi tiết →" footer.
- `src/app/dashboard/groups/[id]/MembersPanel.tsx` — List + invite by email + role toggle + remove.
- `src/app/dashboard/groups/[id]/GroupSettingsPanel.tsx` — Admin-only: rename group + danger-zone delete.
- `src/app/dashboard/groups/[id]/matches/[matchId]/page.tsx` — Hero info card, big RSVP buttons, expense receipt, admin settle/reopen.
- `src/app/dashboard/profile/page.tsx` — Avatar upload + display-name/login edit + bank info + bank QR upload + password change + sign-out.

### Shared UI (src/components/)
- `BottomNav.tsx` — Fixed glass nav (Trang chủ → /dashboard, Tài khoản → /dashboard/profile). Active route via usePathname. Mounted on all logged-in pages.
- `DateField.tsx` — Themed button → in-DOM popover with `react-day-picker` (locale follows `useI18n().dateLocale`, Monday start). Returns `yyyy-MM-dd`.
- `TimeField.tsx` — Two-column hour/minute popover (00-23, 00-55 in 5-min steps; column labels via `t()`). Returns `HH:mm`. Auto-scrolls active item.
- `SelectField.tsx` — Themed dropdown popover, replaces native `<select>` (used for bank selector).
- `ImageUpload.tsx` — Reusable circle/square uploader with hover overlay, 5MB cap, Remove button. Uploads to `{userId}/{prefix}-{ts}.{ext}` in a Supabase Storage bucket and returns the public URL.

### Libs
- `src/lib/supabaseClient.ts` — Browser Supabase client (singleton on `globalThis.__supabase`).
- `src/lib/userProfile.ts` — `ensureUserProfile`: insert `public.users` on first sign-in, deriving `username` from metadata or email; retries with random suffix on `23505` unique-violation. (Its one rare fallback error reads `localStorage["bs.lang"]` directly to pick VI/EN, since it can't use the React hook.)

### i18n (src/lib/i18n/)
- `translations.ts` — `vi` (source of truth) + `en` dictionaries, ~180 keys in 13 namespaces (`common`, `auth`, `dashboard`, `createGroup`, `group`, `matches`, `members`, `settings`, `match`, `profile`, `nav`, `upload`, `fields`). `en` is typed `typeof vi`, so a missing/renamed key is a **compile error**. Also exports `Lang`, `LANGS`, `DEFAULT_LANG` (`vi`).
- `index.tsx` — `I18nProvider` (mounted in `app/layout.tsx`) + `useI18n()` hook returning:
  - `t(key, vars?)` — dot-path lookup with `{token}` interpolation, e.g. `t("matches.attendees", { count })`. Missing keys return the key string so they're obvious in dev.
  - `lang`, `setLang` — persisted to `localStorage["bs.lang"]`; also sets `document.documentElement.lang`.
  - `formatVnd(n)`, `formatDate(yyyyMmDd, opts?)`, `dateLocale` — all bound to the active locale (`vi-VN`/`en-US`; date-fns `vi`/`enUS` for `react-day-picker`).

### Database (run in order)
1. `supabase/schema.sql` — Tables + RLS + helper functions. Idempotent `ADD COLUMN IF NOT EXISTS` keeps it safe to re-run for the new bank/username/avatar/qr columns.
2. `supabase/reset-rls.sql` — Idempotent drop+recreate of all RLS policies. Includes the **"Group creators can view their groups"** SELECT policy that unblocks `.insert(...).select(...)` on group creation.
3. `supabase/phase2.sql` — `invite_user_by_email` + `settle_match` security-definer RPCs.
4. `supabase/profile.sql` — `bank_id`, `bank_account`, `bank_account_name` columns on `public.users`.
5. `supabase/maps.sql` — `location_url` column on `public.matches`.
6. `supabase/auth-username.sql` — `username` column + unique index, `is_username_available` + `email_for_username` RPCs (granted to anon and authenticated), backfills existing users from email prefix.
7. `supabase/storage.sql` — `avatar_url` + `bank_qr_url` columns; creates `avatars` and `bank-qr` public buckets; storage RLS (public read; owner-only insert/update/delete in folder `{auth.uid()}/`).

## Setup requirements
1. `.env.local` from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL` (base project URL, no `/rest/v1` suffix)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Supabase Auth: enable Google provider; add redirect URL `http://localhost:3000/dashboard` (and the prod URL).
3. Run the SQL migrations above in the Supabase SQL editor. All are idempotent.
4. `npm run dev` — restart whenever `.env.local` changes (the Supabase client is cached on `globalThis`).

## How key flows work

- **Sign in by username or email:** the sign-in input accepts either. If the value contains `@` it's used directly as the email; otherwise the client calls the `email_for_username` RPC to resolve the matching email, then `signInWithPassword`.
- **Sign up:** one field "Tên đăng nhập" is used as both `name` and `username`. Client validates regex `^[a-zA-Z0-9._-]{3,20}$`, calls `is_username_available` before `signUp`, and passes the value in `signUp.options.data.username`. `ensureUserProfile` reads it from user_metadata and inserts into `public.users`.
- **Invite member:** admin enters email → `invite_user_by_email` RPC (security definer) looks up `public.users` by email and inserts into `group_members`. Returns `{status: added | already_member | user_not_found}`.
- **RSVP:** any group member upserts into `rsvps` with `yes`/`no`. Disabled when match is `closed`.
- **Settle match:** admin enters fees → `settle_match` RPC counts current `yes` RSVPs, computes per-person split, upserts `expenses`, flips match to `closed`. Returns `{attendees, total, fee_per_person}`.
- **Reopen match:** admin can flip back to `open`. Saved expense is preserved.
- **Rename group:** admin types new name in Settings tab. Direct `update` on `public.groups`; parent page updates the header without reload.
- **Delete group:** admin clicks "Xóa nhóm" → modal asks to type the exact group name → `delete` cascades through `matches`/`rsvps`/`expenses` via FK on delete cascade.
- **Avatar upload:** profile page round area → file picker → uploads to `avatars/{userId}/avatar-{ts}.{ext}` → public URL saved to `users.avatar_url`. Path-with-timestamp avoids browser cache surprises.
- **Bank QR upload:** profile page square area in the bank card → uploads to `bank-qr/{userId}/qr-{ts}.{ext}` → public URL saved to `users.bank_qr_url`.
- **Language switch:** the profile page has a "Ngôn ngữ / Language" `SelectField` wired to `setLang`. Changing it persists to `localStorage["bs.lang"]` and re-renders the whole tree instantly (no reload). SSR renders the default `vi`; the stored preference applies right after mount via an effect, so an EN user sees a brief VI flash on a hard reload (accepted tradeoff for the no-URL approach).
- **Adding a string:** add the key to **both** `vi` and `en` in `translations.ts` (TS enforces this), then call `t("namespace.key")` in the component. New screens that are client components can call `useI18n()` directly; plain modules can't (read `localStorage["bs.lang"]` if absolutely needed).

## Known issues / troubleshooting
- **"new row violates row-level security policy for table 'groups'"** (42501) at group creation usually means the `Group creators can view their groups` SELECT policy is missing. PostgreSQL applies the SELECT policy to RETURNING rows on INSERT; the creator isn't in `group_members` yet at that instant. Re-run `supabase/reset-rls.sql`.
- "Invalid path specified in request URL" → `NEXT_PUBLIC_SUPABASE_URL` is wrong (should be the base project URL, not `/rest/v1/...`).
- Auth fetch errors right after editing `.env.local` → restart `npm run dev` (Supabase client cached on `globalThis`).
- Invite returns `user_not_found` → invitee must register first; admins can't pre-create users client-side.
- Native `<input type=date|time>` / `<select>` dropdowns rendered in odd positions in Chrome DevTools mobile emulation — already replaced with custom popovers, but if you re-introduce a native one, add `style={{ colorScheme: 'dark' }}` and expect dev-tools-only positioning weirdness.
- Profile QR/avatar uploads failing with "row-level security" — `supabase/storage.sql` not run, or bucket missing. Re-run.

## Run / verify
- `npm install`
- `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Next steps (Phase 3 candidates)
- i18n polish: persist language in `public.users` (per-account, not just per-device); add a 3rd language by dropping in a new dictionary + extending `LANGS`/`Lang`; localize match/expense memo strings if VietQR is wired.
- Wire the avatar into the dashboard greeting + group cards + member list + RSVP list.
- Show admin's bank QR + bank info on the match detail page when match is closed (the "MỞ GOOGLE MAPS" pill is already in place as a precedent for header link pills).
- VietQR per-attendee dynamic generator (`img.vietqr.io`) using admin's stored bank info + per-person amount.
- Per-member balance rollup ("Công nợ của tôi") across closed matches on the dashboard.
- Realtime updates on RSVP list via Supabase Realtime channel on `rsvps`.
- RSVP cutoff window (lock edits N hours before match start).
- Email/Telegram notification when a new match is created.
