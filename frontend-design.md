# Frontend Design Brief — Badminton Scheduler

> **Use this document as the prompt for Google Stitch (stitch.withgoogle.com).**
> Paste the relevant section into Stitch screen-by-screen, or paste the whole doc and ask Stitch to produce the full set.
> Design instructions are written in English. **Product copy in Vietnamese must be preserved verbatim** — Stitch should render the Vietnamese strings exactly as written so they match the shipped UI.
>
> **Localization (shipped):** the app is bilingual — **Vietnamese (default) + English** — via a client i18n layer (`src/lib/i18n/`, Context + `localStorage["bs.lang"]`). Vietnamese remains the **source of truth** for design copy; every VI string below has an EN counterpart in `translations.ts`. When designing, keep using the Vietnamese strings verbatim; the English just mirrors them. A language switcher lives on the profile page (§5.5).

---

## 1. Product summary (context for Stitch)

A mobile-first web app for Vietnamese amateur badminton clubs to schedule matches, collect RSVPs, and split the post-match bill (court + shuttlecocks + water) among attendees. Members typically use it on a phone, courtside, with bright gym lighting. The app is built with Next.js 16 (App Router) + Tailwind + Supabase. Authentication is via Google OAuth or email/password. The same app handles three roles: visitor, group member, and group admin.

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

### 3.8 Floating action button (FAB)
- `fixed bottom-24 right-6 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-lime-500/20`.
- Hover: glow `shadow-[0_0_24px_rgba(163,230,53,0.45)]`.
- **`bottom-24`** so it clears the bottom mobile nav.

