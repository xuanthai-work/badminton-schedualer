# TASK-57: Mặc Định Tùy Chọn Chưa Chọn Sân Khi Tạo/Sửa Lịch Và Loại Bỏ Trường Sân Số

## 1. Thông Tin Chung
- **Task ID**: TASK-57
- **Tên Task**: Mặc định tùy chọn chưa chọn sân khi tạo/sửa lịch và loại bỏ trường sân số
- **Ngày hoàn thành**: 2026-10-26
- **Trạng thái QA**: **PASS**

---

## 2. Bối Cảnh & Vấn Đề
1. **Rào cản chọn sân khi tạo lịch**: Trước đây hệ thống bắt buộc Host phải chọn một sân có sẵn trong kho sân (`venues`) mới cho phép tạo buổi đánh (`errNoVenue`). Nhưng trên thực tế, Host thường tạo lịch sớm để gom đủ số lượng người đăng ký rồi mới liên hệ đặt sân thực tế. Việc bắt buộc phải chọn sân ngay từ đầu gây cản trở và phiền toái.
2. **Dư thừa trường Sân số (`court_no`)**: Trường sân số ít khi cần thiết ngay lúc lên lịch và làm chật chội form cũng như giao diện chi tiết trận đấu.

---

## 3. Giải Pháp Triển Khai
1. **Tùy Chọn Mặc Định "Chưa chọn sân"**:
   - Thêm tùy chọn `{ value: "", label: t("venues.unselected") }` ("Chưa chọn sân") vào đầu danh sách của `SelectField` trong cả hai form Tạo lịch ([`CreateMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/CreateMatchPanel.tsx)) và Sửa lịch ([`EditMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx)).
   - Giá trị mặc định khi mở form tạo mới là `venueId = ""` (Chưa chọn sân).
   - Ngay cả khi chưa có sân nào được lưu (`venues.length === 0`), Host vẫn có thể tạo lịch bình thường mà không bị chặn.
   - Khi chọn "Chưa chọn sân", trận đấu lưu `location = "Chưa chọn sân"` và `location_url = null` (khung bản đồ Google Maps tự động ẩn).
2. **Loại Bỏ Trường "Sân Số" (`court_no`)**:
   - Gỡ bỏ hoàn toàn state `courtNo` và input text `matches.courtNo` trên cả `CreateMatchPanel.tsx` và `EditMatchPanel.tsx`.
   - Gỡ bỏ hiển thị badge số sân `{match.courtNo != null && ...}` trên trang Chi tiết trận đấu ([`matches/[matchId]/page.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/page.tsx)) và link công khai người chơi ([`m/[matchId]/page.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/m/[matchId]/page.tsx)).
   - Dọn dẹp key translation `matches.courtNo`, `matches.courtShort` không còn dùng trong [`translations.ts`](file:///D:/work/Stuff/badminton-schedualer/src/lib/i18n/translations.ts).

---

## 4. Danh Sách Files Thay Đổi
- [`src/app/dashboard/CreateMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/CreateMatchPanel.tsx): Thêm tùy chọn "Chưa chọn sân", bỏ validation bắt buộc sân, bỏ ô nhập sân số.
- [`src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx): Hỗ trợ chuyển đổi sang "Chưa chọn sân", bỏ ô nhập sân số.
- [`src/app/dashboard/matches/[matchId]/page.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/page.tsx): Bỏ hiển thị badge sân số.
- [`src/app/m/[matchId]/page.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/m/[matchId]/page.tsx): Bỏ hiển thị badge sân số.
- [`src/lib/i18n/translations.ts`](file:///D:/work/Stuff/badminton-schedualer/src/lib/i18n/translations.ts): Bổ sung `venues.unselected`, bỏ `courtNo` & `courtShort`.

---

## 5. Kết Quả Kiểm Thử (Verification Gates)
- [x] **Lint**: `npm run lint` -> **PASS**
- [x] **Typecheck**: `npx tsc --noEmit` -> **PASS**
- [x] **Build**: `npm run build` -> **PASS**
