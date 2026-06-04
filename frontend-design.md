# Frontend Design Brief — Badminton Scheduler

> **Use this document as the prompt for Google Stitch (stitch.withgoogle.com).**
> Paste the relevant section into Stitch screen-by-screen, or paste the whole doc and ask Stitch to produce the full set.
> Design instructions are written in English. **Product copy in Vietnamese must be preserved verbatim** — Stitch should render the Vietnamese strings exactly as written so they match the shipped UI.
>
> **Localization (shipped):** the app is bilingual — **Vietnamese (default) + English** — via a client i18n layer (`src/lib/i18n/`, Context + `localStorage["bs.lang"]`). Vietnamese remains the **source of truth** for design copy; every VI string below has an EN counterpart in `translations.ts`. When designing, keep using the Vietnamese strings verbatim; the English just mirrors them. A language switcher lives on the profile page (§5.5).

---

## 1. Product summary (context for Stitch)

A mobile-first web app for Vietnamese amateur badminton clubs to schedule matches, collect RSVPs, and split the post-match bill (court + shuttlecocks + water) among attendees. Members typically use it on a phone, courtside, with bright gym lighting. The app is built with Next.js 16 (App Router) + Tailwind + Supabase. Authentication is via email/password (sign in with username or email). **Google OAuth was removed** — the unverified-app consent warning scared users; see §9. The same app handles three roles: visitor, group member, and group admin.

---

## 2. Design DNA

### 2.1 Vibe
**Sport-tech, night court, premium-amateur.** Dark mode is the default and only mode. Glassmorphism surfaces over a deep slate background, lit by a single signature **Volt Lime** accent (the color of a shuttlecock under stadium lights). The interface should feel like a high-end fitness app — closer to Strava or Whoop than a generic SaaS — but with a friendly, distinctly Vietnamese amateur-sport tone (no corporate gloss).

### 2.2 Color palette (locked — do not substitute)

| Role | Hex | Tailwind | Notes |
| --- | --- | --- | --- |
| Background | `#020617` | `bg-slate-950` | Deep night base, no gradient by default |
| Background glow (optional) | radial `rgba(163,230,53,0.18)` | — | Top-right radial only on landing/hero |
| Surface (glass) | `rgba(15,23,42,0.65)` + `backdrop-blur(12px)` + `border rgba(255,255,255,0.08)` | `.glass-panel` | Used on every card, modal, panel |
| Primary text | `#F1F5F9` | `text-slate-50` | |
| Secondary text | `#CBD5E1` | `text-slate-300` | Body copy |
| Tertiary text | `#94A3B8` | `text-slate-400` | Labels, helper text |
| **Accent — Volt Lime** | `#A3E635` text / `#84CC16` bg | `text-lime-400` / `bg-lime-500` | All primary CTAs, status pills, focus rings |
| Success (Yes) | `#34D399` | `text-emerald-400` | Attending |
| Danger (No) | `#FB7185` | `text-rose-400` | Not attending |
| Warning | `#FBBF24` | `text-amber-400` | Awaiting payment confirm |

### 2.3 Typography
- Sans-serif only. Geist Sans (already loaded). Fallback Inter / system.
- Type scale: 12 / 14 / 16 / 18 / 24 / 32. Semibold for headings, regular for body. No serifs.
- Section labels in `text-xs uppercase tracking-[0.3em] text-lime-400` (e.g. `DASHBOARD`, `← NHÓM`).

### 2.4 Shape & spacing
- Border radius scale: `rounded-xl` (12px) for inputs/small buttons, `rounded-2xl` (16px) for cards/modals, `rounded-full` for pills/avatars.
- Standard card padding: `p-5` (20px). Modal padding: `p-6`.
- Outer page padding on mobile: `px-6 py-10`. Max content width on desktop: 5xl (1024px) for dashboard, 3xl (768px) for match detail.

### 2.5 Motion (Framer Motion is available)
- Modals slide up from bottom on mobile, fade-scale on desktop. `spring`, `stiffness: 300`, `damping: 30`.
- RSVP buttons: tap → scale to 0.95, then bounce to 1.05, settle to 1.0. ~250ms total.
- Skeleton loaders use `animate-pulse` on glass panels at 60% opacity. Never use spinners.
- Status changes (e.g. RSVP yes → no) animate the avatar moving between the Yes/No columns.

### 2.6 Iconography
Lucide icons only. Stroke 1.5px. No emoji in headers; emoji is allowed inline in body copy where it adds warmth (e.g. `Tham gia ✅`).

---

## 3. Layout primitives

These appear on every screen; design them once, reuse.

### 3.1 Glass card
```
background: rgba(15,23,42,0.65)
border: 1px solid rgba(255,255,255,0.08)
backdrop-filter: blur(12px)
border-radius: 16px
```
Hover state (only on interactive cards): border becomes `border-lime-500/40`.

### 3.2 Primary button
- Filled lime: `bg-lime-500 text-slate-950 font-semibold rounded-xl px-4 py-2`.
- Hover: soft outer glow `shadow-[0_0_20px_rgba(163,230,53,0.4)]`.
- Disabled: `opacity-60`, no glow.

### 3.3 Secondary button
- `border border-slate-700 text-slate-200 rounded-xl px-4 py-2`.
- Hover: `border-slate-500`.

### 3.4 Destructive button
- `border border-rose-700/60 text-rose-300 rounded-lg px-3 py-1 text-xs`.
- Hover: `border-rose-500`.

