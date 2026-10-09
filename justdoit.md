# Current Implementation Task

> **Note**: File này chỉ chứa duy nhất task implementation hiện tại đang triển khai.
> Sau khi Developer Agent hoàn thành và QA AUDIT PASS, task sẽ được lưu trữ vào `docs/tasks/` và thay thế khi bắt đầu task mới.

---

## Task: Fix UI - Xóa Dấu Cộng Trùng Lặp & Nâng Cấp Nền Modal Chống Xuyên Thấu

### 1. Objective
Khắc phục 2 lỗi giao diện người dùng theo phản hồi:
1. Nút Tạo buổi đánh mới ở Trang chủ bị lặp 2 dấu cộng (`+ + Tạo buổi đánh mới`) do vừa render icon `<Plus />` vừa có ký tự `+` trong chuỗi dịch.
2. Các Modal (Tạo trận, Sửa trận, Nhập tên) đang dùng `glass-panel` với độ trong suốt quá cao và backdrop yếu, khiến chữ và nội dung trang nền bên dưới bị nhìn xuyên thấu đè lên form gây rối mắt.

### 2. Scope
- `src/lib/i18n/translations.ts`: Bỏ ký tự `+ ` trong key `dashboard.createMatchCta` (cả `vi` và `en`).
- `src/app/dashboard/CreateMatchPanel.tsx`: Nâng cấp backdrop (`bg-slate-950/80 backdrop-blur-md`) và đổi hộp modal từ `glass-panel` sang nền đặc `bg-slate-900 border border-slate-800 shadow-2xl`.
- `src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx`: Cập nhật tương tự cho modal sửa trận.
- `src/app/m/[matchId]/page.tsx`: Cập nhật modal nhập tên/đổi tên của khách sang nền đặc `bg-slate-900 border border-slate-800`.

### 3. Implementation Steps (Dành cho Developer Agent)

#### Bước 1: Sửa chuỗi dịch trong `src/lib/i18n/translations.ts`
1. Tìm `createMatchCta` trong object `vi`: đổi từ `"+ Tạo buổi đánh mới"` thành `"Tạo buổi đánh mới"`.
2. Tìm `createMatchCta` trong object `en`: đổi từ `"+ Create a new match"` thành `"Create a new match"`.

#### Bước 2: Nâng cấp Modal trong `src/app/dashboard/CreateMatchPanel.tsx`
1. Tại phần render modal:
   - Thay lớp phủ overlay: `className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm p-4 sm:items-center"`
   - Thay thẻ div chứa modal: Đổi từ `glass-panel` sang `bg-slate-900 border border-slate-800/90 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl`.

#### Bước 3: Nâng cấp Modal trong `src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx`
1. Thay lớp phủ overlay: `bg-slate-950/80 backdrop-blur-sm`.
2. Thay thẻ div chứa modal: Đổi từ `glass-panel` sang `bg-slate-900 border border-slate-800/90 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl`.

#### Bước 4: Nâng cấp Modal trong `src/app/m/[matchId]/page.tsx`
1. Tại modal nhập tên / đổi tên khách (`dialogStatus`):
   - Thay overlay backdrop: `bg-slate-950/80 backdrop-blur-sm`.
   - Đổi div modal từ `glass-panel` sang `bg-slate-900 border border-slate-800/90 w-full max-w-md rounded-2xl p-6 shadow-2xl`.

#### Bước 5: Verification Gates
1. Chạy `npm run lint`.
2. Chạy `npx tsc --noEmit`.
3. Chạy `npm run build`.

### 4. Acceptance Criteria
- [ ] **AC 1 (Dấu cộng chuẩn)**: Nút CTA tại Trang chủ hiển thị: `[Icon +] Tạo buổi đánh mới`, không còn bị lặp 2 dấu `+ +`.
- [ ] **AC 2 (Modal rõ ràng)**: Modal Tạo buổi đánh, Sửa buổi đánh và Nhập tên khách sử dụng nền đặc `bg-slate-900`, che phủ hoàn toàn nội dung phía sau, đọc chữ rõ ràng không bị xuyên thấu.
- [ ] **AC 3 (Quality Gates)**: `npm run lint`, `npx tsc --noEmit`, và `npm run build` đều pass 100%.

### 5. Verification Gates
- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
