# Task: Magic Public Link cho Trận đấu (Zero-Friction RSVP & VietQR Payment)

- **Task Name**: Magic Public Match Link
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria & Verification Gates)

---

## 1. Objective
Xây dựng tính năng chia sẻ trận đấu qua Magic Public Link (`/m/[matchId]`), cho phép người chơi không cần tải PWA hay tạo tài khoản vẫn có thể:
1. Xem thông tin trận đấu (giờ, sân, địa chỉ, bản đồ, danh sách người tham gia).
2. Đăng ký tham gia (RSVP Yes/No) bằng cách nhập tên lần đầu, lưu danh tính qua `localStorage`.
3. Sau khi chủ nhóm chốt tiền, mở lại link để xem số tiền cá nhân, quét mã VietQR tự động để thanh toán và bấm báo "Đã chuyển tiền".
4. Chủ nhóm quản lý danh sách người chơi (gồm cả thành viên app và khách mời) và xác nhận tiền nhận được từ trang quản trị của trận.

---

## 2. Scope & Thay đổi
- `supabase/match-guests.sql`:
  - Tạo bảng `public.match_guests` lưu thông tin khách vãng lai không cần `auth.users`.
  - RPCs: `guest_rsvp`, `guest_submit_payment`, `confirm_guest_payment`, `get_public_match`.
  - Cập nhật hàm `settle_match` và `recompute_split` để tính gộp cả guests khi chia đều chi phí.
  - Bật Supabase Realtime cho `match_guests`.
- `src/app/m/[matchId]/page.tsx`:
  - Public route mobile-first, zero-auth.
  - Quản lý danh tính khách qua `localStorage` (`badminton_guest_identity`).
  - Giao diện RSVP Tham gia / Bận kèm modal nhập tên / đổi tên.
  - Giao diện thanh toán VietQR tự động khi match `closed`.
  - Realtime sync qua Supabase Channel.
- `src/app/dashboard/groups/[id]/matches/[matchId]/page.tsx`:
  - Nút "Sao chép link mời" kèm icon & toast feedback.
  - Hiển thị danh sách khách mời trong Attendees.
  - Component `GuestPaymentList` để Host theo dõi và duyệt trạng thái thanh toán của khách (`unpaid` / `submitted` / `confirmed`).
- `src/lib/i18n/translations.ts`:
  - Bổ sung đầy đủ bản dịch tiếng Việt và tiếng Anh cho các tính năng mới.

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Chủ nhóm có nút "Sao chép link mời", URL `${origin}/m/${matchId}` | **PASS** | Đã tích hợp nút Share2, clipboard copy và toast thông báo. |
| **AC 2** | Public access không bị chặn auth, xem đầy đủ thông tin trận | **PASS** | Trang `/m/[matchId]` chạy độc lập, RPC `get_public_match` trả dữ liệu an toàn. |
| **AC 3** | Guest RSVP Yes/No chỉ nhập tên 1 lần, lưu qua `localStorage` | **PASS** | Modal nhập tên xuất hiện khi chưa có identity, tự nhớ cho các lần tiếp theo. |
| **AC 4** | Chốt tiền `settle_match` chia đều cho cả Members và Guests | **PASS** | `settle_match` & `recompute_split` gộp `rsvps` và `match_guests` (`status = 'yes'`). |
| **AC 5** | Khách xem lại link thấy số tiền cá nhân, VietQR tự động, nút "Tôi đã chuyển khoản" | **PASS** | Hiển thị mã VietQR compact2 kèm STK, ngân hàng, nội dung chuyển tiền, nút gửi báo chuyển. |
| **AC 6** | Host thấy danh sách khách kèm badge thanh toán và duyệt `confirmed` | **PASS** | Bảng `GuestPaymentList` hỗ trợ duyệt và hoàn tác duyệt tiền khách. |
| **AC 7** | Quality Gates (Lint, Typecheck, Build) | **PASS** | Toàn bộ các lệnh kiểm tra đều đạt 0 lỗi. |

---

## 4. Verification Gates
- `npx tsc --noEmit`: **PASS** (Exit code 0, không có lỗi TypeScript)
- `npm run lint`: **PASS** (Exit code 0, ESLint không có lỗi)
- `npm run build`: **PASS** (Next.js 16 App Router build thành công route `/m/[matchId]`)

---

## 5. Hướng dẫn Triển khai Database
Chạy file script [**`supabase/match-guests.sql`**](file:///D:/work/Stuff/badminton-schedualer/supabase/match-guests.sql) trong **Supabase SQL Editor** để áp dụng bảng mới và cập nhật các stored functions.