### 3.5 Inputs
- `rounded-xl border border-slate-800 bg-slate-950/60 text-slate-100 px-3 py-2`.
- Focus: `ring-2 ring-lime-500/70`, no border color change.
- Date/time inputs and select dropdowns use **custom popover components** (`DateField`, `TimeField`, `SelectField` in `src/components/`), not native HTML pickers. Native pickers escape the viewport inside DevTools mobile emulation and break the modal experience.
  - `DateField` wraps `react-day-picker` v10 with the active i18n locale (vi/enUS), week starts Monday, lime selection.
  - `TimeField` is a two-column popover (hours 00–23, minutes 00–55 in 5-min steps), auto-scrolls active item.
  - `SelectField` is a themed dropdown popover with optional scrolling and a Check icon next to the active option.
  - All three close on outside-click and preserve `required` form validation via a hidden input.
  - Popover surface is the **opaque `.solid-panel`** (`#0F172A` + lime-tinted border) — *not* glass — so content underneath never bleeds through when a popover stacks over a modal. The `react-day-picker` lime theme (chevrons, today) lives in **unlayered** CSS so it beats the library stylesheet.

### 3.6 Status pill
- `rounded-full px-3 py-1 text-xs`.
- States:
  - Admin: `bg-lime-500/20 text-lime-300`
  - Member: `bg-slate-800 text-slate-300`
  - Open match: `bg-lime-500/20 text-lime-300` — text "Mở" / "Đang mở"
  - Closed match: `bg-slate-800 text-slate-400` — text "Đã chốt"
  - Awaiting payment: `bg-amber-500/20 text-amber-300` — text "Chờ duyệt"
  - Paid: `bg-emerald-500/20 text-emerald-300` — text "Đã thanh toán"

### 3.7 Tab bar (used inside group detail)
- Pill container: `rounded-full bg-slate-900/70 p-1`.
- Active tab: `bg-lime-500 text-slate-950 rounded-full py-2 flex-1`.
- Inactive tab: `text-slate-300 py-2 flex-1`.

### 3.8 Floating action buttons (FABs — two, stacked)
- **"+ Tạo nhóm mới"** (filled lime) sits lower; **"+ Tạo lịch"** (dark glass, lime text + lime ring; admins only) stacks above it.
- Offsets are **safe-area aware**: `bottom-[calc(6rem+env(safe-area-inset-bottom))]` and `...(10rem+...)` `right-6` — they ride up with the home-indicator inset so they never crowd the nav.
- Hover: glow `shadow-[0_0_24px_rgba(163,230,53,0.45)]` (lime FAB) / brighter ring (dark FAB).

### 3.9 Bottom mobile nav (shipped)
- Fixed glass bar, `bg-slate-950/80 backdrop-blur-xl` with a top border `border-white/10` and a faint top-glow shadow. Height = content + `pt-2` + `pb-[calc(0.5rem+env(safe-area-inset-bottom))]` (**no fixed `h-16`** — the safe-area is *added* below the labels so they never overlap the home indicator).
- Four items: **Trang chủ** (`Home` → `/dashboard`), **Công nợ** (`Wallet` → `/dashboard/debts`), **Bạn bè** (`Users` → `/dashboard/friends`), **Tài khoản** (`User` → `/dashboard/profile`).
- Active item: lime icon + lime label on a `bg-lime-500/10` rounded pill. Inactive: `text-slate-400`.
- Active-route detection via `usePathname`. `/dashboard/groups/*` is treated as "Trang chủ".

### 3.10 Image upload area (shipped)
- Reusable `ImageUpload` component. Shape `circle` or `square`, size in px.
- Empty state shows a `Camera` (circle) or `ImagePlus` (square) icon + caption inside a slate-bg rounded area.
- Filled state shows the image cover-fit. Hover overlay says **"Đổi ảnh"**.
- Below the picker: small **"Xoá ảnh"** button (rose) when an image is present.
- 5MB cap, `image/*` accept.

---

## 4. Routes (current implementation)

```
/                                              Landing / Auth (username|email + password)
/dashboard                                     Hub: groups WITH their matches nested under each + quick-RSVP + debts card
/dashboard/groups/[id]                         Group detail (tabs: Thành viên, Cài đặt — matches tab REMOVED)
/dashboard/groups/[id]/matches/[matchId]       Match detail (RSVP + costs/payment + add-attendee + Maps link)
/dashboard/friends                             Friends (add by username#tag, requests, list)
/dashboard/notifications                       Notifications list (match, group, friends, payment, attendance)
/dashboard/profile                             Handle/tag / avatar / login / bank / QR / password / language / push / sign-out
/dashboard/debts                               Công nợ detail — "Tôi nợ" + "Chờ thu" (shipped, §5.7)
```

The app is also an **installable PWA**: web manifest (standalone, opens at `/dashboard`, dark theme `#020617`), generated lime "BS" icons, translucent status bar with safe-area padding, an in-app "Đã có bản mới — Cập nhật" update banner, and opt-in **web push** (see §5.5).

Stitch should design **mobile portrait** as primary and provide a wider desktop layout as a secondary deliverable per screen.

---

## 5. Screen briefs

### 5.1 Landing / Auth (`/`)

**Purpose:** First impression. Drive sign-in.

**Layout (mobile):**
- Top: small lime-tracking label `BADMINTON SCHEDULER`.
- Large headline (32–40px): **"Chơi cầu lông không lo chia tiền."**
- Subhead (16px, slate-300): **"Lên lịch, điểm danh realtime và chia chi phí cho cả nhóm trong vài phút."**
- Below: a single glass card form.

**Form card (glass panel, 16px radius):**
- Segmented control pill at top: two tabs **"Đăng nhập" / "Đăng ký"**. Active tab has lime background.
- **Sign-in form:**
  - Single field labeled **"Tên đăng nhập hoặc email"** — placeholder `nguyenvana hoặc email@vi-du.com`. Branches on `@`.
  - **"Mật khẩu"** field.
  - Primary lime CTA **"Đăng nhập"**.
