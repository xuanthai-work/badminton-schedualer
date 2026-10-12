# Task: Sửa Lỗi Layout Che Mất Tên Người Tham Gia (Ẩn Badge & Rút Gọn Nút Xác Nhận)

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- Khắc phục lỗi tràn layout trên mobile (badge và nút chèn đè lên tên người chơi) tại danh sách người tham gia ở cả trang Sổ thu tiền (`/dashboard/debts`) và trang Chi tiết trận (`/dashboard/matches/[matchId]`).
- Khi người chơi ở trạng thái Chờ duyệt (`submitted`): Ẩn badge trạng thái, chỉ hiển thị nút xác nhận kèm icon `Check`.
- Rút gọn nhãn nút xác nhận thành `Xác nhận` thay vì `Xác nhận đã nhận`.

## 3. Các thay đổi chính
1. **`src/app/dashboard/debts/page.tsx`**:
   - Khi `payer.status === "submitted"`, chỉ render nút "Xác nhận", không render badge "Chờ duyệt" bên cạnh.
2. **`src/app/dashboard/matches/[matchId]/page.tsx`**:
   - Khi `paymentStatus === "submitted"`, chỉ render nút "Xác nhận", ẩn badge tương ứng.
3. **`src/lib/i18n/translations.ts`**:
   - Rút gọn `ledger.confirmPay` và `match.payConfirm` thành `"Xác nhận"` (vi) / `"Confirm"` (en).

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
