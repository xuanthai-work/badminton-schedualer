# Handoff

## Summary
- Phase 1 auth + group management is implemented (auth landing at `/`, dashboard at `/dashboard`).
- Supabase client and user profile upsert are wired.
- Group list + create group flow is wired and styled per the dark/glass UI.
- RLS policy reset script provided to fix group creation recursion issues.

## Key files
- `src/app/page.tsx` (Auth landing UI + login/register/OAuth)
- `src/app/dashboard/page.tsx` (Dashboard + group list)
- `src/app/dashboard/CreateGroupPanel.tsx` (Create group UI + logic)
- `src/lib/userProfile.ts` (upsert `public.users`)
- `src/app/globals.css` (theme + glass panel utility)
- `src/lib/supabaseClient.ts` (client)
- `supabase/schema.sql` (tables + RLS)

## Setup requirements
1. Ensure `.env.local` has:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Supabase Auth:
   - Enable Google provider
   - Add redirect URL: `http://localhost:3000/dashboard` (and production URL)
3. Run `supabase/schema.sql` in Supabase SQL editor (already done by user).
4. Ensure `NEXT_PUBLIC_SUPABASE_URL` is the base URL (no `/rest/v1`).

## Known issues / troubleshooting
- If `new row violates row-level security policy for table "groups"` appears, re-run the RLS reset SQL (functions + policies) in Supabase.
- If you see `Invalid path specified in request URL`, the Supabase URL is wrong (should be the base project URL).

## Run
- `npm install`
- `npm run dev`

## Next steps (Phase 2)
- Matches CRUD + RSVP flow
- Expenses + cost split
- Group member management (invite/remove)
