# Task: Tối Giản Trạng Thái Thanh Toán: Gỡ Bỏ Nút "Tôi Đã Chuyển Khoản" & Tích Hợp Nút Toggle Xác Nhận 2 Chiều Cho Host

## 1. Thông tin chung
- **Mã Task**: TASK-41
- **Ngày hoàn thành**: 2026-10-14
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
- Loại bỏ sự phụ thuộc vào thao tác của người chơi trên Magic Link: gỡ bỏ nút "Tôi đã chuyển khoản" và trạng thái trung gian "Chờ xác nhận" (`submitted`).
- Tối giản hóa và trực quan hóa trải nghiệm đối soát của Host:
  - Bỏ hoàn toàn nhãn hiển thị thụ động "Chưa đóng".
  - Chuyển đổi thành **1 nút tương tác Toggle 2 chiều** duy nhất:
    - Trạng thái chưa thanh toán: Hiển thị nút **`[ Xác nhận ]`** (Host bấm 1 chạm để xác nhận khi thấy tiền vào tài khoản).
    - Trạng thái đã thanh toán: Hiển thị nút/pill **`[ Đã thanh toán ✓ ]`**. Nếu bấm nhầm, Host bấm lại trực tiếp vào "Đã thanh toán" để hoàn tác ngược về "Xác nhận".
  - Nút xóa người chơi (icon Thùng rác): chỉ xuất hiện khi chưa thanh toán, tự động ẩn khi đã thanh toán.
  - Loại bỏ hoàn toàn nút "Hủy" riêng biệt gây rối giao diện.

---

## 3. Các thay đổi chính

1. **`src/app/m/[matchId]/page.tsx` (Magic Link khách)**:
   - Gỡ bỏ hoàn toàn nút `{t("publicMatch.iPaid")}` ("Tôi đã chuyển khoản").
   - Gỡ bỏ trạng thái trung gian `submitted` ("Chờ xác nhận") và hàm `handleSubmitPayment`.
   - Khách chỉ cần quét VietQR và copy thông tin chuyển khoản; khi được Host duyệt, trang realtime cập nhật sang "Đã thanh toán".

2. **`src/app/dashboard/debts/page.tsx` (Sổ thu tiền)**:
   - Cập nhật hàm `confirmPayer` nhận cờ `targetConfirmed: boolean` để gọi RPC Supabase `confirm_guest_payment(p_confirmed: targetConfirmed)`.
   - Gỡ bỏ hàm `statusPill` và nhãn "Chưa đóng".
   - Tích hợp nút Toggle 2 chiều: `[ Xác nhận ]` $\leftrightarrow$ `[ Đã thanh toán ✓ ]`.
   - Với Host (`isSelf`): hiển thị badge cố định "Đã thanh toán".
   - Icon Thùng rác tự động hiển thị khi chưa thanh toán và ẩn khi đã thanh toán.

3. **`src/app/dashboard/matches/[matchId]/page.tsx` (Chi tiết trận)**:
   - Đồng bộ cơ chế Toggle 2 chiều trong `ParticipantList` khi trận đấu ở trạng thái `closed`.
   - Gỡ bỏ nút "Hủy" riêng biệt (`match.payUnconfirm`).

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **ESLint (`npm run lint`)**: PASS (0 errors, 0 warnings)
- [x] **TypeScript Typecheck (`npx tsc --noEmit`)**: PASS (0 errors)
- [x] **Next.js Production Build (`npm run build`)**: PASS (12/12 routes biên dịch thành công)
