# Task: Tự Động Thêm Host Vào Danh Sách Tham Gia Khi Tạo Buổi Đánh (Auto Host RSVP)

- **Task Name**: Auto Host RSVP
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria)

---

## 1. Objective
1. **Tự động thêm Host vào danh sách tham gia**:
   - Khi Host tạo một buổi đánh mới (`CreateMatchPanel`), hệ thống tự động thêm chính Host vào danh sách người tham gia (`match_guests`) với trạng thái `status: 'yes'`.
   - Ngay sau khi tạo trận, số lượng người tham gia bắt đầu từ **1 người**.
   - Tên của Host hiển thị đầu danh sách ở cả màn hình Chi tiết trận (`/dashboard/matches/[id]`) và Magic Link (`/m/[id]`).
2. **Xử lý trạng thái thanh toán của Host khi chốt sổ**:
   - Khi chốt tiền buổi đánh (`settle_match` và Sổ thu tiền `/dashboard/debts`), Host là người thu tiền nên suất của Host được tính là **Đã thanh toán (`confirmed`)** và không hiện nút xác nhận tiền cho chính mình.

---

## 2. Scope & Thay đổi chi tiết
- `src/app/dashboard/CreateMatchPanel.tsx`:
  - Trong `handleCreate`, tự động gọi RPC `guest_rsvp` thêm Host với tên hiển thị của Host.
- `src/app/dashboard/matches/[matchId]/page.tsx`:
  - Trong `ParticipantList`, suất của chính Host (`isSelf`) luôn có `paymentStatus = "confirmed"` và ẩn nút xác nhận nộp tiền.
- `src/app/dashboard/debts/page.tsx`:
  - Trong `LedgerPage`, khi duyệt người tham gia, nếu `row.guest_id === uid` thì tự động gán `status: "confirmed"`.
- `supabase/match-guests.sql`:
  - Trong `settle_match`, bổ sung lệnh cập nhật `payment_status = 'confirmed'` cho Host (`guest_id = auth.uid()::text`).

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Tự động thêm Host khi tạo trận | **PASS** | `CreateMatchPanel.tsx` gọi RPC `guest_rsvp` ngay sau khi insert trận. |
| **AC 2** | Số người tham gia hiển thị 1 người | **PASS** | Dashboard và Chi tiết trận đếm đúng suất của Host. |
| **AC 3** | Magic Link hiển thị tên Host | **PASS** | RPC `get_public_match` trả về Host trong danh sách guests. |
| **AC 4** | Trạng thái thanh toán của Host | **PASS** | Tự động `confirmed` ở cả chi tiết trận lẫn Sổ thu tiền. |
| **AC 5** | Không chạy build/test | **PASS** | Developer Agent tuân thủ nghiêm ngặt. |

---

## 4. Verification Gates
- Đã audit trực tiếp trên mã nguồn `src/app/dashboard/CreateMatchPanel.tsx`, `src/app/dashboard/matches/[matchId]/page.tsx`, `src/app/dashboard/debts/page.tsx`, `supabase/match-guests.sql`. Không chạy build lệnh theo yêu cầu User.
