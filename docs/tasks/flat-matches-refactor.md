# Task: Chuyển đổi Kiến trúc sang Flat Match-Centric (Bỏ hoàn toàn khái niệm Nhóm)

- **Task Name**: Flat Match-Centric Architecture
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria & Verification Gates)

---

## 1. Objective
Tối giản hóa ứng dụng thành công cụ Quản lý Buổi đánh & Thu tiền chuyên nghiệp cho Host (không còn khái niệm Nhóm/Group):
1. Cho phép Host tạo buổi đánh trực tiếp ngay tại Trang chủ (`/dashboard`) với 1 bước duy nhất (nhập Tên buổi, Ngày, Giờ, Địa điểm, Số sân) và nhận ngay Magic Link gửi Zalo.
2. Quản lý buổi đánh tại route phẳng `/dashboard/matches/[matchId]`: sửa lịch, chia sẻ link mời, quản lý người tham gia, chốt chi phí và theo dõi thanh toán.
3. Trang chủ `/dashboard` hiển thị danh sách buổi đánh (Sắp diễn ra & Lịch sử) thay cho danh sách nhóm.
4. Xóa bỏ hoàn toàn module nhóm cũ (`/dashboard/groups/`, `CreateGroupPanel.tsx`, các phụ thuộc `group_id` bắt buộc).
5. Trang Sổ thu tiền (`/dashboard/debts`) và trang Public Link (`/m/[matchId]`) liên kết trực tiếp với thông tin buổi đánh mới.

---

## 2. Scope & Thay đổi chi tiết
- `supabase/flat-matches.sql`:
  - Thêm cột `title text` cho bảng `public.matches`.
  - Drop ràng buộc `not null` cho cột `group_id` trên `matches`.
  - Cập nhật RLS policies: `Users can create/update/delete own matches` dựa trên `created_by = auth.uid()`.
  - Cập nhật các stored functions: `get_public_match` (trả về title), `settle_match`, `recompute_split`, `confirm_guest_payment` (phân quyền theo `matches.created_by = auth.uid()`).
- `src/app/dashboard/matches/[matchId]/`:
  - Route mới phẳng, độc lập cho Host quản lý buổi đánh: `page.tsx` và `EditMatchPanel.tsx`.
- `src/app/dashboard/page.tsx`:
  - Tái cấu trúc thành giao diện Match-Centric: Nút "+ Tạo buổi đánh" trực tiếp, danh sách trận sắp tới & lịch sử, nút sao chép link Zalo nhanh.
- `src/app/dashboard/CreateMatchPanel.tsx`:
  - Form tạo buổi đánh 1 bước nhanh chóng với các trường: Tiêu đề buổi đánh, Ngày, Giờ, Địa điểm, Số sân, Link Google Maps.
- `src/app/dashboard/debts/page.tsx`:
  - Truy vấn trực tiếp các trận đấu theo `created_by = uid`, liên kết chi tiết tới `/dashboard/matches/[matchId]`.
- `src/app/m/[matchId]/page.tsx`:
  - Hiển thị trực tiếp `data.match.title` trên tiêu đề trang.
- **Đã xóa bỏ**:
  - Toàn bộ thư mục `src/app/dashboard/groups/`.
  - Component `src/app/dashboard/CreateGroupPanel.tsx`.

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Tạo trận 1 bước từ Trang chủ không cần tạo nhóm | **PASS** | Form `CreateMatchPanel` nhập tiêu đề, ngày, giờ, sân -> tạo thành công và chuyển ngay vào trang quản lý. |
| **AC 2** | Trang chủ sạch sẽ, chỉ tập trung vào các buổi đánh | **PASS** | `/dashboard` chia 2 tab rõ ràng: Sắp diễn ra & Lịch sử, có copy link nhanh. |
| **AC 3** | Route Host phẳng `/dashboard/matches/[matchId]` đầy đủ tính năng | **PASS** | Đầy đủ: sửa lịch, copy link mời, danh sách khách, chốt chi phí, duyệt thanh toán. |
| **AC 4** | Khách mở link `/m/[matchId]` hiển thị đúng tên buổi đánh | **PASS** | Đọc `title` từ match, hỗ trợ RSVP và VietQR như bình thường. |
| **AC 5** | Sổ thu tiền `/dashboard/debts` liên kết trực tiếp | **PASS** | Link chi tiết trỏ về `/dashboard/matches/[id]`, query theo `created_by`. |
| **AC 6** | Gỡ bỏ sạch sẽ module nhóm cũ | **PASS** | Thư mục `/dashboard/groups` và `CreateGroupPanel.tsx` đã được xóa sạch. |
| **AC 7** | Quality Gates (Lint, Typecheck, Build) | **PASS** | 100% pass với 0 lỗi. |

---

## 4. Verification Gates
- `npx tsc --noEmit`: **PASS** (Exit code 0, không có lỗi TypeScript)
- `npm run lint`: **PASS** (Exit code 0, ESLint không có lỗi)
- `npm run build`: **PASS** (Next.js 16 App Router build thành công 11 trang tối ưu)

---

## 5. Hướng dẫn Triển khai Database
Chạy file script [**`supabase/flat-matches.sql`**](file:///D:/work/Stuff/badminton-schedualer/supabase/flat-matches.sql) trong **Supabase SQL Editor** để thêm cột `title`, gỡ ràng buộc `group_id not null` và cập nhật các stored functions.
