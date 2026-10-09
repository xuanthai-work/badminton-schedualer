# Task: Tối Ưu Trang Tài Khoản - Gỡ Bỏ Tag Cá Nhân & Upload QR Tĩnh

- **Task Name**: Profile Cleanup - Remove Tag & Static QR
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria)

---

## 1. Objective
1. **Gỡ bỏ hoàn toàn Tag cá nhân (ví dụ `#0429`)**:
   - Tag trước đây dùng để tìm kiếm/kết bạn (tính năng đã bỏ). Trong mô hình Match-Centric + Magic Link hiện tại, Tag không còn bất kỳ mục đích sử dụng nào.
   - Xóa bỏ form Tag trong trang Tài khoản (`/dashboard/profile`).
   - Xóa bỏ banner cảnh báo thiếu Tag gây phiền toái trên Trang chủ (`/dashboard`).
   - Xóa bỏ hiển thị `#tag` cạnh tên người dùng ở Sổ thu tiền (`/dashboard/debts`).
2. **Gỡ bỏ mục Upload ảnh QR tĩnh của Host**:
   - Hệ thống thanh toán Magic Link đã tự động sinh mã VietQR động chuẩn Napas (điền sẵn chính xác số tiền và cú pháp chuyển khoản cho từng người).
   - Hệ thống chỉ cần Host điền đúng 3 trường: **Ngân hàng (`bankId`)**, **Số tài khoản (`bankAccount`)**, và **Tên chủ tài khoản (`bankAccountName`)**.
   - Mục upload ảnh QR tĩnh thủ công trong Profile là hoàn toàn thừa thãi và gây hiểu nhầm, đã được loại bỏ sạch sẽ.

---

## 2. Scope & Thay đổi chi tiết
- `src/app/dashboard/profile/page.tsx`:
  - Đã xóa mục Tag, hằng số regex, các state liên quan.
  - Đã xóa khối upload mã QR tĩnh (`ImageUpload` bucket `bank-qr`), chỉ giữ form 3 trường thông tin ngân hàng.
- `src/app/dashboard/page.tsx`:
  - Đã xóa state `tagMissing` và banner cảnh báo thiếu tag.
- `src/app/dashboard/debts/page.tsx`:
  - Đã xóa hiển thị `#tag` cạnh tên người dùng.

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Profile sạch Tag | **PASS** | Không còn form hay ký tự `#tag` nào trong trang Profile. |
| **AC 2** | Profile sạch QR tĩnh, giữ nguyên form ngân hàng | **PASS** | Form ngân hàng giữ nguyên 3 trường thiết yếu (Ngân hàng, Số TK, Tên chủ TK). |
| **AC 3** | Trang chủ sạch banner Tag | **PASS** | Gỡ bỏ hoàn toàn banner cảnh báo vàng. |
| **AC 4** | Sổ thu tiền không còn `#tag` | **PASS** | Danh sách người nộp chỉ hiển thị tên. |
| **AC 5** | Không chạy build/test để bảo vệ dev server | **PASS** | Developer Agent tuân thủ nghiêm ngặt. |

---

## 4. Verification Gates
- Đã audit trực tiếp trên mã nguồn `src/app/dashboard/profile/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/debts/page.tsx`. Không chạy lệnh build để bảo toàn dev server.
