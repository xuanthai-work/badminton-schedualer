# Task Documentation: TASK-40 - Host Chủ Động Thêm Người Chơi Thủ Công Trên Trang Chi Tiết Trận

## 1. Thông Tin Chung
- **Task ID**: TASK-40
- **Tên Task**: Host Manual Add Participant In Match Detail
- **Ngày hoàn thành**: 2026-10-13
- **Người thực hiện**: Developer Agent (OpenCode)
- **QA & Technical Auditor**: Gemini (BA + QA)
- **Trạng thái**: **PASS**

---

## 2. Bối Cảnh & Mục Tiêu

### Vấn đề:
- Trước đây hệ thống chỉ cho phép người chơi tự bấm link để điểm danh RSVP (hoặc Host tự có 1 slot khi tạo trận).
- Trong thực tế, nhiều thành viên không bấm web mà chỉ nhắn tin qua nhóm chat ("Cho 1 slot nhé") hoặc dẫn bạn bè đi cùng.
- Khi Host chốt tiền, nếu thiếu những người này thì sĩ số tính tiền sẽ bị sai (`feePerPerson` bị chia cho ít người hơn), và người đó cũng không xuất hiện trong Sổ thu tiền hay danh sách chọn VietQR để thanh toán.

### Mục tiêu:
1. Cho phép Host chủ động thêm người chơi thủ công ngay tại khối **"Người tham gia" (Participants)** trên trang Chi tiết trận đấu (`/dashboard/matches/[matchId]`).
2. Tự động sinh `guest_id`, lưu vào cơ sở dữ liệu với `status = 'yes'`.
3. Nếu trận đấu đã chốt chi phí (`closed`), tự động tính toán lại mức chia tiền (`recompute_split`).
4. Người được thêm xuất hiện ngay trong danh sách trận, Sổ thu tiền, và bảng danh sách chọn mã VietQR thanh toán.

---

## 3. Chi Tiết Kỹ Thuật & Thay Đổi

### 3.1. Database RPC (`supabase/host-add-guest.sql` & `supabase/reset-database.sql`)
- Tạo hàm `public.host_add_guest(p_match_id uuid, p_name text)`:
  - Kiểm tra `auth.uid()` phải là Host tạo trận (`created_by`).
  - Kiểm tra tên người chơi không được rỗng, cắt tối đa 60 ký tự.
  - Kiểm tra giới hạn sĩ số tối đa 20 người (`match_full`).
  - Tạo `new_guest_id` và insert vào `public.match_guests` với trạng thái `status = 'yes'`, `payment_status = 'unpaid'`.
  - Tự động gọi `recompute_split(p_match_id)` nếu trận đấu đang ở trạng thái `closed`.
  - Phân quyền: `grant execute on function public.host_add_guest(uuid, text) to authenticated`.

### 3.2. Frontend (`src/app/dashboard/matches/[matchId]/page.tsx`)
- Thêm nút **`+ Thêm người`** (icon `UserPlus`) nằm ngay cạnh tiêu đề "NGƯỜI THAM GIA (X)" khi người xem là Host.
- Modal nhập tên người chơi (input autofocus, maxLength 60).
- Gọi RPC `host_add_guest`, rung haptic và tự động làm mới danh sách.

### 3.3. i18n (`src/lib/i18n/translations.ts`)
- Bổ sung translation keys Tiếng Việt và Tiếng Anh: `addGuestBtn`, `addGuestTitle`, `addGuestHint`, `addGuestPlaceholder`, `errNameEmpty`.

---

## 4. Kết Quả Kiểm Thử (Verification Gates)

| Gate | Lệnh Thực Thi | Kết Quả |
|------|---------------|---------|
| ESLint | `npm run lint` | **PASS** (0 errors, 0 warnings) |
| TypeScript | `npx tsc --noEmit` | **PASS** (Typecheck sạch 100%) |
| Next.js Build | `npm run build` | **PASS** (Tối ưu hóa và build production thành công) |