- **Sign-up form:**
  - **"Tên đăng nhập"** field — placeholder `nguyenvana`, helper text "Dùng làm tên hiển thị và để đăng nhập. 3-20 ký tự, chỉ chữ/số và . _ -".
  - **"Email"** field.
  - **"Mật khẩu"** field.
  - Primary lime CTA **"Tạo tài khoản"**. Loading: **"Đang xử lý..."**.
- A single field serves as both display name and login handle. Uniqueness checked client-side via the `is_username_available` RPC before sign-up.

**Background flourish:**
- Top-right radial volt-lime glow (existing).
- Optional: an abstract, monochrome line-art shuttlecock at low opacity, top-left, slightly tilted.

**Desktop layout:**
- Two-column: headline + value props on the left (max-width 36rem), form card on the right (max-width 28rem).

---

### 5.2 Dashboard (`/dashboard`)

**Purpose:** Show the user their groups and jump into one.

**Header:**
- Lime tracking label: **"DASHBOARD"**.
- Page title (24px semibold, lime text): **"Nhóm của tôi"**.
- **Notification bell** top-right (`Bell`, 40px rounded glass button) with a lime unread badge (count, "9+" cap) that updates live via Realtime; links to `/dashboard/notifications`. The same bell sits top-right on the **Friends** and **Tài khoản** headers too, so it's reachable from every nav page. (No forced popup — the badge is the nudge.)
- No sign-out button (moved to the profile page; reachable from bottom nav).

**Welcome section:**
- Big greeting (28px semibold): **"Chào bạn, {username}"** with the username highlighted lime. Fallback **"Chào bạn, lông thủ"** while loading.
- Subhead (slate-300): **"Sẵn sàng cho các trận đấu hôm nay?"**

**Tag reminder banner (shipped, shown until the user sets a tag):**
- Lime-tinted glass row right under the greeting: `Hash` icon box + **"Đặt tag định danh của bạn"** / **"Tạo tag như @tên#0000 để bạn bè tìm & thêm bạn."** + a lime **"Đặt tag"** chip → links to `/dashboard/profile#tag` (anchor scrolls to the tag block). Disappears once the tag is set.

**Công nợ của tôi (shipped, shown when you owe or are owed):**
- Section heading **"Công nợ của tôi"** + an `Info` icon linking to the detail. A glass card with up to two rows: **Cần đóng** (rose `Wallet`, total you owe + "{n} sân đang chờ") and **Chờ thu** (emerald `Banknote`, total owed to you + "Từ {group}"). Full-width lime **"Thanh toán ngay"** button → `/dashboard/debts` (§5.7). Sourced from `get_debt_overview`.

**Pending group invites (shipped, shown only when you have any):**
- Section **"Lời mời vào nhóm"**; each invite is a lime-tinted glass row: **"{inviter} mời bạn vào nhóm {group}"** + **"Tham gia"** (accept → joins + the row disappears) and **"Từ chối"** (decline). Group membership now requires this acceptance — admins can't force-add.

**Body — groups WITH their matches nested (shipped redesign):**
- Section header row: **"Danh sách nhóm"** on left, count chip on right (`{n} nhóm`).
- **Single-column vertical list** (not a grid). Each group is a block:
  - **Compact group row** (glass, one line, tappable → group page): lime `Users` icon box (40px) · group name (16px semibold) + **"ADMIN"/"MEMBER"** mini-pill inline · a small slate caption `{n} thành viên · {admin name}` · `ChevronRight` on the right. (The old big bento card with the avatar footer was retired.)
  - **Nested match list** below the row, indented with a left border (`ml-3 border-l border-white/10 pl-4`):
    - **Upcoming open matches** — each a `solid`/glass row: `CalendarClock` + **"{Thứ} {dd/MM} · {HH:mm} - {HH:mm}"** (time range) and `MapPin` + location. The row body links to the match.
      - **Answered:** a small status pill on the right — **"Sẽ tham gia"** (emerald) / **"Không tham gia"** (slate).
      - **Unanswered (quick-RSVP, shipped):** lime border highlight + a bottom strip: lime text **"Có lịch mới — bạn tham gia chứ?"** + inline **"Tham gia"** (lime) and **"Nghỉ"** (outline) buttons that RSVP in place (optimistic), no navigation.
    - **"Lịch đã chốt ({n})" collapsible** — a caps toggle line with `ChevronDown/Up`; expanded rows are dimmed (`opacity-70`, full on hover) with date · time-range · location, and an **admin-only rose `Trash2` delete** button (confirm dialog; cascades).
  - The whole list updates **live** (realtime on `matches`).
- Empty state: a single glass card with: **"Bạn chưa tham gia nhóm nào. Hãy tạo nhóm mới để bắt đầu."**
- Loading state: 2 skeleton cards using `animate-pulse`.

**FABs (see §3.8):**
- **"+ Tạo nhóm mới"** — create-group modal.
- **"+ Tạo lịch"** (admins only) — create-match modal: **"Ngày"** (DateField), **"Giờ bắt đầu" + "Giờ kết thúc"** (two TimeFields; end must be after start), **"Sân / Địa điểm"**, optional **"Link Google Maps (tùy chọn)"**; a **"Nhóm"** `SelectField` appears first when the user admins 2+ groups. Footer: **"Hủy"** + **"Tạo lịch"**.

**Create-group modal:**
- Glass panel, title **"Tạo nhóm mới"**, close button labeled **"Đóng"**.
- One input: label **"Tên nhóm"**, placeholder **"Ví dụ: Thứ 3 vui vẻ"**.
- Footer: secondary **"Hủy"** + primary **"Tạo nhóm"** (loading: **"Đang tạo..."**).

**Update banner (PWA, shipped):** when a newer deploy exists, a floating pill above the nav: **"Đã có bản mới của ứng dụng."** + lime **"Cập nhật"** button (`RefreshCw`) that reloads.

**Bottom nav:** mounted at the bottom of every dashboard route (see §3.9).