### 3.9 Bottom mobile nav (shipped)
- Fixed glass bar, `h-16`, `bg-slate-950/80 backdrop-blur-xl` with a top border `border-white/10` and a faint top-glow shadow.
- Three items: **Trang chủ** (`Home` → `/dashboard`), **Bạn bè** (`Users` → `/dashboard/friends`), **Tài khoản** (`User` → `/dashboard/profile`).
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
/dashboard                                     List of my groups + personalized greeting
/dashboard/groups/[id]                         Group detail (tabs: Matches, Members, Cài đặt)
/dashboard/groups/[id]/matches/[matchId]       Match detail (RSVP + expense + Maps link)
/dashboard/friends                             Friends (add by username#tag, requests, list)
/dashboard/notifications                       Notifications list (new match, added to group)
/dashboard/profile                             Handle/tag / avatar / login / bank / QR / password / language / sign-out
```

Stitch should design **mobile portrait** as primary and provide a wider desktop layout as a secondary deliverable per screen.

---

## 5. Screen briefs

### 5.1 Landing / Auth (`/`)

**Purpose:** First impression. Drive sign-in.

**Layout (mobile):**
- Top: small lime-tracking label `BADMINTON SCHEDULER`.
- Large headline (32–40px): **"Chơi cầu lông không lo chia tiền."**
- Subhead (16px, slate-300): **"Lên lịch, điểm danh realtime và chia chi phí cho cả nhóm trong vài phút."**
- Small slate info card: **"Đăng nhập bằng Google để sử dụng nhanh, hoặc dùng email/mật khẩu để đăng ký nội bộ."**
- Below: a single glass card form.

**Form card (glass panel, 16px radius):**
- Segmented control pill at top: two tabs **"Đăng nhập" / "Đăng ký"**. Active tab has lime background.
- Full-width OAuth button (slate glass with lime hover glow + inline Google "G" SVG): **"Đăng nhập với Google"**.
- Divider with caps text: **"HOẶC DÙNG TÀI KHOẢN"** (Sign-in) or **"HOẶC TẠO TÀI KHOẢN"** (Sign-up).
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

**Công nợ của tôi (shipped, shown only when you owe something):**
- An amber-tinted glass card with a `Wallet` icon: the total you owe (28px), with a breakdown line **"Cần đóng {x} · Chờ duyệt {y}"**. Sourced from `get_payment_summary` (unpaid + submitted across all closed matches).

**Pending group invites (shipped, shown only when you have any):**
- Section **"Lời mời vào nhóm"**; each invite is a lime-tinted glass row: **"{inviter} mời bạn vào nhóm {group}"** + **"Tham gia"** (accept → joins + the row disappears) and **"Từ chối"** (decline). Group membership now requires this acceptance — admins can't force-add.

**Body:**
- Section header row: **"Danh sách nhóm"** on left, count chip on right (`{n} nhóm`).
- Grid of group cards (2 columns desktop, 1 column mobile, gap 16px). Each card:
  - Top row: rounded lime-tinted icon box (currently `Users` from Lucide) on the left, **"ADMIN"** / **"MEMBER"** uppercase pill on the right.
  - Group name (20px semibold).
  - `Users` icon + `{n} thành viên`.
  - Bottom row separated by `border-t border-white/10 pt-4`: admin initial-avatar + name (label "ADMIN") on the left, hover-shifting `ChevronRight` on the right.
  - Whole card is a tappable link; hover lights the border lime.
  - Soft lime corner glow that intensifies on hover.
- Empty state: a single glass card with: **"Bạn chưa tham gia nhóm nào. Hãy tạo nhóm mới để bắt đầu."**
- Loading state: 2 skeleton cards using `animate-pulse`.

**FAB (always visible):**
- **"+ Tạo nhóm mới"** — opens a bottom-sheet on mobile, centered modal on desktop. Positioned `bottom-24 right-6` to clear the bottom nav.

**Create-group modal:**
- Glass panel, title **"Tạo nhóm mới"**, close button labeled **"Đóng"**.
- One input: label **"Tên nhóm"**, placeholder **"Ví dụ: Thứ 3 vui vẻ"**.
- Footer: secondary **"Hủy"** + primary **"Tạo nhóm"** (loading: **"Đang tạo..."**).

**Bottom nav:** mounted at the bottom of every dashboard route (see §3.9).

**(Planned, not yet built):**
- Below the group grid, an optional **"Công nợ của tôi"** widget summarizing unpaid shares across all groups (rose number "Cần đóng" + emerald "Chờ thu" + lime CTA "Thanh toán ngay").
- Use the user's `avatar_url` (now uploadable on the profile page) for the admin avatar on each group card instead of the initial fallback.

---

### 5.3 Group detail (`/dashboard/groups/[id]`)

**Header:**
- Small lime back-link: **"← DASHBOARD"**.
- Group name (24px semibold).
- Role pill on the right.

**Tab bar:** three tabs — **"Lịch đánh"** (Matches), **"Thành viên"** (Members), **"Cài đặt"** (Settings, **admin-only — hidden for members**). Pill style from §3.7.

#### 5.3.1 Matches tab

- Section row: **"Lịch đánh"** + primary button **"+ Tạo lịch"** (admin only, with `Plus` icon).
- Grid of match cards (3 cols desktop, 2 cols md, 1 col mobile). Each card is a tappable link:
  - Top row: caps line **`{date}`** (lime if open, slate otherwise) above the big time text. Status pill on the right (`Đang mở` / `Đã chốt`).
  - Two icon rows below: `MapPin` + location (line-clamped to 1), `Users` + `{n} người tham gia`.
  - Footer separated by `border-t border-white/10 pt-3`: caps lime **"Chi tiết"** + `ChevronRight` (translate-x on hover).
- Empty state: **"Chưa có lịch nào. Bấm Tạo lịch để bắt đầu."**

**Create-match modal:**
- Title **"Tạo lịch đánh"**.
- Two-column grid: **"Ngày"** (DateField popover from §3.5), **"Giờ"** (TimeField popover).
- Full-width input: **"Sân / Địa điểm"** with placeholder **"Ví dụ: Sân Phú Mỹ Hưng - Sân 3"**.
- Optional **"Link Google Maps (tùy chọn)"** field with placeholder `https://maps.app.goo.gl/...`. Validated to start with `http(s)://`.
- Footer: **"Hủy"** + **"Tạo lịch"** (loading: **"Đang tạo..."**).

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
- Small lime back-link with `ChevronLeft`: **"← QUAY LẠI NHÓM"**.
- Title **"Chi tiết trận đấu"** (28px semibold).
- Below title: `MapPin` icon + location text. If the match has a `location_url`, append a small lime pill link **"↗ MỞ GOOGLE MAPS"** (with `ExternalLink` icon, opens in new tab).
- Status pill on the right: **"Đang mở"** (emerald) or **"Đã chốt"** (slate).

**Hero info card (under header):**
- Lime-tinted rounded icon box with `Calendar` icon.
- Caps label **"THỜI GIAN"** above the prominent date+time line: **"Thứ 3, 03/06/2026 · 20:00"**.

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
   - Three number inputs in a row: **"Tiền sân"**, **"Tiền cầu"**, **"Tiền nước"** (placeholder `0`, step 1000).
   - Helper line: **"Hệ thống sẽ chia cho {n} người tham gia."**
   - Primary CTA (full-width): **"Chốt và chia tiền"** (loading: **"Đang lưu..."**).
   - Success message in lime: **"Đã chốt: {n} người · {amount} ₫ / người"**.

#### 5.4.2 Closed state

All elements above remain visible (for transparency), but:

1. **Your RSVP card** shows a slate-400 helper: **"Lịch đã đóng. Không thể đổi RSVP."** (Buttons disabled or hidden.)

2. **Receipt card** (new — glass panel, styled like a paper receipt with subtle dashed bottom edge):
   - Heading **"Chi phí"**.
   - Two-column key/value rows: **"Tiền sân"** / amount, **"Tiền cầu"** / amount, **"Tiền nước"** / amount.
   - Subtotal row with top border: **"Tổng"** / total in semibold.
   - Highlighted callout box in lime (`bg-lime-500/10 text-lime-200`): **"Mỗi người trả {amount} ₫"**.
   - Format all amounts in VND with no decimals: `670.000 ₫`.

3. **Admin settle panel** swaps to:
   - Heading **"Cập nhật chi phí"**.
   - Top-right small secondary button **"Mở lại lịch"**.
   - Same three fee inputs, pre-filled with stored values.
   - Primary CTA: **"Cập nhật chi phí"**.

#### 5.4.3 Payment section (shipped)

When the match is closed, **below the receipt card**, a **"Thanh toán"** card renders the **group creator's** payment info: their **uploaded QR only if they added one** (we deliberately do **not** auto-generate a VietQR), plus bank name / account number / holder / memo as **copyable** text, and the per-person amount. Empty state if no bank info: **"Quản trị viên chưa thiết lập thông tin thanh toán."**

Below it, a **"Trạng thái thanh toán"** list (shipped) shows each attendee with a status pill — **Chưa đóng** (slate) / **Chờ duyệt** (amber) / **Đã thanh toán** (emerald) — and the amount. The viewer's own unpaid row has a lime **"Tôi đã CK"** button; an admin sees **"Xác nhận"** on pending rows (and **"Hủy"** to undo). Updates live via Realtime. Source detail:

**Payment info source:** the **group creator's** profile. If `users.bank_qr_url` is set, render that uploaded QR image inside the card with a **"Quét mã QR để chuyển khoản"** caption. **No dynamic VietQR is generated** — we don't call `img.vietqr.io`. Always show the bank name / account number / holder / memo as text, with **copy** buttons on the account number and the transfer memo (`Cau long {match-date}`). The memo is plain text built client-side.

Per-attendee status (the "Trạng thái thanh toán" list above): each "Yes" attendee shows a pill — **Chưa đóng** (slate) / **Chờ duyệt** (amber) / **Đã thanh toán** (emerald). The viewer's own unpaid row has **"Tôi đã CK"**; an admin sees **"Xác nhận"** on pending rows and **"Hủy"** to undo. Confirming notifies the member.

---

### 5.5 Profile (`/dashboard/profile`) — shipped

**Header:**
- Lime back-link **"← DASHBOARD"** with `ChevronLeft`.
- Lime caps label **"TÀI KHOẢN"**.
- Title (28px semibold): **"Hồ sơ & cài đặt"**.

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
- If OAuth-only: replace the form with the line **"Tài khoản đăng nhập bằng Google. Không thể đổi mật khẩu tại đây."**

**Section 4 — Ngôn ngữ / Language** (glass card, shipped):
- Heading: `Globe` icon + **"Ngôn ngữ"**.
- Body: **"Chọn ngôn ngữ hiển thị của ứng dụng."**
- A themed `SelectField` with two options: **"Tiếng Việt"** and **"English"**. Selecting one switches the entire UI instantly and persists to `localStorage` (`bs.lang`). Default is Tiếng Việt.

**Section 5 — Sign out:**
- Full-width rose-tinted button **"Đăng xuất"** with `LogOut` icon.

---

### 5.6b Friends (`/dashboard/friends`) — shipped

**Purpose:** add people by their `username#tag` (Riot-style), manage requests, and reuse the list to quick-invite into groups.

**Header:**
- Lime back-link **"← DASHBOARD"**.
- Title **"Bạn bè"** (28px semibold) + subtitle **"Kết bạn để mời vào nhóm nhanh hơn."**

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

**Sources (DB triggers):** a new match notifies all group members except the creator; being added to a group notifies the added user. Designed to extend (friend requests, match settled, …).

---

### 5.6 Empty/loading/error patterns (apply everywhere)

- **Loading:** 1–3 glass-panel skeletons at 40–60% opacity with `animate-pulse`. Never a spinner.
- **Empty state:** glass panel with friendly Vietnamese microcopy, no illustration unless requested.
- **Inline error:** small rose-400 text below the action, e.g. **"Tạo nhóm thất bại."** Do not use red toasts; keep errors close to the source.
- **Success toast:** small lime-300 text inline near the action; auto-disappear after 4s (no toast library required).

---

## 6. Mobile navigation (shipped — 2 items)

A bottom navigation bar visible across all logged-in pages:

- Two items (Lucide icons): `Home` → "Trang chủ" (`/dashboard`), `User` → "Tài khoản" (`/dashboard/profile`).
- Active state: lime icon + lime label on a `bg-lime-500/10` rounded pill. Inactive: slate-400.
- Container: fixed bottom, `h-16`, glass panel with top border `border-white/10` and a faint lime top-glow shadow.
- A third item (e.g. "Lịch" for an upcoming-matches feed) can be added once that route exists.

---

## 7. What to ask Stitch for

When pasting into Stitch, end your prompt with this directive (edit per screen):

> Generate the **mobile portrait** layout first, then a **desktop** variation. Use the locked palette and components above. Render every Vietnamese string verbatim. Keep dark mode only. Surface every interactive control in two states (default + hover/active). Output as a clickable mockup with the screens linked in the order: Auth → Dashboard → Group detail (Matches) → Match detail (open) → Match detail (closed with payment QR) → Group detail (Members) → Group detail (Cài đặt) → Profile → modals.

When porting Stitch output back to code, override these recurring drifts:
- **Palette:** use `#A3E635 / #84CC16` lime and `slate-950 #020617` background. Stitch tends to output `#9ee939 / #051424`.
- **Icons:** Lucide only — replace any Material Symbols Stitch uses.
- **Tabs:** pill segmented control (not underline).
- **No CDN Tailwind script** — re-express via the project's Tailwind v4 setup.
- **No external `<img>` URLs** from `aida-public` — use real data or `InitialAvatar` fallback.

---

## 8. Out of scope (do not design)

- Light mode.
- Notifications inbox.
- Onboarding tutorial / coachmarks.
- Multi-account switcher.

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
