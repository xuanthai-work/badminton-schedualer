# Task: Nâng Cấp Toàn Diện BSche Bank Sync: Onboarding Cấp Quyền Tự Động, Tự Xóa Lịch Sử 7 Ngày, Màn Tài Khoản Bind QR/DeepLink Từ Web & Universal Bank Parser

## 1. Thông tin chung
- **Mã Task**: TASK-42
- **Ngày hoàn thành**: 2026-10-14
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent + Gemini QA Auditor
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
- **Onboarding Cấp quyền tự động**: Khi mở app Android Sync, nếu chưa đủ quyền, tự động hiển thị Setup Wizard hướng dẫn 3 bước trực quan: Quyền đọc thông báo, Bỏ giới hạn pin (Battery Optimization), và Mẹo khóa đa nhiệm/Tự khởi chạy cho MIUI/HyperOS (Poco/Xiaomi).
- **Tự động dọn dẹp lịch sử 7 ngày**: Tự động xóa các bản ghi giao dịch trong SQLite nội bộ có thời gian tạo vượt quá 7 ngày (`cleanOldTransactions`).
- **Màn hình Tài khoản & Bind 1-chạm từ Web**:
  - Phía Web (`/dashboard/profile`): Thêm khối "Ứng dụng Đồng bộ Ngân hàng (Android APK)" với nút tải file APK trực tiếp (`/downloads/bsche-sync.apk`) và nút mở Modal mã QR liên kết / Deep link `bsche://bind?...` chứa thông tin cấu hình tự động.
  - Phía Android App: Thêm màn hình Tài khoản hiển thị thông tin Host đã liên kết, hỗ trợ quét mã QR liên kết hoặc nhận Deep Link để tự động điền cấu hình Webhook mà không cần gõ tay.
- **Universal Bank Parser**: Nâng cấp bộ bắt thông báo ngân hàng tổng quát:
  - Lắng nghe mọi thông báo có chứa từ khóa `BSCHEL` hoặc `BS ` từ danh sách ngân hàng phổ biến (VCB, MB, Techcombank, TPBank, VPBank, ACB, BIDV, VietinBank, Cake, Timo, v.v.) và chế độ Universal bắt mọi app.
  - Bóc tách số tiền bằng thuật toán Regex đa tầng (bắt cả dạng `+50.000VND`, `vừa tăng 50.000 đ`, `nhận được 75.000đ`, `ghi có 100,000`, v.v.).

---

## 3. Các thay đổi chính

1. **`android-sync-app/` (Android Core & UI)**:
   - `BankNotificationListenerService.kt`: Tích hợp Universal Matcher cho `BSCHEL` & `BS `, thuật toán `parseAmount` đa tầng 3 cấp regex, nhận diện nhãn ngân hàng (Cake, VCB, MB, TCB, TPB, VPB, ACB, BIDV, VTB, TIMO), tự động gọi dọn dẹp lịch sử cũ hơn 7 ngày khi nhận giao dịch mới.
   - `TransactionDbHelper.kt`: Bổ sung hàm `cleanOldTransactions(days: Int = 7)`.
   - `Prefs.kt`: Bổ sung lưu trữ `hostName`, `hostId`, `boundAt`, `isBound`, `clearBinding()`.
   - `MainActivity.kt`: Tích hợp `maybeShowOnboarding` kiểm tra quyền notification & pin, phát hiện thiết bị MIUI/Xiaomi để hiển thị hướng dẫn autostart/khóa đa nhiệm, xử lý deep link `bsche://bind`, giao diện chuyển tab Lịch sử <-> Tài khoản.
   - `res/layout/activity_main.xml` & `dialog_onboarding.xml`: Giao diện Dark + Lime BSche cho màn hình Tài khoản và hộp thoại cấp quyền Onboarding.

2. **Web App (`src/app/dashboard/profile/page.tsx` & `/api/bank-sync/config`)**:
   - Thêm Card "Ứng dụng Đồng bộ Ngân hàng (BSche Bank Sync APK)".
   - Nút tải file APK `/downloads/bsche-sync.apk`.
   - Modal liên kết hiển thị mã QR và nút mở deep link `bsche://bind?...`.
   - API endpoint `/api/bank-sync/config` cấp cấu hình webhook an toàn.
   - File APK mới đã được build và đưa vào `public/downloads/bsche-sync.apk`.

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **ESLint (`npm run lint`)**: PASS (0 errors, 0 warnings)
- [x] **TypeScript Typecheck (`npx tsc --noEmit`)**: PASS (0 errors)
- [x] **Next.js Production Build (`npm run build`)**: PASS (13/13 routes biên dịch thành công)
- [x] **Android Build & APK Delivery**: File `public/downloads/bsche-sync.apk` đã sẵn sàng tải về.