**(Planned, not yet built):**
- Use the user's `avatar_url` (now uploadable on the profile page) for the admin avatar on each group row instead of the initial fallback.

---

### 5.3 Group detail (`/dashboard/groups/[id]`)

**Header:**
- Small lime back-link: **"← DASHBOARD"**.
- Group name (24px semibold).
- Role pill on the right.

**Tab bar:** **two** tabs — **"Thành viên"** (Members, default) and **"Cài đặt"** (Settings, **admin-only — hidden for members**). Pill style from §3.7.

> **The "Lịch đánh" (Matches) tab was removed.** Matches are now browsed/created/deleted on the **dashboard** (§5.2) — nested under each group, with the "+ Tạo lịch" FAB and the collapsible "Lịch đã chốt" list. There is no match UI on the group page anymore.

#### 5.3.2 Members tab

- Admin-only invite card at top (glass panel, single row layout on desktop):
  - Label **"Mời thêm thành viên (email)"**.
  - Email input (placeholder `email@example.com`).
  - Primary button **"Mời"** (loading: **"Đang mời..."**).
  - Helper line under the form for status messages: **"Đã thêm thành viên." / "Người này đã có trong nhóm." / "Email chưa đăng ký tài khoản trên hệ thống."**
  - Label is now **"Mời thêm thành viên (tên đăng nhập hoặc email)"** — the field accepts a **username or email** (resolved server-side). **You can only invite accepted friends**; a non-friend returns **"Bạn chỉ có thể thêm bạn bè vào nhóm. Hãy kết bạn trước."** Inviting now **sends a pending invite** (not an instant add): success says **"Đã gửi lời mời vào nhóm."**, and **"Người này đã được mời."** if one is already pending. The invitee approves it on their dashboard.
- **Mời từ bạn bè** card (admin-only, shipped): a glass panel with a `UserPlus` heading listing the admin's accepted friends **not already in the group**, each as `name @username#tag` + a small lime **"Mời"** button that flips to a **"Đã mời"** chip once invited. Empty state when all friends are already members: **"Tất cả bạn bè đã ở trong nhóm."**
- Member list (vertical, gap 12px). Each row is a glass panel:
  - Left: name (medium) with optional **"(bạn)"** badge after own name; email below in slate-400.
  - Right: role pill (Admin / Member). If user is the group creator, append **"· Tạo nhóm"** to the pill.
  - Admin-only buttons (right of pill, hidden for the creator and for the row of the viewing admin): **"Hạ quyền"** / **"Phong admin"** (toggles based on current role) and **"Xóa"** (destructive style).

#### 5.3.3 Settings tab (admin-only)

Two glass cards stacked:

1. **Tên nhóm** card:
   - Section header: `Pencil` icon + **"Tên nhóm"**.
   - Single input pre-filled with current name; max 80 chars.
   - Primary CTA **"Lưu tên mới"** with `Save` icon. Disabled while unchanged.
   - Inline status: lime **"Đã đổi tên nhóm."** or rose error text.

2. **Vùng nguy hiểm** card (`border-rose-700/40`):
   - `AlertTriangle` + rose heading **"Vùng nguy hiểm"**.
   - Body: "Xóa nhóm sẽ **xóa vĩnh viễn** tất cả lịch đánh, RSVP, và chi phí đã ghi nhận. Hành động này **không thể hoàn tác**."
   - Rose-outlined button **"Xóa nhóm"** with `Trash2` icon.
   - Clicking opens a **type-to-confirm modal**: heading "Xóa nhóm này?" + paragraph reiterating the cascade, then a single input labeled **"Gõ tên nhóm để xác nhận"** (placeholder = the group name). The destructive button **"Xóa vĩnh viễn"** is disabled until the typed text exactly matches the group name.

---

### 5.4 Match detail (`/dashboard/groups/[id]/matches/[matchId]`)

The most important screen. Mobile-first, vertical scroll. Two visual states: **Open** and **Closed**. **Live:** the attendee lists, status pill, and receipt update in real time (Supabase Realtime) when anyone RSVPs or the admin settles/reopens — no refresh.

**Header (both states):**
- Small lime back-button with `ChevronLeft`: **"← QUAY LẠI"** — uses **browser history** (`router.back()`), so it returns to wherever the user came from (dashboard or group page); falls back to the group page on a direct URL open.
- Title **"Chi tiết trận đấu"** (28px semibold).
- Below title: `MapPin` icon + location text. If the match has a `location_url`, append a small lime pill link **"↗ MỞ GOOGLE MAPS"** (with `ExternalLink` icon, opens in new tab).
- Status pill on the right: **"Đang mở"** (emerald) or **"Đã chốt"** (slate).

**Hero info card (under header):**
- Lime-tinted rounded icon box with `Calendar` icon.
- Caps label **"THỜI GIAN"** above the prominent date + **time range** line: **"Thứ 3, 03/06/2026 · 20:00 - 22:00"** (end time shown when set).

**Attendance-confirm banner (shipped — shown only to a member an admin added, rsvp `pending`):**
- Lime-bordered glass card above the RSVP card: `UserPlus` + **"Bạn có chơi buổi này không?"** / **"Admin đã thêm bạn vào trận này. Xác nhận để được tính chia tiền."** + two buttons **"Có tham gia"** (lime) / **"Không tham gia"** (outline). Confirming "yes" **auto-recomputes the split** and notifies the payee.

#### 5.4.1 Open state

1. **Your RSVP card** (glass panel):
   - Heading (centered, 18px semibold): **"Bạn có tham gia không?"**
   - Two side-by-side icon buttons, full-width split 50/50, large tap targets (5-unit vertical padding):
     - **"Tham gia"** — `CheckCircle2` icon stacked above label. Active = filled lime with strong glow.
     - **"Nghỉ"** — `XCircle` icon stacked above label. Active = filled rose.
     - Inactive state for either: white/10 border on slate panel, hover border in the tone color.

