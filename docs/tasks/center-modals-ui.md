# TASK-58: Đổi Modal Tạo Lịch, Thêm Sân Và Sửa Lịch Sang Dạng Căn Giữa Màn Hình (Centered Modal)

## 1. Thông Tin Chung
- **Task ID**: TASK-58
- **Tên Task**: Đổi modal tạo lịch, thêm sân và sửa lịch sang dạng căn giữa màn hình (centered modal)
- **Ngày hoàn thành**: 2026-10-26
- **Trạng thái QA**: **PASS**

---

## 2. Bối Cảnh & Vấn Đề
- Trước đây, các modal form gồm **Tạo buổi đánh** (`CreateMatchPanel.tsx`), **Thêm/Sửa sân** (`venues/page.tsx`) và **Sửa lịch** (`EditMatchPanel.tsx`) sử dụng lớp căn chỉnh `items-end sm:items-center`.
- Trên thiết bị di động, modal bị ép dính sát mép dưới màn hình (dạng bottom-sheet), gây cảm giác chật chội, khó thao tác với các trường nhập liệu phía dưới và dễ bị vướng thanh điều hướng của hệ điều hành.

---

## 3. Giải Pháp Triển Khai
1. **Căn giữa đồng bộ (Centered Dialog)**:
   - Chuyển đổi lớp căn chỉnh overlay của cả 3 modal từ `items-end sm:items-center` thành `items-center` (áp dụng thống nhất trên cả thiết bị di động lẫn máy tính để bàn).
   - Danh sách các modal được cập nhật:
     - Modal **Tạo buổi đánh** ([`CreateMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/CreateMatchPanel.tsx#L180)).
     - Modal **Thêm / Sửa sân** ([`venues/page.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/venues/page.tsx#L285)).
     - Modal **Sửa thông tin lịch** ([`EditMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx#L178)).
2. **Đảm bảo an toàn bố cục (Scroll & Padding)**:
   - Giữ nguyên `max-h-[90dvh] overflow-y-auto` và `p-4` để modal luôn cuộn mượt mà và không bao giờ bị tràn khỏi màn hình khi người dùng bật bàn phím ảo.

---

## 4. Danh Sách Files Thay Đổi
- [`src/app/dashboard/CreateMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/CreateMatchPanel.tsx): Căn giữa modal tạo lịch.
- [`src/app/dashboard/venues/page.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/venues/page.tsx): Căn giữa modal thêm/sửa sân.
- [`src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/EditMatchPanel.tsx): Căn giữa modal sửa lịch.

---

## 5. Kết Quả Kiểm Thử (Verification Gates)
- [x] **Lint**: `npm run lint` -> **PASS**
- [x] **Typecheck**: `npx tsc --noEmit` -> **PASS**
- [x] **Build**: `npm run build` -> **PASS**
