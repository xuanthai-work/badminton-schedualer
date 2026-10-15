# Task: Khắc Phục Cảnh Báo Next.js Image Aspect Ratio Trên Ảnh QR Code

## 1. Thông tin chung
- **Mã Task**: TASK-47
- **Ngày hoàn thành**: 2026-10-15
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
- Loại bỏ cảnh báo của Next.js trong browser console khi hiển thị ảnh QR code:
  `Image with src "..." has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.`
- Đảm bảo hiển thị chuẩn xác tỉ lệ 1:1, không bị co méo và không gây Layout Shift (CLS).

---

## 3. Các thay đổi chính
1. **`src/app/m/[matchId]/page.tsx`**:
   - Thêm `className="h-auto w-auto"` vào component `<Image>` render VietQR trong `GuestPayment`.
2. **`src/app/dashboard/profile/page.tsx`**:
   - Thêm `className="h-auto w-auto"` vào component `<Image>` render QR Code liên kết app Android BSche Bank Sync.

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **TypeScript Check**: `npx tsc --noEmit` hoàn tất không có lỗi.
- [x] **Lint Check**: `npm run lint` đạt chuẩn 100%.
- [x] **Code Review**: Thay đổi tối giản, đúng tiêu chuẩn khuyến nghị chính thức của Next.js, triệt tiêu warning runtime mà không ảnh hưởng đến giao diện hay chức năng.
