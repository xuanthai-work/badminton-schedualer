# TASK-59: Tối Ưu Kích Thước Modal (Chống Scrollbar Khi Mở Picker) Và Bỏ Tên Buổi Đánh Ở Modal Sửa Lịch

## 1. Thông Tin Chung
- **Task ID**: TASK-59
- **Tên Task**: Tối ưu kích thước modal (chống scrollbar khi mở picker) và bỏ tên buổi đánh ở modal sửa lịch
- **Ngày hoàn thành**: 2026-10-26
- **Trạng thái QA**: **PASS**

---

## 2. Bối Cảnh & Vấn Đề
1. **Modal bị co ngắn gây kích hoạt scrollbar**: Sau khi tinh gọn các trường thừa, modal Tạo/Sửa lịch chỉ còn 3 dòng input. Chiều cao modal bị co lại (~300px). Khi bấm chọn Giờ (TimeField cần ~200px) hoặc chọn Ngày (DateField cần ~320px), popup xổ xuống vượt quá chiều cao modal, kích hoạt thanh cuộn dọc (scrollbar) khiến người dùng phải kéo chuột/cuộn màn hình bất tiện.
2. **Dư thừa ô "Tên buổi đánh" ở modal Sửa lịch**: Tiêu đề trận đấu vốn dĩ được tự động sinh theo ngày đánh. Ở modal Sửa lịch (`EditMatchPanel.tsx`), việc để lại ô text nhập tên gây rườm rà và không đồng bộ với modal Tạo lịch.

---

## 3. Giải Pháp Triển Khai
1. **Thiết lập chiều cao chuẩn & cấu trúc Flexbox**:
   - Thêm `min-h-[480px] sm:min-h-[500px] flex flex-col` cho cả modal **Tạo buổi đánh** ([`CreateMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/CreateMatchPanel.tsx#L187)) và modal **Sửa lịch** ([`EditMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx#L190)).
   - Thẻ `<form>` có `flex flex-1 flex-col space-y-4`, neo cụm nút bấm ("Hủy", "Tạo" / "Lưu thay đổi") ở chân modal (`mt-auto flex justify-end gap-2 pt-4`).
   - Khi bấm chọn Ngày (lịch) hoặc Giờ (giờ/phút), các popup xổ xuống hoàn toàn nằm gọn bên trong modal, triệt tiêu hoàn toàn thanh cuộn giật giật.
2. **Loại bỏ ô "Tên buổi đánh" ở modal Sửa lịch**:
   - Xóa bỏ state `title` và ô nhập `matches.titleLabel` trong `EditMatchPanel.tsx`.
   - Khi lưu thay đổi, hệ thống tự động sinh lại tiêu đề theo ngày được chọn bằng `formatDate(date, ...)`.
   - Dọn dẹp key translation `matches.titleLabel`, `matches.titlePlaceholder` trong [`translations.ts`](file:///D:/work/Stuff/badminton-schedualer/src/lib/i18n/translations.ts).

---

## 4. Danh Sách Files Thay Đổi
- [`src/app/dashboard/CreateMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/CreateMatchPanel.tsx): Thiết lập `min-h-[480px] sm:min-h-[500px]` và neo nút bấm ở đáy form.
- [`src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx): Thiết lập chiều cao chuẩn, bỏ ô nhập Tên buổi đánh, tự sinh tiêu đề theo ngày.
- [`src/lib/i18n/translations.ts`](file:///D:/work/Stuff/badminton-schedualer/src/lib/i18n/translations.ts): Xóa bỏ translation keys `titleLabel` và `titlePlaceholder`.

---

## 5. Kết Quả Kiểm Thử (Verification Gates)
- [x] **Lint**: `npm run lint` -> **PASS**
- [x] **Typecheck**: `npx tsc --noEmit` -> **PASS**
- [x] **Build**: `npm run build` -> **PASS**
