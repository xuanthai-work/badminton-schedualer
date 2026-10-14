# Task: Xóa Bỏ Card Cấu Hình Webhook Thủ Công, Chuyển Nút Kiểm Tra Kết Nối Vào Card Tài Khoản

## 1. Thông tin chung
- **Mã Task**: TASK-46
- **Ngày hoàn thành**: 2026-10-14
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
- **Xóa bỏ hoàn toàn Card "Cấu hình Webhook"**:
  - Gỡ bỏ các ô nhập URL, Secret Key và nút Lưu cấu hình khỏi màn hình Tài khoản.
  - Các thông số kết nối này đã được tự động điền 100% ngầm thông qua cơ chế liên kết tài khoản từ web (`bsche://bind?...`).
- **Tối ưu Card Tài khoản BSche**:
  - Khi đã liên kết: Hiển thị thông tin Host, nút **[Kiểm tra kết nối]** (`btnTestConnection`) để kiểm tra trực tiếp cấu hình trong `prefs`, và nút **[Hủy liên kết]** (`btnUnbind`).
  - Khi chưa liên kết: Ẩn nút Kiểm tra kết nối và nút Hủy liên kết; hiển thị nút [Nhập / dán mã liên kết] và dòng hướng dẫn.
- Tuân thủ quy định: Không chạy lệnh build Gradle (User tự build).

---

## 3. Các thay đổi chính
1. **`android-sync-app/app/src/main/res/layout/activity_main.xml`**:
   - Xóa bỏ `MaterialCardView` Cấu hình Webhook.
   - Thêm nút `btnTestConnection` vào trong `cardAccount`.
2. **`android-sync-app/app/src/main/java/com/bsche/banksync/MainActivity.kt`**:
   - Gỡ bỏ các tham chiếu đến `etWebhookUrl`, `etWebhookSecret`, `btnSaveConfig`, `saveConfig()`.
   - Cập nhật `testConnection()` kiểm tra trực tiếp từ `prefs.webhookUrl` và `prefs.webhookSecret`.
   - Cập nhật `updateAccountUi()` điều khiển ẩn/hiện `btnTestConnection`.

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **XML Syntax**: Hợp lệ 100%.
- [x] **Kotlin Syntax**: Hợp lệ 100%.
- [x] **Build Policy**: Không kích hoạt lệnh build Gradle (User tự build trên máy).
