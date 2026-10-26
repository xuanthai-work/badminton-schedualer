# TASK-54: Xóa Bỏ Tiền Nước (DB & UI) Và Bổ Sung Nút Khóa Nhận Đăng Ký Mới Cho Trận Đấu

## 1. Thông Tin Chung
- **Task ID**: TASK-54
- **Tên Task**: Xóa bỏ tiền nước (DB & UI) và bổ sung nút khóa nhận đăng ký mới cho trận đấu
- **Ngày hoàn thành**: 2026-10-26
- **Trạng thái QA**: **PASS**

---

## 2. Bối Cảnh & Vấn Đề
1. **Tiền nước**: Trước đây hệ thống có trường "Tiền nước" (`water_fee`) trong bảng `expenses` và các form chi phí. Trong thực tế buổi đánh, người dùng chỉ tính tiền sân và tiền cầu (nước thường tự mua hoặc không tính vào chi phí chung), việc giữ cột và ô nhập tiền nước gây rác cơ sở dữ liệu và phức tạp hóa giao diện.
2. **Khóa đăng ký mới (Optional Lock)**: Trước đây điểm danh chỉ khóa khi Host bấm "Chốt chi phí" (`status = 'closed'`). Nhưng thực tế trước khi đánh, Host muốn khóa link để không nhận thêm người mới đăng ký (tránh vỡ trận/quá tải), trong khi các thành viên đã tham gia vẫn cần quyền đổi tên hoặc xin hủy nếu bận đột xuất. Ngoài ra, việc khóa link đăng ký này là tùy chọn độc lập, dù khóa hay mở thì sau khi đánh xong Host vẫn chốt chi phí bình thường.

---

## 3. Giải Pháp Kỹ Thuật

### A. Xóa Bỏ Triệt Để Tiền Nước (Database & Giao Diện)
1. **Database Schema & RPC**:
   - `alter table public.expenses drop column if exists water_fee;`
   - Cập nhật hàm `settle_match(target_match_id uuid, court numeric, shuttle numeric)`: Bỏ tham số `water`, tính tổng `total := coalesce(court, 0) + coalesce(shuttle, 0);`, loại bỏ cột `water_fee` khi insert/update `expenses`.
   - Cập nhật `get_public_match` loại bỏ `waterFee`.
2. **Giao Diện & Mã Nguồn**:
   - Loại bỏ `waterFee` khỏi type definition trong `matches/[matchId]/page.tsx`, `debts/page.tsx`, `m/[matchId]/page.tsx`.
   - Loại bỏ ô `FeeInput` tiền nước tại form chốt chi phí và modal sửa chi phí.
   - Loại bỏ dòng hiển thị tiền nước trong bảng tóm tắt chi phí.
   - Gỡ bỏ key translation `waterFee` trong `translations.ts`.

### B. Tính Năng Khóa Nhận Người Mới (Registration Lock)
1. **Database Schema & RPC**:
   - Thêm cột `rsvp_locked boolean not null default false` vào bảng `matches`.
   - Cập nhật hàm `guest_rsvp`: Khi `rsvp_locked = true`, nếu là người mới hoàn toàn (`existing_secret is null` và không phải host) thì raise exception `'registration_locked'`. Đối với người đã đăng ký trước đó (`existing_secret is not null`), vẫn cho phép đổi tên hoặc chuyển trạng thái `status = 'no'` (hủy đăng ký).
2. **Giao Diện Host (`/dashboard/matches/[matchId]`)**:
   - Khi trận đấu đang mở (`status === "open"`), hiển thị nút Toggle:
     - Khi chưa khóa: Nút **"Khóa đăng ký"** (icon `Lock`).
     - Khi đã khóa: Nút **"Mở lại đăng ký"** (icon `UnlockKeyhole`).
   - Khi đang khóa đăng ký, hiển thị thêm Badge màu vàng/amber: `ĐÃ KHÓA ĐĂNG KÝ`.
   - Dù đang khóa hay mở, Host vẫn bấm "Chốt chi phí & chia tiền" bình thường.
3. **Giao Diện Người Chơi (`/m/[matchId]`)**:
   - Đối với người đã đăng ký: Vẫn hiển thị badge "Đã đăng ký", nút "Đổi tên" và nút "Hủy đăng ký" hoạt động bình thường.
   - Đối với người chưa đăng ký khi trận đấu đang `rsvp_locked`: Nút "Tôi tham gia!" bị ẩn, hiển thị khối thông báo rõ ràng *"Buổi đánh đã khóa nhận người mới"*.

---

## 4. Danh Sách Files Thay Đổi
- `supabase/lock-registration-and-remove-water-fee.sql`: File SQL migration độc lập chạy trên Supabase.
- `supabase/reset-database.sql`: Cập nhật schema chuẩn và các RPC function.
- `src/app/dashboard/matches/[matchId]/page.tsx`: Xóa tiền nước, thêm nút toggle Khóa đăng ký và badge trạng thái.
- `src/app/dashboard/debts/page.tsx`: Xóa tiền nước trong form sửa chi phí sổ thu tiền.
- `src/app/m/[matchId]/page.tsx`: Bổ sung kiểm tra `rsvpLocked` cho người mới và xử lý lỗi `registration_locked`.
- `src/lib/i18n/translations.ts`: Cập nhật translations song ngữ Việt - Anh, bỏ `waterFee`, thêm nhãn khóa đăng ký.

---

## 5. Kết Quả Kiểm Thử (Verification Gates)
- [x] **Lint**: `npm run lint` -> **PASS** (Không có lỗi).
- [x] **Typecheck**: `npx tsc --noEmit` -> **PASS** (0 lỗi TypeScript).
- [x] **Build**: `npm run build` -> **PASS** (Next.js production build hoàn tất).
