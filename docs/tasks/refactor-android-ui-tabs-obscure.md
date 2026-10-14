# Task: Tái Cấu Trúc UI Android BSche Bank Sync: Phân Tách Tab Lịch Sử/Tài Khoản, Fix Màu Chữ Tab Bar & Ẩn Mật Khẩu (Obscure) Secret Key

## 1. Thông tin chung
- **Mã Task**: TASK-43
- **Ngày hoàn thành**: 2026-10-14
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent + Gemini QA Auditor
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
- **Phân tách Tab chuẩn UX**:
  - **Tab Lịch sử**: Chỉ hiển thị mini status dịch vụ ("Dịch vụ đang chạy ngầm") và danh sách giao dịch gần đây rộng rãi, chiếm toàn bộ màn hình, kèm ghi chú tự dọn dẹp sau 7 ngày.
  - **Tab Tài khoản**: Tập hợp toàn bộ các thẻ chức năng quản trị: Thông tin Host đã liên kết, Cấu hình Webhook thủ công, Thẻ kiểm tra mô phỏng, và Quyền hệ thống.
- **Obscure Webhook Secret**: Định dạng `inputType="textPassword"` cho ô nhập `etWebhookSecret` để bảo mật, không để lộ Secret Key dạng văn bản thường.
- **Khắc phục màu chữ Tab Bar**:
  - Tab được chọn: Nền `@color/lime` + Chữ đen đậm `@color/bg_dark`.
  - Tab chưa chọn: Nền `@color/panel` + Chữ xám sáng `@color/text_muted` (không bị chìm đen trên nền tối).
  - Cập nhật đồng bộ cả `backgroundTintList` và `setTextColor` trong `MainActivity.kt`.
- Biên dịch lại bản APK mới và cập nhật vào `public/downloads/bsche-sync.apk`.

---

## 3. Các thay đổi chính
1. **`android-sync-app/app/src/main/res/layout/activity_main.xml`**:
   - Tái cấu trúc phân tách `groupHistory` và `groupAccount`.
   - `etWebhookSecret` chuyển sang `inputType="textPassword"`.
   - Tab Bar được định hình style màu tương phản cao.
2. **`android-sync-app/app/src/main/java/com/bsche/banksync/MainActivity.kt`**:
   - `showTab`: Cập nhật đồng thời `backgroundTintList` và `setTextColor` cho cả 2 tab.
3. **`public/downloads/bsche-sync.apk`**:
   - Được cập nhật bản build mới nhất (LastWriteTime: 21:53:48).

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **Android Build**: `clean assembleDebug` SUCCESS (0 errors).
- [x] **ESLint (`npm run lint`)**: PASS (0 errors, 0 warnings).
- [x] **TypeScript (`npx tsc --noEmit`)**: PASS (0 errors).
- [x] **Next.js Production Build (`npm run build`)**: PASS (13/13 routes).
- [x] **APK File Ready**: File APK mới đã sẵn sàng tại `public/downloads/bsche-sync.apk`.
