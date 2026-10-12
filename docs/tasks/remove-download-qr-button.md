# Task: Xóa Nút Tải Ảnh QR Trên Trang Magic Link Của Người Chơi

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- Loại bỏ nút "Tải ảnh QR" trên trang Magic Link (`/m/[matchId]`) để giao diện thanh toán gọn gàng hơn. Người chơi có thể quét trực tiếp mã QR trên màn hình hoặc sao chép thông tin tài khoản / nội dung chuyển khoản.

## 3. Các thay đổi chính
1. **`src/app/m/[matchId]/page.tsx`**:
   - Xóa bỏ nút bấm Tải ảnh QR, state `downloading`, hàm `handleDownloadQr` và các imports `Download`, `Loader2`.
2. **`src/lib/i18n/translations.ts`**:
   - Dọn dẹp translation keys `downloadQr`, `downloadingQr` trong mục `publicMatch` ở cả `vi` và `en`.

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
