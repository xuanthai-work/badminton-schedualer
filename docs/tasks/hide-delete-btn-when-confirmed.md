# Task: Ẩn Nút Xóa Người Chơi Khi Đã Xác Nhận Thanh Toán (Confirmed)

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- Triển khai cơ chế Defensive UX bảo vệ dữ liệu tài chính:
  - Khi người chơi đã có trạng thái Xác nhận thanh toán (`confirmed`), hệ thống **ẩn hoàn toàn icon thùng rác (nút Xóa)**.
  - Chống thao tác chạm nhầm trên mobile gây mất người chơi và làm sai lệch số tiền chia đều đã chốt.
  - Nút Xóa chỉ xuất hiện khi người chơi chưa thanh toán (`unpaid`) hoặc đang chờ duyệt (`submitted`).

## 3. Các thay đổi chính
1. **`src/app/dashboard/debts/page.tsx`**:
   - Điều kiện render nút xóa: `{payer.status !== "confirmed" && (<button ...><Trash2 ... /></button>)}`.
2. **`src/app/dashboard/matches/[matchId]/page.tsx`**:
   - Trong `ParticipantList`: Ẩn nút xóa thùng rác khi trận đấu đã chốt (`status === "closed"`) và `paymentStatus === "confirmed"`.

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
