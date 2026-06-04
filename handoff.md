# Handoff

## Summary
- **Phase 1:** Auth (email/password; Google OAuth later removed — see Phase 2.18) and group creation/listing on the dashboard.
- **Phase 2:** Group detail with Matches & Members tabs; match detail with RSVP + expense entry + auto-split + reopen.
- **Phase 2.5:** Stitch design port across all screens; bottom mobile nav; profile page (display name + bank + password + avatar + payment QR); group settings tab (rename + delete with type-to-confirm); Google Maps URL on matches; username-or-email sign-in.
- **Phase 2.6:** Internationalization — Vietnamese (default) + English via a client Context + `localStorage`. Every screen and shared component reads from `t()`. Language switcher on the profile page. Committed `74d7af5`.
- **Phase 2.7:** Invite by username or email; profile tag (`@username#0000`, set-once); friends system (add by `username#tag`, requests, accept/decline, friends list at `/dashboard/friends`, quick-invite friends into a group from the Members tab). Group invites restricted to accepted friends.
- **Phase 2.8:** Realtime — the match detail page updates live (RSVPs, settle/reopen, expense) via Supabase Realtime. In-app notifications — new-match and added-to-group triggers write `notifications` rows; a header bell on the dashboard shows a live unread badge; `/dashboard/notifications` lists them and marks them read.
- **Phase 2.9:** Group invites now require the invitee's approval (admin invite → pending `group_invites` row + notification → invitee accepts/declines on the dashboard; no force-add). Payment surface on a closed match — shows the group creator's uploaded QR if they added one, otherwise the bank name / account / holder / memo as copyable text (no auto-generated QR), plus the per-person amount.
- **Phase 2.10:** Payment tracking — settling a match seeds `payments` rows (unpaid) for attendees; a member taps "Tôi đã CK" (→submitted), an admin confirms (→confirmed, notifies the member). Live status list on the match detail; a "Công nợ của tôi" widget on the dashboard. Notifications bell now sits on all 3 nav pages; friend request/accept generate notifications too (no forced popup).
- **Phase 2.11:** Debts detail — dashboard "Công nợ của tôi" card redesigned (Cần đóng + Chờ thu + "Thanh toán ngay") and links to a new `/dashboard/debts` page with "Tôi nợ" (pay) + "Chờ thu" (admin/creator confirms) tabs; **Công nợ added as a 4th bottom-nav tab**. Payment QR card no longer auto-generates VietQR (uploaded QR or text only).
- **Phase 2.12:** Dashboard-centric matches — the group page's "Lịch đánh" tab was **removed**; matches now live on the dashboard nested under each (compact) group card: upcoming open matches, a collapsible "Lịch đã chốt (N)" list with admin-only delete, and a "+ Tạo lịch" FAB (group picker when admin of 2+ groups). Matches gained a **time range** (`match_end_time`). The match-detail back button follows browser history.
- **Phase 2.13:** Money polish — settle inputs are in **thousands** (type 300 → 300.000 ₫ live preview); the expense + payment cards merged into one (costs → per-person bar → payee bank/QR); the **group creator (payee) is auto-confirmed** and shown as "Người thu" (never self-confirms).
- **Phase 2.14:** Add-attendee flow — admin adds a group member to a (closed) match → the member confirms via a banner + notification (`pending` rsvp) → on "yes" the split **auto-recomputes** (`recompute_split`). Replaces the old "Mở lại lịch" reopen button.
- **Phase 2.15:** Installable **PWA** — `manifest.ts` (standalone, start `/dashboard`), code-generated icons, apple meta, safe-area handling; an **auto-update prompt** (deploy SHA via `/api/version` + `UpdatePrompt` banner — no reinstall needed); a dashboard **tag-reminder banner** for users without a tag.
- **Phase 2.16:** **Web push notifications** — `public/sw.js`, `push_subscriptions` table, opt-in `PushToggle` on the profile, `/api/push/notify` (web-push + VAPID on Vercel) fed by a Supabase **Database Webhook** on `notifications` inserts. Verified end-to-end on Android (FCM).
- **Phase 2.17:** Inline **quick-RSVP** — unanswered upcoming matches on the dashboard show "Có lịch mới — bạn tham gia chứ?" with Tham gia/Nghỉ buttons (optimistic, in place). Plus first-visit onboarding prompts (install PWA + enable push) and the profile dropdown z-order fix.
- **Phase 2.18:** **Google sign-in removed** — the unverified OAuth consent screen showed users a "this app doesn't comply with Google policies" warning. Auth is email/password only (username-or-email sign-in unchanged). Legacy Google-only accounts need an admin-set password (Auth admin API); also disable the Google provider in the Supabase dashboard.
- **Phase 2.19:** UX round — new slogan ("Cầu lông đi mà ^^"); tap a **group member → anchored profile popover** (avatar, `@username#tag`, joined date, smart friend action: add / pending / accept); the **notification bell opens an in-place popover** on every page (auto mark-read, rows deep-link) and the standalone notifications page was deleted; admins can **edit a match** after creation (date/time/venue/court/maps via `EditMatchPanel`); optional **`court_no`** column + number input; match info card redesigned (two-column header, **relative day label** "Hôm nay/Ngày mai/{thứ} tuần này/tuần sau", full-width **static-map preview** via `/api/link-preview`).

