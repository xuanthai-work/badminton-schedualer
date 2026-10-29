# TASK-62: Tích Hợp Upload Và Xem Phóng To Bill Đặt Sân Trong Chi Tiết Trận Đấu

## 1. Thông Tin Chung
- **Task ID**: TASK-62
- **Ngày hoàn thành**: 2026-10-29
- **Trạng thái QA**: **PASS**
- **Phạm vi tác động**:
  - `supabase/add-court-bill-image.sql`
  - `supabase/reset-database.sql`
  - `src/lib/i18n/translations.ts`
  - `src/app/dashboard/matches/[matchId]/page.tsx`
  - `src/app/m/[matchId]/page.tsx`

---

## 2. Bối Cảnh & Vấn Đề
Host đặt sân qua ứng dụng bên ngoài (như Alobo) và cần đính kèm ảnh xác nhận đặt sân / hóa đơn thanh toán (bill chứa thông tin chi phí, thời gian và số sân cụ thể) trực tiếp vào buổi đánh. Mục tiêu là giúp Host tiện lưu trữ và các thành viên tham gia có thể bấm xem bill rõ ràng, minh bạch.

---

## 3. Chi Tiết Triển Khai
1. **Khôi phục nguyên bản Thẻ Thông tin Sân & Google Maps**:
   - Thẻ sân (Section 1) được giữ nguyên 100% nguyên bản: Giờ đánh, Tên sân và khung bản đồ Google Maps (`MapsPreview`), hoàn toàn không bị chèn bất kỳ nút hay ảnh nào.
2. **Card Bill Đặt Sân độc lập (Nằm dưới danh sách người tham gia)**:
   - **Vị trí**: Nằm ở một Card riêng biệt đặt ngay bên dưới `ParticipantList`.
   - **Điều kiện hiển thị**:
     - Khi trận đấu đã chốt sổ (`match.status === "closed"`): **Ẩn hoàn toàn** (cả Host và người chơi đều không thấy ảnh hay nút bill nữa).
     - Khi trận đấu đang mở (`match.status === "open"`):
       - *Chưa có bill*: Hiển thị 1 nút to viền nét đứt (`border-dashed border-slate-700 bg-slate-900/40 py-4 ...`) có icon và text `Tải bill đặt sân` (chỉ Host nhìn thấy).
       - *Đã có bill*: Cả Host và người chơi đều nhìn thấy ảnh bill ở card riêng này. Bấm vào ảnh sẽ mở **Modal Lightbox toàn màn hình** để xem chi tiết tiền sân và số sân.
       - Host có thêm 2 nút "Đổi ảnh bill" và "Xóa bill".
3. **Đồng bộ trang Khách xem lịch công khai (`src/app/m/[matchId]/page.tsx`)**:
   - Thẻ thông tin sân và map giữ nguyên.
   - Khi trận đang mở và đã có bill: Card bill hiển thị bên dưới danh sách người tham gia, khách có thể click phóng to xem bill.
   - Khi trận đã chốt sổ: Ẩn hoàn toàn.
4. **Database & Storage**:
   - Thêm cột `court_bill_url text` vào bảng `matches`.
   - Storage bucket `court-bills` với 5MB limit, whitelist ảnh raster (`jpg, png, webp`), chặn SVG chống XSS. Storage RLS bảo vệ chỉ authenticated user được ghi vào thư mục `{auth.uid()}/...`.
   - Cập nhật RPC `get_public_match` và file reset `supabase/reset-database.sql`.

---

## 4. Kết Quả Nghiệm Thu (Acceptance Criteria)
- [x] Thẻ Thông tin Sân & Google Maps được giữ nguyên 100%, không bị ảnh hưởng.
- [x] Nút và ảnh bill đặt sân nằm ở card riêng biệt bên dưới danh sách người tham gia.
- [x] Khi trận đang mở:
  - Chưa có bill: Host thấy 1 nút to viền nét đứt để bấm tải bill; người chơi không thấy.
  - Đã có bill: Cả Host và người chơi đều thấy ảnh bill và click mở modal phóng to sắc nét.
  - Host có nút đổi ảnh và xóa ảnh hoạt động ổn định.
- [x] Khi trận đã chốt (`closed`): Cả Host và người chơi đều không thấy ảnh bill hay nút upload nữa (ẩn hoàn toàn).
- [x] Đồng bộ hoạt động trên cả trang Host và trang Public link.
- [x] Đã vượt qua toàn bộ Verification Gates:
  - Lint: `npm run lint` -> **PASS**
  - Typecheck: `npx tsc --noEmit` -> **PASS**
  - Build: `npm run build` -> **PASS**
