# TASK-55: Gộp Nút Khóa Đăng Ký Và Badge Trạng Thái Thành Nút Trạng Thái Thông Minh (Xanh / Đỏ)

## 1. Thông Tin Chung
- **Task ID**: TASK-55
- **Tên Task**: Gộp nút khóa đăng ký và badge trạng thái thành Nút Trạng Thái Thông Minh (Xanh / Đỏ)
- **Ngày hoàn thành**: 2026-10-26
- **Trạng thái QA**: **PASS**

---

## 2. Bối Cảnh & Vấn Đề
- Ở phiên bản trước, cụm header trang chi tiết trận đấu (`matches/[matchId]/page.tsx`) hiển thị đồng thời cả nút "Khóa đăng ký", nút "Sao chép link mời", nút "Sửa" và badge trạng thái riêng lẻ ("ĐANG MỞ" / "ĐÃ KHÓA ĐĂNG KÝ").
- Việc có tới 4–5 phần tử trên thanh header gây chật chội, dồn ép các nút và khiến chữ bị bẻ đôi thành 2 dòng ("Khóa" / "đăng ký", "Sao chép" / "link mời", "ĐANG" / "MỞ").
- Về quy ước màu sắc: Màu Xanh biểu thị trạng thái mở/hoạt động bình thường, màu Đỏ biểu thị trạng thái đã khóa/dừng nhận người mới.

---

## 3. Giải Pháp Triển Khai
1. **Gộp Nút Khóa và Badge Trạng Thái**:
   - Thay thế nút khóa cũ và các badge riêng lẻ bằng một **Interactive Status Button** (Nút Trạng Thái Thông Minh) duy nhất cho Host:
     - **Khi trận đang mở & chưa khóa**: Nút có màu **Xanh Emerald** (`border-emerald-500/40 bg-emerald-500/15 text-emerald-300`), icon `UnlockKeyhole`, nhãn `Đang mở`. Khi click, gọi hàm `handleToggleRsvpLock` để khóa đăng ký.
     - **Khi trận đang mở & đã khóa**: Nút chuyển sang màu **Đỏ Rose** (`border-rose-500/40 bg-rose-500/15 text-rose-300`), icon `Lock`, nhãn `Đã khóa`. Khi click, mở lại đăng ký.
     - **Khi trận đã chốt chi phí (`status === "closed"`)**: Chuyển thành Badge xám tĩnh `Đã chốt` (`border-white/10 bg-slate-800 text-slate-400`).
2. **Đối với người xem không phải Host**:
   - Hiển thị badge tĩnh mang màu sắc và trạng thái tương ứng (`Đang mở` xanh hoặc `Đã khóa` đỏ).
3. **Tối ưu không gian Header**:
   - Loại bỏ hoàn toàn badge riêng lẻ cũ. Thanh header khi trận đang mở chỉ còn đúng 3 phần tử:
     `[ Nút Trạng Thái (Xanh/Đỏ) ]` + `[ Sao chép link mời ]` + `[ Sửa ]`
   - Header trở nên thoáng đãng, không còn hiện tượng chèn ép co cụm chữ.

---

## 4. Danh Sách Files Thay Đổi
- [`src/app/dashboard/matches/[matchId]/page.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/matches/[matchId]/page.tsx): Tái cấu trúc cụm nút header, gộp nút khóa và badge thành nút trạng thái thông minh.

---

## 5. Kết Quả Kiểm Thử (Verification Gates)
- [x] **Lint**: `npm run lint` -> **PASS**
- [x] **Typecheck**: `npx tsc --noEmit` -> **PASS**
- [x] **Build**: `npm run build` -> **PASS**