## Key files

### Routes
- `src/app/page.tsx` — Auth landing. Username + email field on sign-in; one unified "Tên đăng nhập" field on sign-up; "Quên mật khẩu?" swaps the card to a send-reset-link form (email or username).
- `src/app/reset-password/page.tsx` — recovery-link landing: waits for the Supabase session from the URL hash (`detectSessionInUrl`), shows invalid/expired state, new-password + confirm form → `auth.updateUser` → dashboard.
- `src/app/dashboard/page.tsx` — Dashboard hub: greeting, tag-reminder banner, debts card, pending group invites, and the group list with each group's matches **nested beneath it** (upcoming open matches with inline quick-RSVP; collapsible closed matches with admin delete). Live via a `matches` realtime channel.
- `src/app/dashboard/CreateGroupPanel.tsx` — Create-group FAB modal (safe-area-aware offset above the bottom nav).
- `src/app/dashboard/CreateMatchPanel.tsx` — "+ Tạo lịch" FAB (admins only): date + start/end time + location + optional court number (free number input, 1-99) + maps link; group `SelectField` appears when admin of 2+ groups.
- `src/app/dashboard/groups/[id]/page.tsx` — Group detail with **two** tabs: Thành viên (default) + **Cài đặt** (admin-only). The matches tab was removed — matches live on the dashboard.
- `src/app/dashboard/groups/[id]/MatchesPanel.tsx` — **dead code** (no longer imported); kept for reference after the matches-tab removal.
- `src/app/dashboard/groups/[id]/MembersPanel.tsx` — List + invite by email + role toggle + remove. Tapping a member opens an **anchored profile popover** (avatar, `@username#tag`, joined date) with a relation-aware friend action (Kết bạn / pending / accept); the open row gets `z-10` so the `solid-panel` popover isn't painted under later glass-panel siblings.
- `src/app/dashboard/groups/[id]/GroupSettingsPanel.tsx` — Admin-only: rename group + danger-zone delete.
- `src/app/dashboard/groups/[id]/matches/[matchId]/page.tsx` — Info card with a two-column header (relative day label "Hôm nay / Ngày mai / {thứ} tuần này / tuần sau" + full date left; lime time range + venue/court badge right) above a full-width `MapsPreview`; big RSVP buttons, attendance-confirm banner (when admin-added), merged expense+payment card (costs → per-person bar → payee bank/QR), payment status list ("Người thu" badge for the payee), admin settle / update-costs (fees in thousands) + "Thêm người tham gia". Back button uses browser history.
- `src/app/dashboard/groups/[id]/matches/[matchId]/EditMatchPanel.tsx` — admin-only "Sửa" button (header, next to the status pill) → modal to edit date, time range, venue, court number, maps link. Plain `matches` UPDATE (RLS already allows group admins); other viewers refresh via the existing realtime channel.
- `src/app/dashboard/groups/[id]/MembersPanel.tsx` — also has an admin-only "Mời từ bạn bè" quick-invite that lists accepted friends not yet in the group.
- `src/app/dashboard/friends/page.tsx` — Friends: add by `username#tag`/email, incoming requests (accept/decline), outgoing (cancel), friends list (remove).
- ~~`src/app/dashboard/notifications/page.tsx`~~ — **removed** (Phase 2.19). Notifications now live entirely in `src/components/NotificationBell.tsx`: the bell (every nav-page header, live unread badge via Realtime) opens a `solid-panel` popover with the latest 20 — text rendered from `type`+`data` via i18n, auto mark-all-read on open, each row deep-links to its target (match / group / dashboard for pending invites / friends page).
- `src/app/dashboard/debts/page.tsx` — Công nợ detail: "Tôi nợ" tab (my outstanding payments + Tôi đã CK) and "Chờ thu" tab (owed to me in groups I created + Xác nhận; shown only when non-empty). Uses `get_my_debts` / `get_owed_to_me` + `submit_payment` / `confirm_payment`.
- `src/app/dashboard/groups/[id]/matches/[matchId]/page.tsx` — also subscribes to Realtime (`rsvps`/`matches`/`expenses` for this match) and refetches on change.
- `src/app/dashboard/profile/page.tsx` — `@username#tag` handle + set-once tag picker, avatar upload, display-name/login edit, bank info + QR upload, password, language switch, sign-out.

