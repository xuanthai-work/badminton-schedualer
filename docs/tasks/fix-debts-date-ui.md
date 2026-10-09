# Task: Fix UI Ngày Tháng & Địa Điểm Trên Trang Sổ Thu Tiền

- **Task Name**: Fix Debts Date & Venue UI
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria)

---

## 1. Objective
Tối ưu hiển thị các thẻ trận đấu trên trang Sổ thu tiền (`/dashboard/debts`):
1. **Tiêu đề thông minh (Relative Date)**: Tiêu đề thẻ trận đấu hiển thị theo ngày tương đối (`formatMatchHeading`): *"Hôm nay, dd/MM/yyyy"*, *"Ngày mai..."*, *"Hôm qua..."*, hoặc *"Thứ [Mấy], dd/MM/yyyy"* (đồng bộ 100% với Dashboard và Chi tiết trận).
2. **Loại bỏ trùng lặp thông tin**: Dòng phụ bên dưới tiêu đề chỉ hiển thị **Tên sân / Địa điểm** (`match.location`). Xóa bỏ hoàn toàn phần ngày tháng bị lặp lại thừa thãi.

---

## 2. Scope & Thay đổi chi tiết
- `src/app/dashboard/debts/page.tsx`:
  - Bổ sung helper `formatMatchHeading(dateStr: string)`.
  - Tiêu đề thẻ trận dùng `formatMatchHeading(match.matchDate)`.
  - Dòng phụ bên dưới chỉ render `match.location` (bỏ `{formatDate(match.matchDate)} · `).

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Tiêu đề ngày thông minh tương đối | **PASS** | Sử dụng `formatMatchHeading(match.matchDate)` khớp 100% format Dashboard. |
| **AC 2** | Loại bỏ trùng lặp ngày, chỉ hiện địa điểm | **PASS** | Dòng phụ chỉ render `{match.location}` khi có giá trị. |
| **AC 3** | Không chạy build/test để bảo vệ dev server | **PASS** | Developer Agent tuân thủ nghiêm ngặt, không gây lỗi cache. |

---

## 4. Verification Gates
- Đã audit trực tiếp trên mã nguồn `src/app/dashboard/debts/page.tsx` (dòng 348-355). Không chạy build lệnh theo yêu cầu User.
