# Task Documentation: TASK-21 - Tối Ưu Nút Tải VietQR Trên iOS Safari Bằng Web Share API

## 1. Thông tin chung
- **Task ID**: `TASK-21`
- **Tên Task**: Tối Ưu Nút Tải VietQR Trên iOS Safari Bằng Web Share API (Lưu Trực Tiếp Vào Photos)
- **Ngày hoàn thành**: 2026-10-09
- **Người thực hiện**: Developer Agent
- **Người kiểm thử / Audit**: Gemini (BA + QA/Auditor)
- **Trạng thái**: **PASS**

---

## 2. Mục tiêu & Vấn đề giải quyết
- **Vấn đề trên iPhone Safari**: Thao tác tải tệp qua thẻ `<a download>` truyền thống trên iOS Safari luôn lưu file vào thư mục "Downloads" trong ứng dụng "Tệp" (Files app), không thể lưu trực tiếp vào thư mục "Ảnh" (Apple Photos / Cuộn camera) do cơ chế sandbox bảo mật của Apple.
- **Giải pháp**: Tích hợp chuẩn **Web Share API Level 2** (`navigator.share({ files: [file] })`). Khi bấm nút "Tải ảnh QR" trên iPhone Safari, hệ thống sẽ mở bảng **Share Sheet** gốc của iOS có tùy chọn **"Lưu hình ảnh" (Save Image)** để đưa ảnh mã QR trực tiếp vào Photos trong 1 chạm.

---

## 3. Chi tiết triển khai

### 3.1. Cập nhật hàm `handleDownloadQr` (`src/app/m/[matchId]/page.tsx`)
- Sau khi fetch blob ảnh từ VietQR, đóng gói thành đối tượng `File` (`image/png`):
  ```typescript
  const fileName = `vietqr-${bankAccount ?? "code"}.png`;
  const file = new File([blob], fileName, { type: "image/png" });
  ```
- Kiểm tra hỗ trợ chia sẻ tệp qua `navigator.canShare({ files: [file] })`.
- Gọi `navigator.share({ files: [file], title: "Mã VietQR" })` để mở bảng Share Sheet của hệ điều hành iOS/Android.
- Bắt lỗi `AbortError` nhẹ nhàng khi người dùng chủ động đóng/hủy bảng chia sẻ.
- Giữ nguyên cơ chế fallback dùng thẻ `<a download>` và `URL.createObjectURL(blob)` cho Desktop và các trình duyệt không hỗ trợ Web Share API.

---

## 4. Kết quả QA / Technical Audit

- **Typecheck (`npx tsc --noEmit`)**: PASS (0 lỗi).
- **ESLint (`npm run lint`)**: PASS (0 cảnh báo / lỗi).
- **Acceptance Criteria Verification**:
  - [x] Tích hợp thành công `navigator.share` với đối tượng `File` ảnh PNG.
  - [x] Hỗ trợ mở iOS Share Sheet để bấm "Lưu hình ảnh" (Save Image) vào Photos.
  - [x] Xử lý êm đẹp `AbortError` khi người dùng bấm Hủy.
  - [x] Bảo toàn cơ chế tải file truyền thống trên PC / Desktop.
  - [x] Tuân thủ tuyệt đối quy định không chạy `npm run build`.