### Shared UI (src/components/)
- `BottomNav.tsx` — Fixed glass nav, 4 items: Trang chủ → /dashboard, Công nợ → /dashboard/debts, Bạn bè → /dashboard/friends, Tài khoản → /dashboard/profile. Active route via usePathname. Mounted on all logged-in pages.
- `DateField.tsx` — Themed button → in-DOM popover with `react-day-picker` (locale follows `useI18n().dateLocale`, Monday start). Returns `yyyy-MM-dd`.
- `TimeField.tsx` — Two-column hour/minute popover (00-23, 00-55 in 5-min steps; column labels via `t()`). Returns `HH:mm`. Auto-scrolls active item.
- `SelectField.tsx` — Themed dropdown popover, replaces native `<select>` (used for bank selector).
- `ImageUpload.tsx` — Reusable circle/square uploader with hover overlay, 5MB cap, Remove button. Uploads to `{userId}/{prefix}-{ts}.{ext}` in a Supabase Storage bucket and returns the public URL.
- `UpdatePrompt.tsx` — polls `/api/version` (mount / focus / every 60s) and shows an "update available → reload" banner when the live deploy SHA differs from the bundle's baked `NEXT_PUBLIC_APP_VERSION`.
- `PushToggle.tsx` — profile section to opt in/out of web push: registers `/sw.js`, subscribes with the VAPID public key, persists to `push_subscriptions`.
- `MapsPreview.tsx` — full-width static-map preview for a match's maps link (image resolved through `/api/link-preview`, the whole card opens the link, small open-maps tag overlaid bottom-right); falls back to a plain link pill while loading/unavailable.
- Picker popovers (`DateField`/`TimeField`/`SelectField`) use the **opaque `.solid-panel`** utility (globals.css) — the translucent `glass-panel` was unreadable when stacked. The react-day-picker lime theme is intentionally **unlayered** CSS so it beats the library's own stylesheet (layered styles lose to unlayered).

### PWA & push infrastructure
- `src/app/manifest.ts` — standalone display, `start_url: /dashboard`, dark theme; icons point at the generated `/icon`.
- `src/app/icon.tsx` / `src/app/apple-icon.tsx` — `ImageResponse`-generated lime "BS" icons (512 / 180); no binary assets.
- `src/app/layout.tsx` — `appleWebApp` metadata + `viewport` export (theme color, `viewport-fit: cover`, locked zoom); safe-area padding via `globals.css` (standalone mode) + the bottom nav.
- `next.config.ts` — bakes `VERCEL_GIT_COMMIT_SHA` into `NEXT_PUBLIC_APP_VERSION` for the update check.
- `src/app/api/version/route.ts` — no-store; returns the live deploy's commit SHA.
- `public/sw.js` — service worker for push + notificationclick only (no offline caching, so no stale-bundle risk).
- `src/app/api/push/notify/route.ts` — Node runtime; validates `x-webhook-secret`, reads the target user's `push_subscriptions` via the **service role**, fans out web-push (VI copy per notification type), prunes dead (404/410) subs.
- `src/app/api/link-preview/route.ts` — fetches a **Google Maps** link server-side and returns its `og:image` (a static map of the location) for `MapsPreview`. Hosts allowlisted to Google/`maps.app.goo.gl` only (re-checked after redirects), 8s timeout, CDN-cached 7 days. Google doesn't expose place name/address to server fetches — that would need the paid Places API.