2. **Attendee lists** (2-column grid on desktop, stacked on mobile):
   - Card A: heading `Tham gia ({n})` in lime tracking caps. List of names below.
   - Card B: heading `Nghỉ ({n})` in rose tracking caps. List of names below.
   - Empty state inside each card: **"Chưa có ai."**
   - When a user changes RSVP, their name pill animates from one card to the other (motion §2.5).

3. **Admin settle panel** (admin only, glass card):
   - Heading **"Chốt chi phí"** (when match is open) — see closed state for the alternate heading.
   - Fee inputs are **in thousands**: a full-width **"Tiền sân (VND)"** then **"Tiền cầu"** + **"Tiền nước"** side by side. Each has a small slate **"nghìn"** suffix inside the field and a live lime preview underneath: typing `300` shows **"= 300.000 ₫"** (×1000 on submit; ÷1000 when loading saved fees). Placeholders `400` / `150` / `50`.
   - Helper line: **"Hệ thống sẽ chia cho {n} người tham gia."**
   - Primary CTA (full-width): **"Chốt và chia tiền"** (loading: **"Đang lưu..."**).
   - Success message in lime: **"Đã chốt: {n} người · {amount} ₫ / người"**.

#### 5.4.2 Closed state

All elements above remain visible (for transparency), but:

1. **Your RSVP card** shows a slate-400 helper: **"Lịch đã đóng. Không thể đổi RSVP."** (Buttons disabled or hidden.)

2. **Merged Chi phí + Thanh toán card** (shipped — ONE glass panel, in this order):
   - Heading **"Chi phí"** (`ReceiptText`), then key/value rows: **"Tiền sân" / "Tiền cầu" / "Tiền nước"** + a **"Tổng"** subtotal row with top border.
   - Highlighted lime callout (`bg-lime-500/10`): **"Mỗi người trả {amount} ₫"** — a **single** bar (no duplicate).
   - Below a divider, the **"Thanh toán"** block (`QrCode` heading) — payee bank/QR details (see §5.4.3).
   - Format all amounts in VND with no decimals: `670.000 ₫`.

3. **Admin settle panel** swaps to:
   - Heading **"Cập nhật chi phí"** — same thousands inputs, pre-filled (÷1000) with stored values; primary CTA **"Cập nhật chi phí"**. **There is no "Mở lại lịch" button anymore** — late changes go through "Thêm người tham gia" instead.

4. **"Thêm người tham gia" card** (admin only, shipped):
   - `UserPlus` heading + helper **"Chọn thành viên đã chơi buổi này. Họ cần xác nhận trước khi được tính tiền; chia tiền sẽ tự cập nhật."**
   - A `SelectField` of group members not already in/awaiting + a lime **"Thêm"** button.
   - Below: pending people listed with an amber **"Chờ xác nhận"** pill. The added member gets a notification (+push) and the confirm banner (§5.4 header note); on "Có tham gia" the split re-computes automatically.

#### 5.4.3 Payment section (shipped)

When the match is closed, the **"Thanh toán"** block (inside the merged card, §5.4.2) renders the **group creator's** payment info: their **uploaded QR only if they added one** (we deliberately do **not** auto-generate a VietQR), plus bank name / account number / holder / memo as **copyable** text. Empty state if no bank info: **"Quản trị viên chưa thiết lập thông tin thanh toán."**

Below it, a **"Trạng thái thanh toán"** list (shipped) shows each attendee with a status pill — **Chưa đóng** (slate) / **Chờ duyệt** (amber) / **Đã thanh toán** (emerald) — and the amount. **The payee (group creator) is special-cased:** their row shows a lime **"Người thu"** pill and no buttons — they are auto-confirmed on settle and never self-confirm. The viewer's own unpaid row has a lime **"Tôi đã CK"** button; an admin sees **"Xác nhận"** on other members' pending rows (and **"Hủy"** to undo). Updates live via Realtime. Source detail:

**Payment info source:** the **group creator's** profile. If `users.bank_qr_url` is set, render that uploaded QR image inside the card with a **"Quét mã QR để chuyển khoản"** caption. **No dynamic VietQR is generated** — we don't call `img.vietqr.io`. Always show the bank name / account number / holder / memo as text, with **copy** buttons on the account number and the transfer memo (`Cau long {match-date}`). The memo is plain text built client-side.

Per-attendee status (the "Trạng thái thanh toán" list above): each "Yes" attendee shows a pill — **Chưa đóng** (slate) / **Chờ duyệt** (amber) / **Đã thanh toán** (emerald). The viewer's own unpaid row has **"Tôi đã CK"**; an admin sees **"Xác nhận"** on pending rows and **"Hủy"** to undo. Confirming notifies the member.

---

### 5.5 Profile (`/dashboard/profile`) — shipped

**Header:** (no back-link — this is a bottom-nav page)
- Lime caps label **"TÀI KHOẢN"**.
- Title (28px semibold): **"Hồ sơ & cài đặt"** + notification bell top-right.

**Section 1 — Thông tin cá nhân** (glass card):
- Heading: `UserCog` icon + **"Thông tin cá nhân"**.
- Top row: 80px round `ImageUpload` (bucket `avatars`, prefix `avatar`) on the left; on the right, a prominent **handle line** — `@username` (slate-100) + `#tag` (lime), e.g. **`@phuonganh#0421`** (shows `#----` until the tag is set) — with helper text below: **"Ảnh đại diện hiển thị bên cạnh tên của bạn trong các nhóm. JPG/PNG, <5MB."**
- **"Tên đăng nhập"** input (regex `^[a-zA-Z0-9._-]{3,20}$`) with helper text **"Dùng làm tên hiển thị và để đăng nhập. 3-20 ký tự, chỉ chữ/số và . _ -"**.
- **Tag** sub-block (divider above): a 4-digit discriminator (`#0000`), decorative — username stays globally unique.
  - **Unset:** a `Hash`-prefixed 4-digit numeric input + a **"Ngẫu nhiên"** dice button (pre-filled with a random suggestion) + lime **"Lưu tag"**. Helper: **"Chọn tag 4 chữ số. Chỉ đặt được một lần — sau đó cần liên hệ quản trị viên để đổi."**
  - **Set:** read-only `#1234` chip with a `Lock` icon + note **"Để đổi tag, vui lòng liên hệ {email}."** Set-once.
