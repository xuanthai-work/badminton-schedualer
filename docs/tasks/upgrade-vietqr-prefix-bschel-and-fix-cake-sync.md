# Task Documentation: TASK-38 - Nâng Cấp Mã VietQR Sang BSCHEL, Sửa Dịch Vụ Bắt Thông Báo Cake Cho Android

## 1. Thông Tin Chung
- **Task ID**: TASK-38
- **Tên Task**: Upgrade VietQR Prefix to BSCHEL, Fix Cake Package Listener & Service Binding on Android
- **Ngày hoàn thành**: 2026-10-12
- **Người thực hiện**: Developer Agent (OpenCode) + Gemini (QA & Refinement)
- **QA & Technical Auditor**: Gemini (BA + QA)
- **Trạng thái**: **PASS**

---

## 2. Bối Cảnh & Mục Tiêu

### Vấn đề:
1. Tiền tố cũ `BS <mã_trận> <mã_người>` ngắn và có thể trùng lặp ngẫu nhiên với các giao dịch khác. Người dùng yêu cầu đổi sang chuẩn độc quyền duy nhất: `BSCHEL <mã_trận> <mã_người>`, và **bỏ hoàn toàn tiền tố `BS` cũ**.
2. Trên máy Android (Poco X3 Pro / MIUI 13):
   - Service lắng nghe thông báo `BankNotificationListenerService` khai báo `android:exported="false"` trong Manifest khiến hệ điều hành Android (`system_server`) trên MIUI không thể bind vào service để đẩy thông báo.
   - App Cake trên máy người dùng có package name là `xyz.be.cake`.
   - Cú pháp thông báo biến động số dư của Cake là `"Số dư tài khoản của bạn vừa tăng 10.000 đ..."` (không có dấu `+`), khiến bộ parse số tiền cũ không bắt được số tiền.
   - MIUI hay ngắt kết nối ngầm các dịch vụ thông báo nền nếu không có cơ chế rebind.

### Mục tiêu:
1. Nâng cấp memo chuyển khoản VietQR trên Web thành `BSCHEL <mã_trận> <mã_người>`.
2. Webhook server chỉ chấp nhận duy nhất cú pháp `BSCHEL`, từ chối các mã khác để tránh false positives.
3. Trong Android App:
   - Đặt `android:exported="true"` kèm permission `BIND_NOTIFICATION_LISTENER_SERVICE`.
   - Khóa chính xác package listener: `xyz.be.cake` (và dự phòng `vn.cake.banking`).
   - Chỉ lọc thông báo có chứa từ khóa `BSCHEL`.
   - Nâng cấp regex parse số tiền nhận diện cả cụm `"vừa tăng 10.000 đ"` của Cake.
   - Bổ sung hàm tự động ép MIUI kết nối lại dịch vụ (`rebindNotificationService`) mỗi khi mở app hoặc test kết nối.

---

## 3. Chi Tiết Kỹ Thuật

### 3.1. Web & Server
- `src/app/m/[matchId]/page.tsx`:
  ```ts
  const memo = `BSCHEL ${shortMatch} ${shortGuest}`;
  ```
- `src/app/api/webhook/bank-payment/route.ts`:
  ```ts
  const TRANSFER_CODE = /BSCHEL\s+([A-Fa-f0-9]{6,8})\s+([A-Fa-f0-9]{4,8})/i;
  const TRANSFER_CODE_LOOSE = /BSCHEL\s+([A-Za-z0-9]{6,8})\s+([A-Za-z0-9]{4,8})/i;
  ```
- `scripts/test-webhook.ps1`: Cập nhật cú pháp mẫu sang `BSCHEL`.

### 3.2. Android App (`android-sync-app`)
- `AndroidManifest.xml`: Đổi service sang `android:exported="true"`.
- `BankNotificationListenerService.kt`:
  - `CAKE_PACKAGE = "xyz.be.cake"`
  - `BSCHEL_MARKER = "BSCHEL"`
  - `AMOUNT_REGEX = Regex("""(?:\+|vừa tăng\s+)([0-9][0-9.,]*)\s*(?:VND|đ|₫)?""", RegexOption.IGNORE_CASE)`
- `MainActivity.kt`: Thêm hàm `rebindNotificationService()` sử dụng cơ chế toggle component state nhằm ép `system_server` bind lại service mà không kill process.

---

## 4. Kết Quả Kiểm Thử (Verification Gates)

| Gate | Lệnh Thực Thi | Kết Quả |
|------|---------------|---------|
| ESLint | `npm run lint` | **PASS** |
| TypeScript | `npx tsc --noEmit` | **PASS** |
| Next.js Build | `npm run build` | **PASS** |