### Libs
- `src/lib/supabaseClient.ts` — Browser Supabase client (singleton on `globalThis.__supabase`).
- `src/lib/userProfile.ts` — `ensureUserProfile`: insert `public.users` on first sign-in, deriving `username` from metadata or email; retries with random suffix on `23505` unique-violation. (Its one rare fallback error reads `localStorage["bs.lang"]` directly to pick VI/EN, since it can't use the React hook.)

### i18n (src/lib/i18n/)
- `translations.ts` — `vi` (source of truth) + `en` dictionaries, ~300 keys in 19 namespaces (`common`, `auth`, `dashboard`, `createGroup`, `createMatch`, `group`, `matches`, `members`, `settings`, `match`, `profile`, `nav`, `update`, `push`, `upload`, `fields`, `friends`, `notifications`, `debts`). `en` is typed `typeof vi`, so a missing/renamed key is a **compile error**. Also exports `Lang`, `LANGS`, `DEFAULT_LANG` (`vi`).
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
8. `supabase/profile-tag.sql` — `tag text` column on `public.users` + `users_tag_format` CHECK (`^[0-9]{4}$`, nullable). Decorative discriminator; no backfill (users pick once). Also folded into `schema.sql`.
9. `supabase/friends.sql` — `friendships` table (requester/addressee/status, unique unordered-pair index) + RLS (SELECT own rows only; no client writes) + RPCs `send_friend_request`, `respond_friend_request`, `remove_friend`, `get_friends`.
10. `supabase/invite-username.sql` — `invite_user_by_identifier(group_id, identifier)` RPC (matches email when `@` present, else `lower(username)`). **Run after `friends.sql`** — it references `public.friendships` to enforce that you can only invite accepted friends (`not_friend` otherwise). Re-run this file if you ran it before `friends.sql` existed.
11. `supabase/realtime.sql` — adds `rsvps`/`matches`/`expenses` to the `supabase_realtime` publication + `replica identity full`. Enables live match-detail updates.
12. `supabase/notifications.sql` — `notifications` table + RLS (own select/update/delete; no client insert) + triggers `notify_match_created` (after insert on `matches`) and `notify_added_to_group` (after insert on `group_members`, skips self) + adds `notifications` to the realtime publication.
13. `supabase/group-invites.sql` — **run after `friends.sql` + `notifications.sql`.** `group_invites` table + RLS; **rewrites `invite_user_by_identifier`** to create a pending invite + notification (returns `invited | already_invited | already_member | not_friend | user_not_found`) instead of adding directly; `respond_group_invite(id, accept)` (invitee only → joins group + notifies inviter, or declines); `get_group_invites()` enriched list. Supersedes the direct-add behaviour in `invite-username.sql`.
14. `supabase/payments.sql` — **run after `phase2.sql` + `notifications.sql`.** `payments` table (`(match_id,user_id)`, amount, status unpaid/submitted/confirmed) + RLS (group members read; RPC-only writes) + realtime. **Redefines `settle_match`** to also seed payment rows. RPCs: `submit_payment`, `confirm_payment` (+ `payment_confirmed` notification), `get_payment_summary`. The latest version also **auto-confirms the payee's (group creator's) own row** on settle + a one-time backfill — re-run this file if you ran an older copy.
15. `supabase/debts.sql` — **run after `payments.sql`.** Read-only RPCs for the debt views: `get_debt_overview` (dashboard card), `get_my_debts` ("Tôi nợ"), `get_owed_to_me` ("Chờ thu" = unconfirmed payments by others in groups you created).
16. `supabase/match-end-time.sql` — nullable `match_end_time time` on `matches` (time ranges). Also folded into `schema.sql`.
17. `supabase/match-attendees.sql` — **run after `payments.sql` + `notifications.sql`.** Adds `'pending'` to the rsvps status CHECK; `recompute_split` (re-splits from the saved totals + current yes-attendees, preserves paid statuses, payee stays confirmed); `admin_add_attendee` (pending rsvp + `attendance_request` notification); `confirm_attendance` (pending → yes/no, auto-recompute on yes, notifies the payee via `attendance_confirmed`).
18. `supabase/push.sql` — `push_subscriptions` table + RLS (own rows only). Pair with the Database Webhook (see Setup).
19. `supabase/court-number.sql` — nullable `court_no smallint` (CHECK 1-99) on `matches`. Also folded into `schema.sql`. ⚠️ The match pages select this column — run it **before** deploying Phase 2.19.

