# Task: Chuẩn Hóa Cú Pháp VietQR & Xây Dựng Webhook Tự Động Xác Nhận Chuyển Khoản

## 1. Thông tin chung
- **Mã Task**: TASK-35
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
- Chuẩn hóa nội dung chuyển khoản VietQR để máy có thể trích xuất chính xác 100% bằng Regex:
  - Cú pháp chuẩn: `BS <8 ký tự Match ID> <6 ký tự Guest ID>` (Ví dụ: `BS 8A2F9B1C 3D4E5F`).
  - Hiển thị dòng "Nội dung chuyển khoản" kèm nút sao chép (Copy) trên giao diện thanh toán trận đấu.
- Xây dựng Server Webhook API (`/api/webhook/bank-payment`) để tiếp nhận biến động số dư:
  - Xác thực bảo mật bằng header `x-webhook-secret`.
  - Tự động bóc tách mã chuyển khoản, tìm trận đấu và người chơi trong Supabase.
  - Tự động chuyển `payment_status = 'confirmed'`.
  - Hỗ trợ Idempotency: xử lý an toàn khi app gửi lại cùng một giao dịch.
- Tạo script PowerShell giả lập kiểm thử luồng đối soát (`scripts/test-webhook.ps1`).

---

## 3. Các thay đổi chính

1. **`.env.example`**:
   - Thêm cấu hình `BANK_WEBHOOK_SECRET=your-bank-webhook-secret`.

2. **`src/app/m/[matchId]/page.tsx`**:
   - Thay đổi memo VietQR từ `${guestName} tien cau` sang `BS ${shortMatch} ${shortGuest}`.
   - Thêm dòng hiển thị Nội dung chuyển khoản kèm nút sao chép (CopyRow) trong khối chi tiết ngân hàng.

3. **`src/app/api/webhook/bank-payment/route.ts`**:
   - Tạo endpoint `POST /api/webhook/bank-payment` (force-dynamic).
   - Kiểm tra header `x-webhook-secret` khớp với `BANK_WEBHOOK_SECRET`.
   - Trích xuất regex mã chuyển khoản: `/BS\s+([A-Fa-f0-9]{6,8})\s+([A-Fa-f0-9]{4,8})/i`.
   - Sử dụng Supabase admin client đối soát match ID và guest ID, cập nhật trạng thái `confirmed`.

4. **`scripts/test-webhook.ps1`**:
   - Script PowerShell gửi payload giả lập mô phỏng thông báo biến động số dư từ app ngân hàng.

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **ESLint (`npm run lint`)**: PASS (0 errors, 0 warnings)
- [x] **TypeScript Typecheck (`npx tsc --noEmit`)**: PASS (0 errors)
- [x] **Next.js Production Build (`npm run build`)**: PASS (Route `/api/webhook/bank-payment` được build thành công)