- **"Email"** input (read-only, disabled styling). Helper text: **"Email gắn với tài khoản đăng nhập, không thể đổi tại đây."**
- Primary CTA with `Save` icon: **"Lưu tên"** (disabled when unchanged). Inline lime success or rose error message.

**Section 2 — Tài khoản ngân hàng** (glass card):
- Heading: `Landmark` icon + **"Tài khoản ngân hàng"**.
- Body copy: **"Hiển thị cho thành viên khi nhóm chốt chi phí để họ chuyển khoản. Bạn có thể tải mã QR riêng bên dưới."**
- Three inputs:
  - **"Ngân hàng"** — themed `SelectField` (14 common Vietnamese banks; codes vcb, tcb, mbbank, vpb, bidv, vietinbank, acb, sacombank, hdbank, agribank, tpbank, vib, shb, ocb).
  - **"Số tài khoản"** (numeric inputMode).
  - **"Tên chủ tài khoản"**.
- Primary CTA **"Lưu thông tin ngân hàng"** with `Save` icon.
- Divider, then sub-section:
  - Caps label **"MÃ QR THANH TOÁN"**.
  - Body: **"Thay vì nhập số tài khoản, bạn có thể tải lên mã QR riêng để các thành viên quét và chuyển khoản trực tiếp."**
  - 192px square `ImageUpload` (bucket `bank-qr`, prefix `qr`).

**Section 3 — Đổi mật khẩu** (glass card):
- Heading: `KeyRound` icon + **"Đổi mật khẩu"**.
- If the user signed up with email/password (i.e. `email` provider): two password inputs (`Mật khẩu mới`, `Xác nhận mật khẩu`) with min 8 chars + match validation. Primary CTA **"Cập nhật mật khẩu"**.
- If OAuth-only (legacy Google accounts): replace the form with the line **"Tài khoản đăng nhập bằng Google. Không thể đổi mật khẩu tại đây."**

**Section 4 — Ngôn ngữ / Language** (glass card, shipped):
- Heading: `Globe` icon + **"Ngôn ngữ"**.
- Body: **"Chọn ngôn ngữ hiển thị của ứng dụng."**
- A themed `SelectField` with two options: **"Tiếng Việt"** and **"English"**. Selecting one switches the entire UI instantly and persists to `localStorage` (`bs.lang`). Default is Tiếng Việt.

**Section 5 — Thông báo đẩy / Push (glass card, shipped):**
- `Bell` icon box + **"Thông báo đẩy"** / **"Nhận thông báo ngay cả khi không mở app."** + a lime **"Bật"** button (flips to an outline **"Tắt"** once enabled).
- Helper line: **"iPhone: cần thêm app vào màn hình chính rồi mở từ đó (iOS 16.4 trở lên)."**
- Unsupported devices show `BellOff` + **"Thiết bị/trình duyệt này không hỗ trợ thông báo đẩy."**; a blocked permission shows **"Bạn đã chặn quyền thông báo..."** in rose.
- Enabling registers the service worker, asks browser permission, and stores the device's push subscription; per-device opt-in.

**Section 6 — Sign out:**
- Full-width rose-tinted button **"Đăng xuất"** with `LogOut` icon.

---

### 5.6b Friends (`/dashboard/friends`) — shipped

**Purpose:** add people by their `username#tag` (Riot-style), manage requests, and reuse the list to quick-invite into groups.

**Header:** (no back-link — this is a bottom-nav page)
- Title **"Bạn bè"** (28px semibold) + subtitle **"Kết bạn để mời vào nhóm nhanh hơn."** + notification bell top-right.

**Add card (glass panel):**
- Label **"Thêm bạn (tên đăng nhập#tag hoặc email)"**, input (placeholder `nguyenvana#0421`) + lime **"Gửi lời mời"** button with `UserPlus` icon (loading: **"Đang gửi..."**).
- Inline status messages (lime if ok, rose otherwise): **"Đã gửi lời mời kết bạn." / "Đã là bạn bè!" / "Các bạn đã là bạn bè." / "Đã gửi lời mời trước đó." / "Không tìm thấy người dùng." / "Bạn không thể tự kết bạn với chính mình."**

**Sections (each a list of rows; a row shows avatar/initial + name + `@username#tag`):**
1. **Lời mời kết bạn ({n})** — incoming pending. Each row: lime **"Chấp nhận"** (`Check`) + outline **"Từ chối"** (`X`). Sorted to the top.
2. **Đang chờ phản hồi ({n})** — outgoing pending. Each row: `Clock` glyph + outline **"Huỷ lời mời"**.
3. **Bạn bè ({n})** — accepted. Each row: rose-outline **"Xoá bạn"** (confirm dialog **"Xoá {name} khỏi danh sách bạn bè?"**). Empty state: **"Chưa có bạn bè. Thêm bạn bằng tên đăng nhập#tag."**

**Notes:** all reads/writes go through security-definer RPCs (`get_friends`, `send_friend_request`, `respond_friend_request`, `remove_friend`). A friend's email is never exposed to the other party.

---

### 5.6c Notifications (`/dashboard/notifications`) — shipped

**Purpose:** a simple feed of events that concern the user. Reached via the dashboard header bell (live unread badge).

