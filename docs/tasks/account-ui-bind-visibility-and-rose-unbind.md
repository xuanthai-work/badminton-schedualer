# Task: Tối Ưu Màn Hình Tài Khoản Android: Ẩn Nút Bind Khi Đã Liên Kết, Đổi Màu Nút Hủy Liên Kết Dễ Nhìn (Rose/Đỏ Nhẹ)

## 1. Thông tin chung
- **Mã Task**: TASK-45
- **Ngày hoàn thành**: 2026-10-14
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
- **Khi đã liên kết (`prefs.isBound == true`)**:
  - Tự động ẩn nút "Nhập / dán mã liên kết" (`btnBindManual`) và ẩn dòng hướng dẫn mở web (`tvAccountHint`).
  - Chỉ hiển thị duy nhất nút **[Hủy liên kết]** (`btnUnbind`).
- **Khi chưa liên kết (`prefs.isBound == false`)**:
  - Hiển thị nút "Nhập / dán mã liên kết" và dòng hướng dẫn mở web.
  - Tự động ẩn nút [Hủy liên kết].
- **Màu sắc nút Hủy liên kết**:
  - Chuyển sang chữ và viền màu **Rose / Đỏ nhẹ** (`@color/rose` `#FB7185`) rõ nét, tương phản cao, không còn bị chìm đen trên nền tối.
- Không chạy lệnh build Gradle (User sẽ tự build).

---

## 3. Các thay đổi chính
1. **`android-sync-app/app/src/main/res/layout/activity_main.xml`**:
   - Gán ID `tvAccountHint` cho dòng text hướng dẫn.
   - Sửa style `btnUnbind`: `android:textColor="@color/rose"`, `app:strokeColor="@color/rose"`, `app:strokeWidth="1dp"`.
2. **`android-sync-app/app/src/main/java/com/bsche/banksync/MainActivity.kt`**:
   - Cập nhật logic `updateAccountUi()` để ẩn/hiện nút tương ứng theo trạng thái `isBound`.

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **XML Syntax**: Hợp lệ 100%.
- [x] **Kotlin Syntax**: Hợp lệ 100%.
- [x] **Build Policy**: Không kích hoạt lệnh build Gradle (User tự build trên máy).
