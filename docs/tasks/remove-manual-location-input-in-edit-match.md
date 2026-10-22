# TASK-52: Bỏ Ô Điền Text Sân Trong Modal Chỉnh Sửa Trận Đấu (EditMatchPanel)

## 1. Thông Tin Chung
- **Task ID**: TASK-52
- **Tên Task**: Bỏ ô điền text sân trong modal chỉnh sửa trận đấu (EditMatchPanel)
- **Ngày hoàn thành**: 2026-10-22
- **Trạng thái QA**: **PASS**

---

## 2. Bối Cảnh & Vấn Đề
Trước đây, trong modal **"Sửa thông tin lịch"** ([`src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx)):
- Xuất hiện đồng thời 2 trường dành cho sân thi đấu:
  1. Dropdown chọn sân từ danh sách lưu sẵn (`venues`).
  2. Ô text input nhập tự do "Sân / Địa điểm" (`location`).
- Điều này gây trùng lặp, rối mắt cho người dùng và không đồng bộ với modal **"Tạo buổi đánh"** (`CreateMatchPanel.tsx`) - nơi chỉ sử dụng duy nhất một dropdown chọn sân từ kho sân.

---

## 3. Giải Pháp Triển Khai
1. **Lược bỏ ô text input**:
   - Xóa bỏ input text `location` và nhãn đi kèm.
   - Dọn dẹp key translation `matches.locationPlaceholder` không còn sử dụng.
2. **Chuẩn hóa Dropdown Sân**:
   - Sử dụng dropdown `SelectField` với nhãn `matches.location` ("Sân / Địa điểm") và nút liên kết nhanh `venues.manageVenues` ("Quản lý sân") dẫn sang `/dashboard/venues`.
   - Hiển thị fallback thân thiện khi host chưa có sân nào trong danh sách.
3. **Cơ chế Fallback Sân An Toàn (`CURRENT_VENUE_ID`)**:
   - Khi load modal sửa, nếu sân hiện tại của trận đấu (`match.location`) không tồn tại trong bảng `venues` (ví dụ do sân bị xóa hoặc tạo từ trước đó), hệ thống tự động chèn một synthetic option `{ id: "__current_match_venue__", name: match.location, mapsUrl: match.locationUrl }` để đảm bảo không làm mất dữ liệu sân ban đầu.
4. **Đồng bộ Dữ liệu**:
   - Khi chọn một sân từ dropdown, tự động gán `location` theo tên sân và điền `locationUrl` theo link Google Maps đã lưu của sân đó.
   - Validation bắt buộc phải chọn sân (`venueId` và `location.trim()`) trước khi lưu.

---

## 4. Danh Sách Files Thay Đổi
- [`src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx): Bỏ ô text input `location`, chuẩn hóa dropdown chọn sân và cơ chế synthetic option an toàn.
- [`src/lib/i18n/translations.ts`](file:///D:/work/Stuff/badminton-schedualer/src/lib/i18n/translations.ts): Xóa bỏ key `locationPlaceholder` đã lỗi thời.

---

## 5. Kết Quả Kiểm Thử (Verification Gates)
- [x] **Lint**: `npm run lint` -> **PASS** (Clean, không cảnh báo).
- [x] **Typecheck**: `npx tsc --noEmit` -> **PASS** (0 lỗi type).
- [x] **Build**: `npm run build` -> **PASS** (Next.js production build hoàn tất).
