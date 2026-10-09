# Task: Quản lý Danh sách Sân Cầu Lông & Tự Động Đặt Tên Buổi Đánh

- **Task Name**: Saved Venues & Auto Match Title
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria & Verification Gates)

---

## 1. Objective
Tối ưu trải nghiệm tạo buổi đánh:
1. Loại bỏ ô nhập "Tên buổi đánh" trong modal Tạo trận: Tên trận được hệ thống tự động sinh theo Thứ và Ngày Tháng được chọn (Ví dụ: "Thứ Năm, 15/10/2026").
2. Chuyển trường Địa điểm / Sân trong modal Tạo trận từ gõ tay sang dạng Dropdown chọn nhanh từ danh sách các Sân đã lưu sẵn.
3. Tạo riêng một màn hình Quản lý danh sách Sân (`/dashboard/venues`): cho phép Host thêm, sửa, xóa các sân cầu lông thường chơi (gồm Tên sân, Địa chỉ, Link Google Maps).
4. Khắc phục vấn đề UI: Xóa dấu `+` bị lặp tại nút CTA Trang chủ và chuyển nền modal từ `glass-panel` sang nền đặc `bg-slate-900 border border-slate-800` chống xuyên thấu.

---

## 2. Scope & Thay đổi chi tiết
- `supabase/venues.sql`:
  - Tạo bảng `public.venues` (id, user_id, name, address, maps_url, created_at, updated_at).
  - Bật RLS và policy cho authenticated user (`user_id = auth.uid()`).
- `src/app/dashboard/venues/page.tsx`:
  - Màn hình Quản lý Sân ("Sân thường chơi"): Hiển thị danh sách sân, modal Thêm / Sửa / Xóa sân kèm link Google Maps.
- `src/app/dashboard/CreateMatchPanel.tsx`:
  - Bỏ ô input `title`. Tự động gán `title` theo ngày được chọn (`formatDate`).
  - Địa điểm chuyển thành Select Dropdown từ danh sách `venues`, tự động lấy link Google Maps.
  - Kèm nút mở nhanh sang `/dashboard/venues`.
  - Nền modal chuyển sang nền đặc `bg-slate-900 border border-slate-800/90` kèm `bg-slate-950/80 backdrop-blur-md`.
- `src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx`:
  - Nâng cấp modal sửa trận sang nền đặc chống xuyên thấu.
- `src/app/dashboard/profile/page.tsx`:
  - Thêm thẻ liên kết "Sân thường chơi" dẫn trực tiếp tới `/dashboard/venues`.
- `src/components/BottomNav.tsx`:
  - Tab Tài khoản active khi ở route `/dashboard/venues`.
- `src/lib/i18n/translations.ts`:
  - Sửa `dashboard.createMatchCta` bỏ dấu `+ ` lặp.
  - Bổ sung nhóm dịch `venues` (tiếng Việt và tiếng Anh).

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Tự động sinh tên buổi đánh theo Thứ và Ngày Tháng | **PASS** | `CreateMatchPanel.tsx` tự động sinh `title` chuẩn `Thứ [Mấy], dd/MM/yyyy`, có hint xem trước. |
| **AC 2** | Chọn sân qua Dropdown, tự động lấy link Google Maps | **PASS** | Dropdown `<SelectField>` load từ bảng `venues`, gán `location` và `location_url`. |
| **AC 3** | Màn hình Quản lý Sân riêng biệt (`/dashboard/venues`) | **PASS** | Trang `/dashboard/venues` cho phép Thêm, Sửa, Xóa sân với giao diện độc lập. |
| **AC 4** | Lối tắt thuận tiện tới trang Quản lý sân | **PASS** | Có liên kết tại modal Tạo trận và mục "Sân thường chơi" tại Trang cá nhân Profile. |
| **AC 5** | Fix UI: Dấu cộng CTA & Modal nền đặc | **PASS** | Nút CTA chuẩn 1 dấu cộng, các modal dùng nền `bg-slate-900` che phủ hoàn toàn nền sau. |
| **AC 6** | Quality Gates (Lint, Typecheck, Build) | **PASS** | 100% pass với 0 lỗi. |

---

## 4. Verification Gates
- `npx tsc --noEmit`: **PASS** (Exit code 0, không có lỗi TypeScript)
- `npm run lint`: **PASS** (Exit code 0, ESLint không có lỗi)
- `npm run build`: **PASS** (Next.js 16 App Router build thành công 12 trang tối ưu)

---

## 5. Hướng dẫn Triển khai Database
Chạy file script [**`supabase/venues.sql`**](file:///D:/work/Stuff/badminton-schedualer/supabase/venues.sql) trong **Supabase SQL Editor** để khởi tạo bảng `public.venues` và chính sách bảo mật RLS.
