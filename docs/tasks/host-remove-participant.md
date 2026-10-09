# Task: Host Có Quyền Xóa Người Tham Gia (Kể Cả Host) Kèm Modal Xác Nhận

- **Task Name**: Host Remove Participant
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria)

---

## 1. Objective
1. **Nút Xóa người tham gia (Bao gồm cả chính Host)**:
   - Trên màn hình Chi tiết trận của Host (`/dashboard/matches/[matchId]`), ở mọi người trong danh sách tham gia (kể cả Host), hiển thị nút Xóa (icon thùng rác `Trash2`).
   - Cho phép Host rút tên mình khỏi danh sách tham gia nếu chỉ đặt sân hộ nhóm hoặc có việc bận đột xuất không đánh được (Host vẫn giữ quyền quản trị buổi đánh).
2. **Popup xác nhận (Confirmation Modal)**:
   - Khi Host bấm nút Xóa, hiển thị modal xác nhận với nền đặc chống xuyên thấu:
     - Tiêu đề: *"Xóa người tham gia?"*
     - Nội dung: Phân biệt rõ khi xóa khách khác và khi rút tên chính mình.
     - **Bố cục nút bắt buộc**: Nút **"Xác nhận xóa" nằm ở BÊN TRÁI**, nút **"Hủy" nằm ở BÊN PHẢI**.
3. **Tự động tính lại tiền nếu trận đã chốt sổ**:
   - Nếu trận đã chốt (`closed`), khi xóa người chơi, hệ thống tự động gọi `recompute_split` để tính lại tiền chia đều cho những người còn lại.

---

## 2. Scope & Thay đổi chi tiết
- `supabase/match-guests.sql`:
  - Thêm RPC `public.host_remove_guest(p_match_id, p_guest_id)`:
    - Kiểm tra caller là `created_by` của match.
    - Xóa khách khỏi `match_guests`.
    - Tự động gọi `recompute_split(p_match_id)` nếu trận đã chốt (`closed`).
- `src/lib/i18n/translations.ts`:
  - Thêm `removeGuestTitle`, `removeGuestBody`, `removeSelfBody`, `removeGuestBtn` cho vi và en.
- `src/app/dashboard/matches/[matchId]/page.tsx`:
  - Trong `ParticipantList`: Thêm icon `Trash2` cho mọi người chơi.
  - Thêm Modal xác nhận với nút Xác nhận xóa bên Trái, nút Hủy bên Phải.

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Nút xóa cho mọi người trong danh sách | **PASS** | Icon `Trash2` xuất hiện ở mọi người chơi (kể cả chính Host). |
| **AC 2** | Popup xác nhận chuẩn vị trí nút | **PASS** | Nút "Xác nhận xóa" nằm BÊN TRÁI, nút "Hủy" nằm BÊN PHẢI. |
| **AC 3** | Nội dung popup khi xóa chính mình | **PASS** | Hiển thị lời nhắc rút tên mà vẫn giữ quyền quản lý buổi đánh. |
| **AC 4** | Xóa thành công & Tự động chia lại tiền | **PASS** | Gọi RPC `host_remove_guest`, tự động recompute split khi closed. |
| **AC 5** | Không chạy build/test | **PASS** | Developer Agent tuân thủ nghiêm ngặt. |

---

## 4. Verification Gates
- Đã audit trực tiếp trên mã nguồn `src/app/dashboard/matches/[matchId]/page.tsx` (dòng 532-560, 668-677), `supabase/match-guests.sql`. Không chạy build lệnh theo yêu cầu User.
