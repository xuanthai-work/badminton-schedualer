-- Profile / settings migration.
-- Adds the bank fields needed for the VietQR flow and lets users edit them
-- via the profile page. Run this in the Supabase SQL editor.
--
-- Idempotent: safe to re-run.

alter table public.users
  add column if not exists bank_id text;

alter table public.users
  add column if not exists bank_account text;

alter table public.users
  add column if not exists bank_account_name text;

-- Existing "Users can view self or group peers" SELECT policy already covers
-- read access (group peers need to see each other's bank info to pay), and
-- "Users can update own profile" lets the owner edit. No policy changes needed.
