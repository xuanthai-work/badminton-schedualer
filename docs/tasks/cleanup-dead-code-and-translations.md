# Task: Rà Soát & Dọn Dẹp Code Cũ, Biến Và Translation Keys Không Còn Sử Dụng

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- Dọn dẹp triệt để các mã nguồn thừa, translation keys mồ côi và unused code phát sinh sau khi tái cấu trúc trang Chủ (`/dashboard`) và Sổ thu tiền (`/dashboard/debts`).

## 3. Các thay đổi chính
1. **`src/lib/i18n/translations.ts`**:
   - Loại bỏ các translation keys mồ côi: `ledger.viewMatch`, `ledger.remaining`, `ledger.guestBadge`.
   - Chuẩn hóa các keys liên quan đến form tính tiền cầu (`tubePrice`, `shuttleCount`, `shuttleUnit`).
2. **`src/app/dashboard/debts/page.tsx` & `src/app/dashboard/page.tsx`**:
   - Kiểm tra và đảm bảo không còn unused imports (`Link`, `remaining`, v.v.).
   - Loại bỏ hoàn toàn tàn dư của logic phân loại tab `upcoming`/`history`.

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
