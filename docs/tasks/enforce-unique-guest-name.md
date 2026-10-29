# TASK-63: Chặn Trùng Tên Người Chơi Trong Cùng Buổi Đánh (Unique Player Names Per Match)

## 1. Thông Tin Chung
- **Task ID**: TASK-63
- **Ngày hoàn thành**: 2026-10-29
- **Trạng thái QA**: **PASS**
- **Phạm vi tác động**:
  - `supabase/enforce-unique-guest-name.sql`
  - `supabase/reset-database.sql`
  - `src/lib/i18n/translations.ts`
  - `src/app/m/[matchId]/page.tsx`
  - `src/app/dashboard/matches/[matchId]/page.tsx`

---

## 2. Bối Cảnh & Vấn Đề
Trước đây hệ thống chưa có cơ chế kiểm tra trùng lặp tên người chơi trong cùng một trận đấu. Điều này dẫn đến việc nhiều người đăng ký cùng tên (hoặc Host thêm người chơi bị trùng tên), gây nhầm lẫn khi đối soát chi phí, điểm danh và xác nhận thanh toán.

---

## 3. Chi Tiết Triển Khai
1. **Ràng buộc Database (RPCs `guest_rsvp` & `host_add_guest`)**:
   - `supabase/enforce-unique-guest-name.sql`:
     - Trong `public.guest_rsvp`: Khi khách tham gia (`status = 'yes'`), kiểm tra xem trong trận đã có người chơi nào khác (`guest_id <> clean_guest` và `status = 'yes'`) mang cùng tên (so sánh không phân biệt hoa/thường và khoảng trắng thừa: `lower(trim(name)) = lower(clean_name)`). Nếu trùng ném lỗi `duplicate_name`.
     - Trong `public.host_add_guest`: Kiểm tra tương tự với toàn bộ danh sách `status = 'yes'`, ném lỗi `duplicate_name` nếu tên đã tồn tại.
   - Đồng bộ vào `supabase/reset-database.sql`.
2. **Xác thực và Thông báo Lỗi trên Frontend**:
   - `src/lib/i18n/translations.ts`:
     - `publicMatch.errDuplicateName`: *"Tên này đã có người sử dụng trong buổi đánh. Vui lòng chọn tên khác."* (EN: *"This name is already taken in this match. Please choose another name."*)
     - `match.errDuplicateName`: *"Tên này đã có trong danh sách tham gia. Vui lòng đặt tên khác."* (EN: *"This name is already in the attendee list. Please use another name."*)
   - `src/app/m/[matchId]/page.tsx`:
     - Kiểm tra client-side trong `handleDialogSubmit` trước khi gọi RPC.
     - Bắt mã lỗi `duplicate_name` trong `submitRsvp` để hiển thị thông báo thân thiện.
   - `src/app/dashboard/matches/[matchId]/page.tsx`:
     - Kiểm tra client-side trong `handleAddGuest` trước khi gọi RPC `host_add_guest`.
     - Bắt mã lỗi `duplicate_name` để hiển thị thông báo lỗi.

---

## 4. Kết Quả Nghiệm Thu (Acceptance Criteria)
- [x] Khách đăng ký mới hoặc đổi tên trùng với người đang tham gia (`status = 'yes'`) bị chặn và hiển thị thông báo lỗi rõ ràng.
- [x] Khách đổi tên thành chính tên hiện tại của mình vẫn được chấp nhận bình thường (không tự chặn chính mình).
- [x] Host thêm thủ công người chơi trùng tên với người đang tham gia bị chặn và thấy thông báo lỗi.
- [x] Kiểm tra so sánh không phân biệt chữ hoa/thường và khoảng trắng thừa (ví dụ `"Hùng"`, `"hùng"`, `" HÙNG "` tính là trùng).
- [x] Người đã hủy tham gia (`status = 'no'`) không cản trở người khác sử dụng tên đó.
- [x] Đã vượt qua toàn bộ Verification Gates:
  - Lint: `npm run lint` -> **PASS**
  - Typecheck: `npx tsc --noEmit` -> **PASS**
  - Build: `npm run build` -> **PASS**
