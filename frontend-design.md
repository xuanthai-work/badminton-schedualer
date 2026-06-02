# Frontend Design Brief — Badminton Scheduler

> **Use this document as the prompt for Google Stitch (stitch.withgoogle.com).**
> Paste the relevant section into Stitch screen-by-screen, or paste the whole doc and ask Stitch to produce the full set.
> Design instructions are written in English. **Product copy in Vietnamese must be preserved verbatim** — Stitch should render the Vietnamese strings exactly as written so they match the shipped UI.

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
- Date/time/number inputs use native pickers — style the wrapper, not the popup.

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
- `fixed bottom-6 right-6 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-lime-500/20`.
- Hover: glow `shadow-[0_0_24px_rgba(163,230,53,0.45)]`.

---

## 4. Routes (current implementation)

```
/                                              Landing / Auth
/dashboard                                     List of my groups
/dashboard/groups/[id]                         Group detail (tabs: Matches, Members)
/dashboard/groups/[id]/matches/[matchId]       Match detail (RSVP + expense split)
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
- Full-width primary button styled as secondary (slate glass with lime hover glow): **"Đăng nhập với Google"**.
- Divider with text **"hoặc"**.
- If "Đăng ký" tab: a "Tên hiển thị" field appears at top.
- Always: **"Email"** field, **"Mật khẩu"** field.
- Primary lime CTA at bottom: **"Đăng nhập"** or **"Tạo tài khoản"** depending on tab. Loading state: **"Đang xử lý..."**.

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
- Page title (24px semibold): **"Nhóm của tôi"**.
- Top-right secondary button: **"Đăng xuất"**.

**Body:**
- Section header row: **"Danh sách nhóm"** on left, member count chip on right (`{n} nhóm`).
- Grid of group cards (2 columns desktop, 1 column mobile, gap 16px). Each card:
  - Group name (18px semibold)
  - Role pill in top-right corner (Admin / Member)
  - Body lines: `{n} thành viên` and `Admin: {name}` (smaller, slate-400)
  - Whole card is a tappable link; hover lights the border lime.
- Empty state (no groups yet): a single glass card with: **"Bạn chưa tham gia nhóm nào. Hãy tạo nhóm mới để bắt đầu."**
- Loading state: 2 skeleton cards using `animate-pulse`.

**FAB (always visible):**
- **"+ Tạo nhóm mới"** — opens a bottom-sheet on mobile, centered modal on desktop.

**Create-group modal:**
- Glass panel, title **"Tạo nhóm mới"**, close button labeled **"Đóng"**.
- One input: label **"Tên nhóm"**, placeholder **"Ví dụ: Thứ 3 vui vẻ"**.
- Footer: secondary **"Hủy"** + primary **"Tạo nhóm"** (loading: **"Đang tạo..."**).

**(Planned, design even though not built yet):**
- Below the group grid, an optional **"Công nợ của tôi"** widget summarizing unpaid shares across all groups: rose number for "phải đóng", emerald for "phải thu".

---

### 5.3 Group detail (`/dashboard/groups/[id]`)

**Header:**
- Small lime back-link: **"← DASHBOARD"**.
- Group name (24px semibold).
- Role pill on the right.

**Tab bar:** two tabs — **"Lịch đánh"** (Matches), **"Thành viên"** (Members). Pill style from §3.7.

#### 5.3.1 Matches tab

- Section row: **"Lịch đánh"** + primary button **"+ Tạo lịch"** (admin only).
- Grid of match cards (2 cols desktop, 1 col mobile). Each card:
  - Top row: date+time on the left (slate-400, `Thứ 3, 03/06/2026 · 20:00`), status pill on the right.
  - Body: location/court name in 16px medium.
  - Footer: `{n} người tham gia` in slate-400.
  - Card hover: border lime.
- Empty state: **"Chưa có lịch nào. Bấm Tạo lịch để bắt đầu."**

**Create-match modal:**
- Title **"Tạo lịch đánh"**.
- Two-column grid: **"Ngày"** (date picker), **"Giờ"** (time picker).
- Full-width input: **"Sân / Địa điểm"** with placeholder **"Ví dụ: Sân Phú Mỹ Hưng - Sân 3"**.
- Footer: **"Hủy"** + **"Tạo lịch"** (loading: **"Đang tạo..."**).

#### 5.3.2 Members tab

- Admin-only invite card at top (glass panel, single row layout on desktop):
  - Label **"Mời thêm thành viên (email)"**.
  - Email input (placeholder `email@example.com`).
  - Primary button **"Mời"** (loading: **"Đang mời..."**).
  - Helper line under the form for status messages: **"Đã thêm thành viên." / "Người này đã có trong nhóm." / "Email chưa đăng ký tài khoản trên hệ thống."**
- Member list (vertical, gap 12px). Each row is a glass panel:
  - Left: name (medium) with optional **"(bạn)"** badge after own name; email below in slate-400.
  - Right: role pill (Admin / Member). If user is the group creator, append **"· Tạo nhóm"** to the pill.
  - Admin-only buttons (right of pill, hidden for the creator and for the row of the viewing admin): **"Hạ quyền"** / **"Phong admin"** (toggles based on current role) and **"Xóa"** (destructive style).

---

### 5.4 Match detail (`/dashboard/groups/[id]/matches/[matchId]`)

The most important screen. Mobile-first, vertical scroll. Two visual states: **Open** and **Closed**.

**Header (both states):**
- Small lime back-link **"← QUAY LẠI NHÓM"**.
- Location name (24px semibold).
- Date+time line in slate-400: **"Thứ 3, 03/06/2026 · 20:00"**.
- Status pill on the right: **"Đang mở"** or **"Đã chốt"**.

#### 5.4.1 Open state

1. **Your RSVP card** (glass panel):
   - Heading **"RSVP của bạn"**.
   - Two side-by-side buttons, full-width split 50/50:
     - **"Tham gia"** — when active = filled lime; when inactive = slate outline with lime hover border.
     - **"Nghỉ"** — when active = filled rose; when inactive = slate outline with rose hover border.

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

#### 5.4.3 VietQR section (planned — Phase 3)

When the match is closed, **below the receipt card**, render a VietQR block:

- Section heading **"Thanh toán"**.
- Centered QR image (256×256 mobile, 320×320 desktop) inside a glass panel:
  - Image source pattern: `https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact.png?amount={feePerPerson}&addInfo={memo}&accountName={adminName}`
  - The `memo` follows the pattern `BADMINTON {GROUP_SLUG} {MATCH_SHORTID} {USER_NAME_NO_ACCENT}`.
- Below the QR, two secondary buttons:
  - **"Sao chép số tài khoản"** (copies admin's account number)
  - **"Sao chép nội dung CK"** (copies the memo string)
- Per-attendee payment status row (admin view): for each "Yes" attendee, show name + a pill:
  - Default (unpaid): **"Chưa đóng"** — slate.
  - User-claimed: **"Chờ duyệt"** — amber. With admin button **"Xác nhận đã nhận"**.
  - Admin-confirmed: **"Đã thanh toán"** — emerald.
- For a member viewing their own row: show **"Tôi đã chuyển khoản"** button to move themselves to "Chờ duyệt".

---

### 5.5 Empty/loading/error patterns (apply everywhere)

- **Loading:** 1–3 glass-panel skeletons at 40–60% opacity with `animate-pulse`. Never a spinner.
- **Empty state:** glass panel with friendly Vietnamese microcopy, no illustration unless requested.
- **Inline error:** small rose-400 text below the action, e.g. **"Tạo nhóm thất bại."** Do not use red toasts; keep errors close to the source.
- **Success toast:** small lime-300 text inline near the action; auto-disappear after 4s (no toast library required).

---

## 6. Mobile navigation (planned)

A bottom navigation bar on mobile only, fixed to the viewport:

- Three icons (Lucide): `Home`, `Users`, `User`.
- Labels under each: **"Trang chủ"**, **"Nhóm"**, **"Tài khoản"**.
- Active state: lime icon + lime label; inactive: slate-400.
- Container: glass panel with extra top border `border-t border-slate-800/80`, height 64px.

---

## 7. What to ask Stitch for

When pasting into Stitch, end your prompt with this directive (edit per screen):

> Generate the **mobile portrait** layout first, then a **desktop** variation. Use the locked palette and components above. Render every Vietnamese string verbatim. Keep dark mode only. Surface every interactive control in two states (default + hover/active). Output as a clickable mockup with the screens linked in the order: Auth → Dashboard → Group detail (Matches tab) → Match detail (open) → Match detail (closed with VietQR) → Group detail (Members tab) → modals.

---

## 8. Out of scope (do not design)

- Light mode.
- Profile / account-settings screen (not built yet; future).
- Admin user management beyond per-group roles.
- Notifications inbox.
- Onboarding tutorial / coachmarks.

---

## 9. Change log (vs. previous version of this doc)

- Routes aligned to the implemented App Router structure (`/dashboard/groups/[id]/...`).
- Member invite is by email lookup (security-definer RPC), not invite-link generation. Link-based invites stay in Phase 3 backlog.
- Tabs in group detail are **Matches** and **Members** only; the Stats tab moves to Phase 3.
- Per-match attendance cap and waiting list removed from Phase 2 spec (not built); kept in the VietQR section as a planned addition only if explicitly requested.
- VietQR section explicitly tagged as Phase 3 so Stitch can design it but the team knows it isn't wired yet.
