# Task: Refactor Toàn Diện Codebase & Tạo Script Reset Database Sạch

- **Task Name**: Comprehensive Codebase Refactor & Clean Database Script
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria & Quality Gates)

---

## 1. Objective
Thực hiện tái cấu trúc (Refactor), dọn dẹp dead code và chuẩn hóa dữ liệu toàn diện:
1. **Script Reset Database Sạch (`supabase/reset-database.sql`)**:
   - Xóa bỏ triệt để toàn bộ bảng cũ của thời Groups / Friends / Notifications / Web Push.
   - Xây dựng mới chuẩn chỉ **5 bảng cốt lõi**: `users`, `venues`, `matches`, `match_guests`, `expenses`.
   - Đóng gói đầy đủ các RPCs và Realtime publication hiện tại.
   - Di chuyển 30 file SQL phân mảnh cũ vào thư mục `supabase/archive/`.
2. **Dọn sạch Dead Translations (`src/lib/i18n/translations.ts`)**:
   - Xóa hoàn toàn hơn 120 dòng bản dịch chết (`notifications`, `tag*`, `qrTitle`, `qrHint`, `backToGroup`, `errWrongGroup`).
3. **Trích xuất Shared Helpers & Components (DRY)**:
   - Tạo component dùng chung `src/components/InitialAvatar.tsx`.
   - Tích hợp helper `formatMatchHeading(dateStr)` vào trực tiếp hook `useI18n()` tại `src/lib/i18n/index.tsx`.
   - Thay thế các hàm duplicate tại `dashboard/page.tsx`, `debts/page.tsx`, `m/[matchId]/page.tsx`, `matches/[matchId]/page.tsx`.
4. **Tinh gọn Data Flow Sổ Thu Tiền & Magic Link**:
   - `src/app/dashboard/debts/page.tsx`: Bỏ query bảng `payments` cũ, đọc danh sách người nộp 100% từ `match_guests`.
   - `src/app/m/[matchId]/page.tsx`: Bỏ ghép mảng `members` từ `rsvps`, chỉ hiển thị từ `guests`.

---

## 2. Scope & Thay đổi chi tiết
- `supabase/reset-database.sql`: Kịch bản reset 1-click cho Supabase SQL Editor.
- `supabase/archive/`: Thư mục lưu trữ 30 file SQL cũ.
- `src/lib/i18n/translations.ts`: Dọn sạch dead keys.
- `src/lib/i18n/index.tsx`: Export `formatMatchHeading` từ `useI18n()`.
- `src/components/InitialAvatar.tsx`: Component avatar dùng chung mới.
- `src/app/dashboard/page.tsx`: Dùng `formatMatchHeading` từ `useI18n()`.
- `src/app/dashboard/debts/page.tsx`: Dùng `InitialAvatar`, dùng `formatMatchHeading`, chỉ query `match_guests`.
- `src/app/dashboard/matches/[matchId]/page.tsx`: Dùng `InitialAvatar`, dùng `formatMatchHeading`.
- `src/app/m/[matchId]/page.tsx`: Dùng `InitialAvatar`, dùng `formatMatchHeading`, chỉ dùng `guests`.

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Script Reset Database Sạch & Lưu trữ SQL cũ | **PASS** | `supabase/reset-database.sql` chứa trọn vẹn 5 bảng và RPCs. 30 file cũ đã vào `archive/`. |
| **AC 2** | Dọn sạch Dead Translations | **PASS** | Grep codebase trả về 0 kết quả cho các dead keys. |
| **AC 3** | DRY Avatar & Date Heading | **PASS** | `InitialAvatar.tsx` và `formatMatchHeading` được tái sử dụng trên toàn bộ các trang. |
| **AC 4** | Single Source Data Flow | **PASS** | Sổ thu tiền và Magic Link đọc 100% từ `match_guests`. |
| **AC 5** | Quality Gates (Lint & Typecheck) | **PASS** | `npx tsc --noEmit` và `npm run lint` đều exit code 0. |

---

## 4. Verification Gates
- `npx tsc --noEmit`: **PASS** (Exit code 0).
- `npm run lint`: **PASS** (Exit code 0).