**Header:** lime back-link **"← DASHBOARD"** + title **"Thông báo"**.

**List:** newest first, each row a glass panel (links to its target; hover lights the border):
- Left: lime-tinted rounded icon box — `Calendar` for a new match, `UserPlus` for a group add.
- Text rendered from structured data (i18n): **"Trận đấu mới tại {nhóm}: {ngày} lúc {giờ}"** → match; **"{tên} đã thêm bạn vào nhóm {nhóm}"** / **"{tên} mời bạn vào nhóm {nhóm}"** → group / dashboard; **"{tên} đã gửi lời mời kết bạn"** / **"{tên} đã chấp nhận lời mời kết bạn"** → `/dashboard/friends`.
- Small slate timestamp under the text; `ChevronRight` on the right.
- Unread rows carry a faint lime border; opening the page marks everything read (the header badge clears live).
- Empty state: **"Chưa có thông báo."**

**Sources (DB triggers + RPCs):** new match (all group members except the creator); added to a group; group invite / invite accepted; friend request / accepted; payment confirmed; **attendance request** ("Bạn được thêm vào trận {group}... Xác nhận có tham gia?") and **attendance confirmed/declined** (to the payee). Every insert also fans out as a **web push** to that user's subscribed devices (opt-in, §5.5 Section 5) — the actor never gets their own push.

---

### 5.7 Công nợ / Debts (`/dashboard/debts`) — shipped

**Purpose:** the detail screen behind the dashboard **"Công nợ của tôi"** card. Two angles: what *I* still owe (and pay it), and — if I run a group — who still owes *me*. This is the only net-new screen in this round; everything it references (statuses, payment actions) already exists on the match detail.

**How it's reached:** the **Công nợ** bottom-nav tab (`Wallet`), and the **"Thanh toán ngay"** button / `Info` icon on the dashboard "Công nợ của tôi" card (§5.2).

**Header:** title **"Công nợ"** + the notification bell top-right (no back-link — this is a bottom-nav page).

**Tab bar (pill, §3.7):** **"Tôi nợ"** and **"Chờ thu"**. The **"Chờ thu"** tab is shown **only to users who are a group admin/creator** (others see just "Tôi nợ", no tab bar needed).

#### Tab 1 — "Tôi nợ" (what I owe)
- **Summary band** at top: a glass card with the big total still outstanding (unpaid + submitted) in lime, and a breakdown line **"Cần đóng {x} · Chờ duyệt {y}"** (mirrors the dashboard card).
- **List** of outstanding items, newest first, grouped under a small caps section header per group (group name). Each row is a glass panel and a **link to that match detail**:
  - Left: date (e.g. **"Thứ 6, 26/06"**) + location (line-clamped), with the group name as a small slate caption.
  - Right: amount (e.g. **"125.000 ₫"**) + status pill — **"Chưa đóng"** (slate) or **"Chờ duyệt"** (amber).
  - On an unpaid row, a lime **"Tôi đã CK"** button (marks it submitted in place, like the match screen). Submitted rows show the amber pill only.
