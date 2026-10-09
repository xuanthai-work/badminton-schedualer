# Task: Giới Hạn Tối Đa 20 Người Tham Gia Cho Trận Đấu (Max Players Hardening)

- **Task ID**: TASK-13
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS**
- **Người thực hiện**: Developer Agent
- **Người kiểm thử / Audit**: Gemini (BA + QA/Auditor)

---

## 1. Mục tiêu & Bối cảnh (Objective)
Trong đợt Pentest / Threat Modeling, hệ thống được phát hiện có nguy cơ bị tấn công **Match Flooding / Slot Exhaustion (DoS)**: Kẻ tấn công hoặc bot có thể gọi lặp RPC `guest_rsvp` hàng nghìn lần để chèn tên người tham gia ảo, gây bão tin nhắn Realtime WebSocket và làm chia loãng tiền sân xuống 0đ khi Host chốt tiền.

Mục tiêu của task là:
1. Đặt giới hạn cứng tối đa **20 người tham gia** (`status = 'yes'`) ở Database Function `guest_rsvp`.
2. Tối ưu trải nghiệm phía Client trên trang Public Match Link (`/m/[matchId]`): Khóa nút và thông báo "Đã đủ người (20/20)" khi đạt mốc, đồng thời cho phép người đã tham gia hủy đăng ký để nhường slot.
3. Bắt lỗi `match_full` và hỗ trợ đa ngôn ngữ (VI/EN).

---

## 2. Các thay đổi kỹ thuật (Scope of Changes)

### 2.1. Database RPC (`supabase/reset-database.sql`)
- Cập nhật hàm `public.guest_rsvp`:
  - Trước khi chèn/cập nhật, nếu `p_status = 'yes'`, tiến hành đếm số người tham gia hiện tại (loại trừ chính `p_guest_id` nếu người này đã có trong danh sách).
  - Nếu `current_yes_count >= 20`, chặn lại với `raise exception 'match_full';`.
  - Nếu `p_status = 'no'`, luôn cho phép để người dùng có thể nhường slot.

### 2.2. Giao diện Public Match Link (`src/app/m/[matchId]/page.tsx`)
- Thêm biến `isFull = yesPeople.length >= 20;`.
- Khi `isFull` và người xem chưa đăng ký: Hiển thị nút disabled với nhãn `t("publicMatch.matchFull")` (cursor-not-allowed).
- Người xem đã đăng ký `status = 'yes'` vẫn có nút `cancelRsvp` ("Hủy đăng ký").
- Bắt lỗi trong `submitRsvp`: Khi gặp chuỗi `match_full`, ném lỗi thân thiện `t("publicMatch.matchFullError")`.

### 2.3. Đa ngôn ngữ (`src/lib/i18n/translations.ts`)
- Bổ sung 2 keys trong `publicMatch`:
  - `matchFull`: `"Đã đủ người (20/20)"` (VI) / `"Match is full (20/20)"` (EN).
  - `matchFullError`: `"Buổi đánh đã đủ 20 người tham gia, không thể đăng ký thêm."` (VI) / `"This match has reached the maximum limit of 20 participants."` (EN).

---

## 3. Kết quả nghiệm thu (Acceptance Criteria Verification)

| Tiêu chí | Nội dung kiểm tra | Kết quả | Ghi chú |
|:---|:---|:---:|:---|
| **AC 1** | Database limit (Hard Cap) | **PASS** | `guest_rsvp` kiểm tra `current_yes_count >= 20` và ném `match_full` khi cố thêm người thứ 21. |
| **AC 2** | Public UI feedback | **PASS** | Nút chuyển sang disabled với nhãn *"Đã đủ người (20/20)"* khi `yesPeople.length >= 20`. |
| **AC 3** | Nhường Slot | **PASS** | Người đã tham gia vẫn bấm được *"Hủy đăng ký"*. Khi giảm xuống dưới 20, slot tự động mở lại cho người khác. |
| **AC 4** | Catch Exception | **PASS** | Ngoại lệ `match_full` từ RPC được bắt và hiển thị thông báo thân thiện. |
| **AC 5** | i18n | **PASS** | Đầy đủ bản dịch VI và EN trong `translations.ts`. |
| **AC 6** | Static Checks | **PASS** | `npx tsc --noEmit` và `npm run lint` đạt 0 lỗi (Exit code 0). Không chạy `npm run build`. |

---

## 4. Kết luận
Task đã được kiểm thử, audit chất lượng và chính thức **PASS**. Sẵn sàng đưa vào sử dụng.
