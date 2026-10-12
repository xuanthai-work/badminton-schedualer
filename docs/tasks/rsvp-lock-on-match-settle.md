# Task: Đổi Logic Khóa Điểm Danh RSVP: Chỉ Khóa Khi Host Chốt Tiền

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- Loại bỏ hoàn toàn cơ chế tự động khóa điểm danh cứng trước giờ đánh 30 phút.
- Thay đổi thành: **Chỉ khóa điểm danh khi Host ấn Chốt tiền (`status === "closed"`)**.
- Khi trận đấu vẫn đang mở (`status === "open"`), người chơi có thể thoải mái tham gia, đổi tên hoặc hủy điểm danh kể cả sát giờ đánh hoặc đang trong giờ đánh.

## 3. Các thay đổi chính
1. **`src/app/m/[matchId]/page.tsx`**:
   - Xóa bỏ state `rsvpLocked` và logic tính toán thời gian `time - 30 * 60_000`.
   - Cho phép người chơi tự do RSVP khi `status === "open"`.
   - Điểm danh chỉ khóa khi `status === "closed"`.
2. **`src/app/dashboard/matches/[matchId]/page.tsx`**:
   - Loại bỏ trường `rsvpLocked` không cần thiết trong type `Match` và hàm `setMatch`.

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
