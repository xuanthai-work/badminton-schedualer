# TASK-60: Rút Gọn Nút Trạng Thái "Đã Khóa" Và Sửa Lỗi Hiển Thị Badge Khóa Tại Trang Chủ

## 1. Thông tin chung
- **Task ID**: TASK-60
- **Ngày hoàn thành**: 2026-10-26
- **Trạng thái QA**: **PASS**
- **Phạm vi tác động**:
  - `src/lib/i18n/translations.ts`
  - `src/app/dashboard/page.tsx`
  - `src/app/m/[matchId]/page.tsx`

---

## 2. Bối cảnh & Yêu cầu
1. **Rút gọn chữ nút khóa**: Nút toggle trạng thái điểm danh trước đó hiển thị text `"Đã khóa đăng ký"` quá dài khiến chữ bị ngắt thành 2 dòng ("Đã khóa đăng / ký"). Cần đổi thành `"Đã khóa"` ngắn gọn, không bị đẩy dòng.
2. **Sửa lỗi hiển thị badge tại Trang chủ**: Khi một trận đấu đã bị khóa đăng ký (`rsvp_locked: true`), trên thẻ trận đấu ở trang Dashboard vẫn hiển thị badge màu xanh `"ĐANG MỞ"`. Cần đồng bộ badge thành `"ĐÃ KHÓA"` (màu đỏ rose).

---

## 3. Chi tiết Triển khai
1. **Từ điển đa ngôn ngữ (`src/lib/i18n/translations.ts`)**:
   - `match.statusLocked`: Đổi từ `"Đã khóa đăng ký"` thành `"Đã khóa"` (tiếng Anh: `"Locked"`).
   - `matches.statusLocked`: Bổ sung `"Đã khóa"` (tiếng Anh: `"Locked"`).
   - `publicMatch.statusLocked`: Bổ sung `"Đã khóa"` (tiếng Anh: `"Locked"`).

2. **Dashboard (`src/app/dashboard/page.tsx`)**:
   - Bổ sung `rsvpLocked: boolean` vào kiểu dữ liệu `HostMatch`.
   - Cập nhật hàm `loadMatches()`:
     - Truy vấn thêm cột `rsvp_locked` từ bảng `matches`.
     - Map trường `rsvpLocked: Boolean(row.rsvp_locked)`.
   - Cập nhật logic hiển thị badge trạng thái trên card trận đấu:
     - `match.status === "closed"`: Badge xám `"ĐÃ CHỐT"`.
     - `match.rsvpLocked`: Badge đỏ rose (`border-rose-500/30 bg-rose-500/20 text-rose-300`) `"ĐÃ KHÓA"`.
     - `match.status === "open"`: Badge xanh emerald `"ĐANG MỞ"`.

3. **Public Match Link (`src/app/m/[matchId]/page.tsx`)**:
   - Cập nhật badge trạng thái ở header để hiển thị `"ĐÃ KHÓA"` khi trận đấu mở nhưng đã khóa nhận thêm người mới.

---

## 4. Kết quả Nghiệm thu (Acceptance Criteria)
- [x] Text nút khóa tại trang chi tiết trận đấu (`src/app/dashboard/matches/[matchId]`) hiển thị gọn gàng là **"Đã khóa"**, không bị vỡ/ngắt thành 2 dòng.
- [x] Tại trang chủ (`/dashboard`), các trận đấu đang mở nhưng có `rsvp_locked = true` hiển thị badge **"ĐÃ KHÓA"** (màu đỏ rose) thay vì "ĐANG MỞ".
- [x] Khi host mở lại đăng ký, badge ngoài trang chủ chuyển ngay về **"ĐANG MỞ"** (màu xanh emerald).
- [x] Khi trận đấu đã chốt sổ chi phí, badge hiển thị **"ĐÃ CHỐT"** (màu xám).
- [x] Đã vượt qua toàn bộ Verification Gates:
  - Lint: `npm run lint` (0 error, 0 warning)
  - Typecheck: `npx tsc --noEmit` (PASS)
  - Build: `npm run build` (PASS)
