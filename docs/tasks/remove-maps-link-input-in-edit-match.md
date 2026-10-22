# TASK-53: Bỏ Ô Nhập Link Google Maps Trong Modal Sửa Trận Đấu (EditMatchPanel)

## 1. Thông Tin Chung
- **Task ID**: TASK-53
- **Tên Task**: Bỏ ô nhập link Google Maps trong modal sửa trận đấu (EditMatchPanel)
- **Ngày hoàn thành**: 2026-10-22
- **Trạng thái QA**: **PASS**

---

## 2. Bối Cảnh & Vấn Đề
- Trên hệ thống, link Google Maps được quản lý tập trung và gắn liền theo từng Sân tại trang **Quản lý sân** (`/dashboard/venues`).
- Trong form "Tạo buổi đánh" (`CreateMatchPanel.tsx`), link Google Maps tự động lấy từ thông tin sân được chọn mà không cần nhập thủ công.
- Tuy nhiên, trong modal "Sửa thông tin lịch" (`EditMatchPanel.tsx`), ô text input "Link Google Maps" vẫn còn hiển thị, gây dư thừa dữ liệu và không nhất quán với quy trình quản lý sân.

---

## 3. Giải Pháp Triển Khai
1. **Lược bỏ ô text input Link Google Maps**:
   - Xóa bỏ trường input text và nhãn `matches.mapsLink` trong form `EditMatchPanel.tsx`.
   - Dọn dẹp key translation `matches.mapsLink` và `matches.errMapsUrl` trong `translations.ts`.
2. **Cập nhật Logic đồng bộ Maps URL**:
   - Khi sửa sân sang một sân khác trong dropdown, `location_url` tự động lấy từ `chosenVenue.mapsUrl`.
   - Sử dụng `initialVenueId` để nhận biết: nếu host giữ nguyên sân hiện tại của trận đấu, link maps ban đầu của trận (`match.locationUrl`) được bảo toàn trọn vẹn (áp dụng cho cả các trận cũ dùng synthetic venue).
3. **Validation & State Cleanup**:
   - Bỏ kiểm tra regex URL thừa trong `handleSave`.
   - Xác thực sân hợp lệ qua `chosenVenue`.

---

## 4. Danh Sách Files Thay Đổi
- [`src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx): Bỏ ô nhập link Google Maps, xử lý gán `location_url` tự động từ `chosenVenue`.
- [`src/lib/i18n/translations.ts`](file:///D:/work/Stuff/badminton-schedualer/src/lib/i18n/translations.ts): Xóa bỏ translation keys không còn dùng `matches.mapsLink`, `matches.errMapsUrl`.

---

## 5. Kết Quả Kiểm Thử (Verification Gates)
- [x] **Lint**: `npm run lint` -> **PASS** (Clean).
- [x] **Typecheck**: `npx tsc --noEmit` -> **PASS** (0 error).
- [x] **Build**: `npm run build` -> **PASS** (Production build hoàn tất).
