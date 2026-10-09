# Task: Chuyển Danh Sách Sân Thành Kho Dùng Chung & Chống Trùng Lặp Thông Minh

- **Task Name**: Shared Venues Pool & Smart Deduplication
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria & Quality Gates)

---

## 1. Objective
1. **Chuyển Sân cầu lông thành Kho dùng chung (Shared Global Pool)**:
   - Toàn bộ danh sách sân và vị trí bản đồ Google Maps được dùng chung cho tất cả các tài khoản Host trong hệ thống.
   - Bất kỳ ai thêm sân mới đều tự động đóng góp vào pool chung này.
   - Khi tạo trận (`CreateMatchPanel`), tất cả Host đều chọn được tất cả các sân trong pool chung kèm vị trí Google Maps.
2. **Phân quyền an toàn**:
   - Mọi người đều có quyền xem và chọn sân.
   - Mọi Host đều có quyền thêm sân mới vào pool.
   - Mỗi Host chỉ có quyền Sửa hoặc Xóa các sân do chính mình tạo (sân của mình có gắn badge *"Của bạn"* tại `/dashboard/venues`).
3. **Chống trùng lặp thông minh (Deduplication)**:
   - **Database Level**: Unique Index không phân biệt hoa/thường và khoảng trắng thừa `lower(trim(name))` trên bảng `venues`.
   - **Frontend Level (Search-as-you-type hint)**: Khi Host gõ tên sân trong modal thêm sân, nếu phát hiện sân tương tự thì hiện gợi ý màu vàng (*"💡 Đã có sân tương tự: [Tên sân]"*). Nếu trùng hoàn toàn sẽ chặn submit và báo lỗi thân thiện.

---

## 2. Scope & Thay đổi chi tiết
- `supabase/venues.sql`:
  - RLS Policies:
    - `Anyone can read venues`: Cho phép `anon, authenticated` xem toàn bộ sân: `using (true)`.
    - `Users insert own venues`: Cho phép `authenticated` thêm sân vào pool: `with check (auth.uid() = user_id)`.
    - `Users update own venues` & `Users delete own venues`: Chỉ người tạo mới được sửa/xóa: `using (auth.uid() = user_id)`.
  - Unique Index: `create unique index venues_name_unique_idx on public.venues (lower(trim(name)));`.
- `src/app/dashboard/venues/page.tsx`:
  - Thêm `userId` vào state `venues`.
  - Phân quyền: Chỉ hiển thị nút Sửa/Xóa và badge "Của bạn" cho sân do chính mình tạo.
  - Modal: Gợi ý sân tương tự realtime (`similarVenue`) và kiểm tra trùng tên (`isDuplicate`) trước khi lưu.
- `src/lib/i18n/translations.ts`:
  - Bổ sung các bản dịch: `subtitle`, `myVenueBadge`, `similarHint`, `errDuplicate`.

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Kho sân dùng chung cho toàn bộ Host | **PASS** | `venues` được mở RLS `using (true)`, load đầy đủ cho tất cả người dùng. |
| **AC 2** | Dropdown tạo trận chọn sân chung | **PASS** | `CreateMatchPanel.tsx` hiển thị toàn bộ sân trong pool chung. |
| **AC 3** | Phân quyền an toàn (Sửa/Xóa) | **PASS** | Chỉ hiện nút Sửa/Xóa cho sân của chính mình (`venue.userId === userId`). |
| **AC 4** | Gợi ý & Chống trùng sân thông minh | **PASS** | Có hint real-time màu vàng khi gõ và chặn submit nếu trùng tên (case-insensitive). |
| **AC 5** | Database Unique Constraint | **PASS** | `venues_name_unique_idx` chống trùng lặp ở tầng DB. |

---

## 4. Verification Gates
- `npx tsc --noEmit`: **PASS** (Exit code 0, không có lỗi TypeScript).
- `npm run lint`: **PASS** (Exit code 0, ESLint không có cảnh báo/lỗi).
