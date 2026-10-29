# TASK-61: Dọn Dẹp Triệt Để Tàn Dư "Sân Số" (Drop court_no Khỏi Database & Codebase)

## 1. Thông Tin Chung
- **Task ID**: TASK-61
- **Ngày hoàn thành**: 2026-10-29
- **Trạng thái QA**: **PASS**
- **Phạm vi tác động**:
  - `supabase/remove-court-no.sql`
  - `supabase/reset-database.sql`
  - `src/app/dashboard/CreateMatchPanel.tsx`
  - `src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx`
  - `src/app/dashboard/matches/[matchId]/page.tsx`
  - `src/app/m/[matchId]/page.tsx`

---

## 2. Bối Cảnh & Vấn Đề
Trường "Sân số" (`court_no`) đã được gỡ bỏ khỏi form tạo và sửa lịch ở TASK-57. Tuy nhiên, trong schema database (`matches.court_no`), RPC `get_public_match` và các câu query/types trong TypeScript vẫn còn tồn tại `court_no: null` và `courtNo: number | null`. Cần dọn dẹp triệt để để code và schema sạch sẽ, thống nhất.

---

## 3. Chi Tiết Triển Khai
1. **Database & SQL Migration**:
   - Tạo file migration `supabase/remove-court-no.sql`:
     - Xóa cột `court_no` khỏi bảng `matches` (`alter table public.matches drop column if exists court_no;`).
     - Cập nhật hàm `get_public_match(p_match_id uuid)`: loại bỏ `court_no` khỏi câu select và không còn trả về key `'courtNo'`.
   - Cập nhật file reset gốc `supabase/reset-database.sql` đồng bộ schema.
2. **Loại bỏ khỏi Codebase Frontend**:
   - `CreateMatchPanel.tsx`: Gỡ bỏ `court_no: null` trong lệnh insert.
   - `EditMatchPanel.tsx`: Gỡ bỏ `court_no: null` trong lệnh update.
   - `matches/[matchId]/page.tsx`: Gỡ bỏ `courtNo` trong type `Match`, chuỗi `.select(...)` và mapping state.
   - `m/[matchId]/page.tsx`: Gỡ bỏ `courtNo` trong type `PublicMatch`.

---

## 4. Kết Quả Nghiệm Thu (Acceptance Criteria)
- [x] File migration `supabase/remove-court-no.sql` được tạo đầy đủ.
- [x] Schema gốc `supabase/reset-database.sql` không còn chứa `court_no`.
- [x] Toàn bộ thư mục `src/` không còn xuất hiện `court_no` hay `courtNo`.
- [x] Đã vượt qua toàn bộ Verification Gates:
  - Lint: `npm run lint` -> **PASS**
  - Typecheck: `npx tsc --noEmit` -> **PASS**