- Confirmed/paid items are **excluded** (this list is only what's still owed). Optional: a collapsed **"Đã thanh toán"** group at the bottom for history — leave out unless asked.
- **Empty state:** **"Bạn không nợ khoản nào 🎉"**

#### Tab 2 — "Chờ thu" (owed to me — admin/collector)
- **Summary band:** total others still owe you across the groups you run, in amber: **"Tổng chờ thu {amount}"**.
- **List** of outstanding payments owed to you, grouped by group then by match (small caps headers). Each row:
  - Left: payer **name** + `#tag` and the match date/group caption.
  - Right: amount + status pill — **"Chưa đóng"** (slate, waiting on them) or **"Chờ duyệt"** (amber).
  - On a **"Chờ duyệt"** row, an emerald **"Xác nhận"** button (confirms receipt — same action as the match screen; the payer gets a notification).
- **Empty state:** **"Chưa ai nợ bạn."**

**Live:** both tabs reflect payment-status changes in real time (same Realtime source as the match detail).

**Desktop:** same two-column max-w-2xl column; tabs stay; rows are comfortable single-line.

---

### 5.6 Empty/loading/error patterns (apply everywhere)

- **Loading:** 1–3 glass-panel skeletons at 40–60% opacity with `animate-pulse`. Never a spinner.
- **Empty state:** glass panel with friendly Vietnamese microcopy, no illustration unless requested.
- **Inline error:** small rose-400 text below the action, e.g. **"Tạo nhóm thất bại."** Do not use red toasts; keep errors close to the source.
- **Success toast:** small lime-300 text inline near the action; auto-disappear after 4s (no toast library required).

---

## 6. Mobile navigation (shipped — 4 items)

A bottom navigation bar visible across all logged-in pages:

- Four items (Lucide icons): `Home` → "Trang chủ" (`/dashboard`), `Wallet` → "Công nợ" (`/dashboard/debts`), `Users` → "Bạn bè" (`/dashboard/friends`), `User` → "Tài khoản" (`/dashboard/profile`).
- Active state: lime icon + lime label on a `bg-lime-500/10` rounded pill. Inactive: slate-400.
- Container: fixed bottom, `h-16`, glass panel with top border `border-white/10` and a faint lime top-glow shadow. Item padding is tightened (`px-3`) to fit four labels on narrow phones.

---

## 7. What to ask Stitch for

When pasting into Stitch, end your prompt with this directive (edit per screen):

> Generate the **mobile portrait** layout first, then a **desktop** variation. Use the locked palette and components above. Render every Vietnamese string verbatim. Keep dark mode only. Surface every interactive control in two states (default + hover/active). Output as a clickable mockup with the screens linked in the order: Auth → Dashboard → Group detail (Matches) → Match detail (open) → Match detail (closed with payment QR) → Group detail (Members) → Group detail (Cài đặt) → Profile → modals.

> **Status:** all screens above are shipped, including **Công nợ / Debts (§5.7)**. Only send Stitch a screen here if you're iterating on its look or adding a brand-new flow.

When porting Stitch output back to code, override these recurring drifts:
- **Palette:** use `#A3E635 / #84CC16` lime and `slate-950 #020617` background. Stitch tends to output `#9ee939 / #051424`.
- **Icons:** Lucide only — replace any Material Symbols Stitch uses.
- **Tabs:** pill segmented control (not underline).
- **No CDN Tailwind script** — re-express via the project's Tailwind v4 setup.
- **No external `<img>` URLs** from `aida-public` — use real data or `InitialAvatar` fallback.

---

## 8. Out of scope (do not design)

- Light mode.
- Onboarding tutorial / coachmarks (the tag-reminder banner in §5.2 is the only onboarding nudge).
- Multi-account switcher.
- Offline mode (the service worker is push-only by design).

---

## 9. Change log (vs. previous version of this doc)

- All four core screens ported from Stitch and shipped. Layouts and microcopy in §5 now match production.
- Group detail has **three** tabs: Matches, Members, **Cài đặt** (admin-only).
- Profile route `/dashboard/profile` shipped — moved out of "out of scope".
- Bottom mobile nav shipped (2 items).
- Date/time inputs replaced with custom `DateField` / `TimeField` popovers; native `<select>` replaced with `SelectField` — all in `src/components/`.
- Sign-up uses a unified "Tên đăng nhập" field (both display name and login handle). Sign-in field accepts either username or email.
- Matches gained an optional `location_url` field with a "Mở Google Maps" header pill on the match detail.
- Group rename + delete (type-to-confirm) live in the Cài đặt tab.
- Avatar uploader added to profile §5.5. Bank QR uploader added in the bank section.
- Payment section (§5.4.3) shows an admin-uploaded QR if present + copyable bank text; no dynamic VietQR (removed by request).
- Sign-out moved off the dashboard header into the profile page.
- **i18n shipped:** app is bilingual VI (default) + EN via `src/lib/i18n/`. Vietnamese stays the source-of-truth for design copy. Language switcher added to Profile §5.5 (Section 4); sign-out is now Section 5. Dates/currency and the `DateField` picker follow the active locale.
- **Invite by username or email** (Members tab §5.3.2) — field no longer email-only.
- **Profile tag** (§5.5 Section 1): `@username#0000` handle + set-once 4-digit tag picker.
- **Friends** (§5.6b, route `/dashboard/friends`): add by `username#tag`, requests in/out, friends list; bottom nav is now **3 items** (Trang chủ / Bạn bè / Tài khoản). Members tab gained a **"Mời từ bạn bè"** quick-invite, and group invites are now **friends-only**.
- **Realtime** (§5.4): match detail updates live (RSVPs, settle/reopen, receipt).
- **Notifications** (§5.6c, route `/dashboard/notifications`): in-app feed (new match, added to group, group invite) with a live unread **bell** badge in the dashboard header (§5.2).
- **Group invites require acceptance** (§5.2): admin invite → pending invite + notification → invitee accepts/declines on the dashboard. No force-add.
- **Payment surface shipped** (§5.4.3): closed match shows the group creator's uploaded QR (if any) + copyable bank details + per-person amount. No dynamic VietQR.
- **Payment tracking shipped** (§5.4.3): per-attendee status (Tôi đã CK → admin Xác nhận), live; plus a **"Công nợ của tôi"** widget on the dashboard (§5.2).
- **Công nợ / Debts shipped** (§5.7, route `/dashboard/debts`): "Tôi nợ" + "Chờ thu" tabs. Dashboard "Công nợ của tôi" card redesigned (Cần đóng rose + Chờ thu emerald + "Thanh toán ngay" → debts page). **Bottom nav is now 4 items** — added **Công nợ** (`Wallet`).
- **Dashboard-centric matches** (§5.2): matches moved out of the group page (its "Lịch đánh" tab removed, §5.3) and now nest under each group on the dashboard — compact group rows, upcoming matches with status pills, a collapsible **"Lịch đã chốt"** list with admin delete, and a second **"+ Tạo lịch"** FAB (with group picker + **start/end time range**).
- **Quick-RSVP inline** (§5.2): unanswered match rows show "Có lịch mới — bạn tham gia chứ?" + Tham gia/Nghỉ buttons that RSVP in place.
- **Tag-reminder banner** (§5.2) for users without a tag → `/dashboard/profile#tag`.
- **Match detail reshaped** (§5.4): back button uses history ("← QUAY LẠI"); hero shows the **time range**; Chi phí + Thanh toán merged into one card (single "Mỗi người trả" bar above the payment info); settle fees entered **in thousands** with a live ₫ preview; **"Mở lại lịch" removed**, replaced by **"Thêm người tham gia"** (admin adds a member → they confirm via a banner → split auto-recomputes); payee row shows a **"Người thu"** pill (auto-confirmed, no self-confirm).
- **Picker popovers opaque** (§3.5): `.solid-panel` surface + unlayered lime calendar theme (was translucent/blue).
- **PWA shipped** (§4): installable manifest (standalone, dark), generated "BS" icons, safe-area-aware bottom nav + FABs (§3.8/§3.9), and an in-app **"Đã có bản mới — Cập nhật"** update banner (§5.2).
- **Google sign-in removed** (§5.1): the OAuth consent screen showed Google's unverified-app policy warning to users, so auth is now email/password only (username-or-email sign-in unchanged). Legacy Google-only accounts get an admin-set password.
- **Web push shipped** (§5.5 Section 5 + §5.6c): per-device opt-in toggle on the profile; every notification also lands as a system push (Android verified; iOS needs the installed PWA). Sign-out is now Section 6.