> Status check (2026-06-03): 1-18 confirmed applied on the live project (probed columns/tables/RPCs via the service role). #19 added 2026-06-04 — verify it has been run.

## Setup requirements
1. `.env.local` from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL` (base project URL, no `/rest/v1` suffix)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. ~~Supabase Auth: Google provider~~ — **removed** (Phase 2.18). Disable the Google provider in the dashboard; no Google Cloud setup needed anymore.
3. Supabase **URL Configuration**: Site URL = the Vercel domain (`https://badminton-scheduler-gilt.vercel.app`); Redirect URLs include `https://<app>/**` **and** `http://localhost:3000/**` — otherwise `redirectTo` is ignored and OAuth falls back to the Site URL.
4. Run the SQL migrations above in the Supabase SQL editor. All are idempotent.
5. **Web push** (live and verified): five extra env vars in Vercel (+ `.env.local`) — `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (see `.env.example`); run `supabase/push.sql`; create a Supabase **Database Webhook**: `notifications` INSERT → POST `https://<app>/api/push/notify` with headers `Content-type: application/json` + `x-webhook-secret: <PUSH_WEBHOOK_SECRET>`. ⚠️ `NEXT_PUBLIC_*` vars are baked at **build** time — redeploy after changing them.
6. `npm run dev` — restart whenever `.env.local` changes (the Supabase client is cached on `globalThis`).

## How key flows work

