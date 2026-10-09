# Task: Loại Bỏ Hoàn Toàn Chuông Thông Báo (Remove NotificationBell)

- **Task Name**: Remove NotificationBell
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria)

---

## 1. Objective
Gỡ bỏ hoàn toàn icon và tính năng Chuông thông báo (`NotificationBell`) khỏi toàn bộ ứng dụng:
1. **Làm sạch Header & Tối giản giao diện**: Header của các trang chính (`/dashboard`, `/dashboard/debts`, `/dashboard/profile`) chỉ giữ lại tiêu đề, avatar và các thông tin thiết yếu.
2. **Loại bỏ Realtime dư thừa**: Ngừng lắng nghe các sự kiện realtime cũ từ bảng `notifications` không còn phù hợp với mô hình Magic Link.
3. **Dọn dẹp mã nguồn**: Gỡ bỏ component `NotificationBell.tsx` khỏi codebase.

---

## 2. Scope & Thay đổi chi tiết
- `src/app/dashboard/page.tsx`: Gỡ bỏ import và thẻ `<NotificationBell />`.
- `src/app/dashboard/debts/page.tsx`: Gỡ bỏ import và thẻ `<NotificationBell />`.
- `src/app/dashboard/profile/page.tsx`: Gỡ bỏ import và thẻ `<NotificationBell />`.
- `src/components/NotificationBell.tsx`: Xóa bỏ component.

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Header sạch sẽ trên toàn bộ các trang | **PASS** | Không còn icon chuông ở Dashboard, Sổ thu tiền, Profile. |
| **AC 2** | Layout header tự nhiên, không lệch vị trí | **PASS** | Căn chỉnh flex header gọn gàng, đẹp mắt. |
| **AC 3** | Không còn tham chiếu `NotificationBell` | **PASS** | Grep codebase trả về 0 tham chiếu. |
| **AC 4** | Không chạy build/test để bảo vệ dev server | **PASS** | Developer Agent tuân thủ nghiêm ngặt. |

---

## 4. Verification Gates
- Đã audit trực tiếp trên git working tree. Không chạy build lệnh theo yêu cầu User.
