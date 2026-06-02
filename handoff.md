# Handoff

## Summary
- **Phase 1:** Auth (email/password + Google OAuth) and group creation/listing on the dashboard.
- **Phase 2:** Group detail page with Matches and Members tabs; match detail page with RSVP, expense entry and auto-split; member invite-by-email, remove, role toggle.

## Key files

### Routes
- `src/app/page.tsx` — Auth landing
- `src/app/dashboard/page.tsx` — Group list (cards link to group detail)
- `src/app/dashboard/CreateGroupPanel.tsx` — Create-group modal
- `src/app/dashboard/groups/[id]/page.tsx` — Group detail (tabs: Matches / Members)
- `src/app/dashboard/groups/[id]/MatchesPanel.tsx` — List + create match
- `src/app/dashboard/groups/[id]/MembersPanel.tsx` — List + invite/remove/role
- `src/app/dashboard/groups/[id]/matches/[matchId]/page.tsx` — RSVP + expense split

### Libs
- `src/lib/supabaseClient.ts` — Browser Supabase client (singleton)
- `src/lib/userProfile.ts` — `ensureUserProfile` upsert

### Database
- `supabase/schema.sql` — Tables + RLS + helper functions (Phase 1)
- `supabase/phase2.sql` — `invite_user_by_email`, `settle_match` security-definer RPCs (Phase 2)

## Setup requirements
1. `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` (base project URL, no `/rest/v1`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Supabase Auth: enable Google provider; add redirect URL `http://localhost:3000/dashboard` (and prod URL).
3. Run `supabase/schema.sql` in Supabase SQL editor (Phase 1) — already done.
4. **Phase 2 migration:** run `supabase/phase2.sql` in the Supabase SQL editor. Required for member invite and settle-match flows.

## How Phase 2 flows work
- **Invite member:** admin enters email → `invite_user_by_email` RPC (security definer) looks up `public.users` by email and inserts into `group_members`. Returns `{status: added|already_member|user_not_found}`. The invitee must have a Supabase auth account already.
- **RSVP:** any group member upserts into `rsvps` with `status='yes'|'no'`. Disabled when the match is `closed`.
- **Settle match:** admin enters court / shuttle / water fees → `settle_match` RPC counts current `yes` RSVPs, computes per-person split, upserts into `expenses`, sets match `status='closed'`. Returns `{attendees, total, fee_per_person}`.
- **Reopen match:** admin can flip status back to `open` from the match detail page; saved expense is kept.

## Known issues / troubleshooting
- "new row violates row-level security policy" → re-run the RLS reset SQL (helper functions + policies) in Supabase.
- "Invalid path specified in request URL" → `NEXT_PUBLIC_SUPABASE_URL` is wrong (should be the base project URL).
- Invite returns `user_not_found` → invitee must register an account first; group admins can't pre-create users client-side.

## Run / verify
- `npm install`
- `npm run dev`
- Build check: `npm run build` (green as of last verification)
- Lint: `npm run lint`

## Next steps (Phase 3 candidates)
- VietQR payment image generation per attendee on the match detail page.
- Realtime updates on RSVP list (Supabase Realtime channel on `rsvps`).
- Optional RSVP cutoff time (lock changes N hours before match start).
- Per-member running balance / debt rollup across matches.
- Email/Telegram notification when a new match is created.