- **Sign in by username or email:** the sign-in input accepts either. If the value contains `@` it's used directly as the email; otherwise the client calls the `email_for_username` RPC to resolve the matching email, then `signInWithPassword`.
- **Sign up:** one field "Tên đăng nhập" is used as both `name` and `username`. Client validates regex `^[a-zA-Z0-9._-]{3,20}$`, calls `is_username_available` before `signUp`, and passes the value in `signUp.options.data.username`. `ensureUserProfile` reads it from user_metadata and inserts into `public.users`.
- **Invite member (acceptance required):** admin enters a **username or email** → `invite_user_by_identifier` resolves the user (email if `@`, else `lower(username)`), enforces accepted-friend, and creates a **pending `group_invites` row + a `group_invite` notification** — it no longer adds the person directly. Returns `{status: invited | already_invited | already_member | not_friend | user_not_found}`. The invitee sees the pending invite on their dashboard and calls `respond_group_invite(id, accept)`: accept → inserted into `group_members` + the inviter gets a `group_invite_accepted` notification; decline → invite deleted.
- **Payment (closed match):** the match detail fetches the **group creator's** bank fields (RLS allows reading group peers). Renders the admin's uploaded `users.bank_qr_url` **only if they uploaded one**; otherwise shows the bank name (label from `src/lib/banks.ts`) / account number / holder / memo as copyable text — **no dynamic QR is generated** (we deliberately don't call `img.vietqr.io`). Empty state if the creator set no bank info.
- **Payment tracking:** `settle_match` seeds `payments` rows (`unpaid`) for the yes-attendees at the per-person amount. On the closed match, a "Trạng thái thanh toán" list shows each attendee's status; the member taps **Tôi đã CK** (`submit_payment` → `submitted`) and an admin taps **Xác nhận** (`confirm_payment` → `confirmed`, notifies the member) or **Hủy** (→ unpaid). Live via the match's realtime channel (payments added to it). The dashboard's **Công nợ của tôi** widget sums `get_payment_summary()` (unpaid = "Cần đóng", submitted = "Chờ duyệt").
- **Profile tag:** decorative `#0000` discriminator (username stays globally unique). Set **once** via a direct `update` on `users.tag` (client-enforced single-write — there is no server lock yet, see Known issues). Shown as `@username#tag`. Changing later is meant to go through the admin (contact email shown on the profile).
- **Friends:** `send_friend_request(identifier)` resolves `username#tag` / `username` / `email` to a user, inserting a `pending` friendship (or auto-accepting if the target already requested you). `respond_friend_request(id, accept)` (addressee only) accepts/declines; `remove_friend(id)` unfriends or cancels an outgoing request. `get_friends()` returns the enriched list (friend / incoming / outgoing) joined to each other user's profile — needed because the `users` SELECT policy only exposes self + group peers.
- **Quick-invite friends to a group:** Members tab (admin) calls `get_friends()`, filters out current members, and invites a chosen friend via `invite_user_by_identifier` using their username.
- **Live match detail:** on mount the match page opens a Supabase Realtime channel (`match-{id}`) listening to `postgres_changes` on `rsvps`/`matches`/`expenses` filtered to the match, and refetches on any event. RLS still gates delivery (only group members receive events). Channel is removed on unmount.
- **Notifications:** rows are written by DB triggers (new match → group members minus creator; added to group → the added user) and by RPCs (`group_invite`/`group_invite_accepted` from the invite RPCs; `friend_request`/`friend_accepted` from the friend RPCs). `NotificationBell` shows the unread count and subscribes to Realtime (per-mount unique channel; RLS scopes to the owner so no filter needed). It's mounted in the header of the nav pages (dashboard, debts, friends, profile). Since Phase 2.19 the bell opens an **in-place popover** (no separate page): latest 20 rows rendered from `type`+`data` (structured, not localized), auto mark-all-read on open, each row routes to its target (match / group / dashboard for pending group invites / `/dashboard/friends` for friend types). No forced popup — the badge is the only nudge.
- **RSVP:** any group member upserts into `rsvps` with `yes`/`no`. Disabled when match is `closed`. On the dashboard, unanswered upcoming matches show inline **Tham gia/Nghỉ** quick-RSVP (optimistic upsert, rolls back on error); the row body still links to the match.
- **Create match (dashboard FAB):** admins only; date + **start/end time** (end must be after start) + location + maps link; a group picker appears when admin of 2+ groups. Inserting fires the `match_created` trigger → bell + push for other members, and the match appears under its group live.
- **Settle match:** admin enters fees **in thousands** (300 → 300.000 ₫; ×1000 on submit, ÷1000 on load) → `settle_match` RPC counts current `yes` RSVPs, computes per-person split, upserts `expenses`, flips match to `closed`, seeds `payments` (payee auto-confirmed). Returns `{attendees, total, fee_per_person}`.
- **Update costs (closed match):** "Cập nhật chi phí" re-runs `settle_match` — amounts refresh, payment statuses are preserved. The old reopen button was removed.
- **Add attendee (closed match):** admin picks a member in "Thêm người tham gia" → `admin_add_attendee` writes a `pending` rsvp + `attendance_request` notification (+push) → the member confirms via the banner on the match page → `confirm_attendance(yes)` flips them to `yes` and `recompute_split` re-splits and reseeds payments automatically; the payee gets `attendance_confirmed`.
- **Delete match:** admins can delete a **closed** match from its row on the dashboard (confirm dialog; FK cascade wipes rsvps/expenses/payments/notifications).
- **PWA & updates:** installable via the manifest (standalone, opens at `/dashboard`). `UpdatePrompt` compares the baked deploy SHA against `/api/version` and offers a one-tap reload — users never reinstall for new versions (reinstall only if the manifest/icons change).
- **Web push:** opt-in per device on the profile (`PushToggle`). A Database Webhook fires on every `notifications` INSERT → `/api/push/notify` fans out via web-push/VAPID to that user's subscriptions. Android works even in the browser; iOS needs the installed PWA (16.4+). The actor never gets their own push (triggers skip self).
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
- Invite / friends / tag features throwing "function ... does not exist" or "column tag does not exist" → run the new migrations (`invite-username.sql`, `profile-tag.sql`, `friends.sql`).
- Live updates / notifications not arriving → run `realtime.sql` + `notifications.sql`. Realtime only delivers rows the subscriber can SELECT under RLS, so a non-member won't see a match's events (by design). Notifications need the triggers installed — they fire on `matches` / `group_members` inserts.
- **Tag lock is client-side only:** a user could still PATCH their own `users.tag` directly (RLS allows updating own row). If the set-once lock must be enforced, move tag-setting into a `set_tag` RPC that rejects a second write.
- **Push toggle says "không hỗ trợ" on Android** → the deployed build predates the `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env var (it's baked at build) — redeploy, then close/reopen the app (stale JS).
- **No pushes arriving** → check, in order: `push_subscriptions` has rows (each device must opt in via the profile toggle); the Database Webhook exists with the exact `x-webhook-secret`; and remember the **actor never gets their own push**. `curl -X POST /api/push/notify` with the secret + a dummy record returns `{"sent":N}` and is a quick server-side health check.
- **iOS push/PWA:** push only works from the installed home-screen PWA (iOS 16.4+), opened from its icon.
- **Tailwind v4 layering:** custom rules inside `@layer` lose to unlayered library CSS (this bit the react-day-picker theme). Keep third-party overrides unlayered, after the `@import`.

## Run / verify
- `npm install`
- `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## ▶ Next step (recommended)

**Production readiness — custom SMTP.** The core product loop (schedule → RSVP → split → track payment → debts) is feature-complete, so the highest-value next move is making it safe for real users:

1. **Custom SMTP** in Supabase (Authentication → Emails → SMTP) with a provider (Resend / SES / Postmark). The built-in mailer is rate-limited to a few/hour — it tripped us during testing.
2. **Re-enable "Confirm email"** (turned off during dev to dodge that rate limit) so addresses are verified.
3. ~~Password-reset flow~~ ✅ shipped 2026-06-04: "Quên mật khẩu?" on the sign-in card (accepts email **or** username via `email_for_username`) → `resetPasswordForEmail` with `redirectTo` → `/reset-password` page (waits for `detectSessionInUrl` to process the recovery hash, handles `#error=` expired links, then `auth.updateUser({password})` → dashboard). ⚠️ Delivery still rides the rate-limited built-in mailer until SMTP is set up.
4. ~~Lock down Supabase URL config~~ ✅ done 2026-06-03 (Site URL → Vercel domain, `/**` wildcards for prod + localhost — also what allows the `/reset-password` redirect).

This is mostly Supabase dashboard + a provider account; little app code. A good quick win to pair with it: **notify the payee when a member submits a payment** (first item below) — it would ride the existing push pipeline for free.

After that, pick from the candidates below.

## Next steps (Phase 3 candidates)
- Notify the admin/payee when a member submits a payment (a `payment_submitted` notification insert in `submit_payment` would automatically reach the bell **and** push).
- Let the settling admin (not just the group creator) be the payee.
- Production readiness: custom SMTP (reliable reset/confirmation delivery + re-enable email confirmation); RSVP cutoff + match reminders (reminders could be a Supabase cron → `notifications` insert → push).
- More notification types (match settled); fold friend requests into the bell.
- Enforce the tag set-once lock server-side (`set_tag` RPC), and/or let users change it; show `@username#tag` in more places (dashboard greeting, member rows, RSVP rows).
- i18n polish: persist language in `public.users` (per-account, not just per-device) — would also let `/api/push/notify` localize push copy (currently VI-only); add a 3rd language by dropping in a new dictionary + extending `LANGS`/`Lang`.
- Wire the avatar (`users.avatar_url`) into the dashboard greeting + group cards + member list + RSVP list.
- Delete `MatchesPanel.tsx` (dead code) once you're sure the dashboard-centric match flow sticks.
