# Task Documentation: TASK-16 - Bổ Sung Nút Tải Ảnh VietQR Trên Trang Magic Match Link

## 1. Thông tin chung
- **Task ID**: `TASK-16`
- **Tên Task**: Bổ Sung Nút Tải Ảnh VietQR Trên Trang Magic Match Link (Add Download QR Code Image Button)
- **Ngày hoàn thành**: 2026-10-09
- **Người thực hiện**: Developer Agent
- **Người kiểm thử / Audit**: Gemini (BA + QA/Auditor)
- **Trạng thái**: **PASS**

---

## 2. Mục tiêu & Vấn đề giải quyết
Trên trang xem trận đấu công khai (`/m/[matchId]`), sau khi chủ sân chốt tiền (`status === 'closed'`), người chơi (khách mời) cần thanh toán phần chi phí của mình qua VietQR.
Trước đây, giao diện chỉ hiển thị ảnh mã QR và các nút copy số tài khoản, người dùng trên điện thoại muốn lưu ảnh mã QR để quét qua app ngân hàng phải chụp màn hình hoặc thao tác thủ công phức tạp.
Task này bổ sung nút **"Tải ảnh QR"** (kèm icon `Download` / `Loader2` khi đang tải), hỗ trợ tải blob ảnh về máy và fallback mở ảnh tab mới trên mobile browser, đồng thời nới lỏng CSP `connect-src` để hỗ trợ fetch ảnh từ `https://img.vietqr.io`.

---

## 3. Chi tiết triển khai

### 3.1. Cập nhật CSP (`next.config.ts`)
- Thêm `https://img.vietqr.io` vào directive `connect-src` trong `securityHeaders` để cho phép trình duyệt fetch dữ liệu blob ảnh QR:
  ```typescript
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://img.vietqr.io;
  ```

### 3.2. Đa ngôn ngữ (`src/lib/i18n/translations.ts`)
- Thêm các key `downloadQr` và `downloadingQr` vào mục `publicMatch` của cả tiếng Việt (`vi`) và tiếng Anh (`en`):
  - `vi`: `downloadQr: "Tải ảnh QR"`, `downloadingQr: "Đang tải..."`
  - `en`: `downloadQr: "Download QR"`, `downloadingQr: "Downloading..."`

### 3.3. Cập nhật Component `GuestPayment` (`src/app/m/[matchId]/page.tsx`)
- Import thêm icons `Download` và `Loader2` từ `lucide-react`.
- Thêm state `downloading: boolean` để ngăn chặn spam click và hiển thị hiệu ứng xoay loading.
- Thêm hàm `handleDownloadQr`:
  - Fetch ảnh từ `qrSrc` (`https://img.vietqr.io/...`).
  - Tạo `Blob`, sinh `URL.createObjectURL(blob)` và trigger download file `vietqr-[bankAccount].png`.
  - Thu hồi object URL qua `URL.revokeObjectURL`.
  - Fallback: Trường hợp mobile browser (như Safari iOS) hạn chế tải blob, tự động mở ảnh qua `window.open(qrSrc, "_blank")` để người chơi dễ dàng nhấn giữ lưu ảnh vào thư viện máy.
- Render nút "Tải ảnh QR" trực quan ngay phía dưới khung ảnh QR.

---

## 4. Kết quả QA / Technical Audit

- **Typecheck (`npx tsc --noEmit`)**: PASS (0 lỗi).
- **ESLint (`npm run lint`)**: PASS (0 cảnh báo / lỗi).
- **Acceptance Criteria Verification**:
  - [x] Xuất hiện nút "Tải ảnh QR" dưới mã VietQR khi trận đấu đã chốt tiền.
  - [x] Cơ chế tải ảnh blob hoạt động trơn tru, có fallback trên trình duyệt di động.
  - [x] Trạng thái loading (`Loader2` xoay tròn + disabled) mượt mà.
  - [x] CSP cho phép kết nối `img.vietqr.io`, không phát sinh vi phạm console.
  - [x] Hỗ trợ hoàn chỉnh 2 ngôn ngữ VI và EN.
  - [x] Tuyệt đối không chạy lệnh build ảnh hưởng cache dev server.
