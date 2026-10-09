# Task: Gia Cố Bảo Mật Toàn Diện (Security Hardening 2.0 - IDOR, XSS, Anti-OOM, Storage)

- **Task ID**: TASK-14
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS**
- **Người thực hiện**: Developer Agent
- **Người kiểm thử / Audit**: Gemini (BA + QA/Auditor)

---

## 1. Mục tiêu (Objective)
Triệt tiêu toàn diện các lỗ hổng bảo mật cấp cao (Critical & High) được phát hiện trong đợt Penetration Testing:
1. **Chống IDOR trên Guest RSVP & Payment**: Ngăn chặn người dùng nặc danh hoặc kẻ xấu dùng ID của người khác để kick, đổi tên, hoặc giả mạo đã thanh toán.
2. **Chặn Stored XSS qua liên kết bản đồ**: Ràng buộc check constraint URL an toàn ở Database và sanitize frontend trong `MapsPreview.tsx`.
3. **Chống DoS / Heap OOM**: Thêm cơ chế tự động dọn dẹp bộ nhớ RAM cho Map theo dõi IP trong `/api/link-preview`.
4. **Bảo vệ Storage Bucket**: Thiết lập giới hạn kích thước 2MB và whitelist MIME cho bucket `avatars`.

---

## 2. Chi tiết triển khai (Implementation Details)

### 2.1. Cột `guest_secret` & Xác thực trong RPC (`supabase/reset-database.sql`)
- Bảng `public.match_guests`: Thêm cột `guest_secret text not null default gen_random_uuid()::text`.
- Hàm `public.guest_rsvp`:
  - Nhận tham số `p_secret text default null`.
  - Khi tạo mới: Sinh `effective_secret` và trả về qua JSON để trình duyệt lưu vào `localStorage`.
  - Khi cập nhật/hủy người chơi: Bắt buộc người gọi phải là Host, là User đã đăng nhập sở hữu ID đó, hoặc gửi kèm `p_secret` khớp với `existing_secret` trong DB. Bất kỳ ai không khớp sẽ nhận exception `unauthorized_guest`.
- Hàm `public.guest_submit_payment`:
  - Bắt buộc kiểm tra quyền sở hữu bằng tài khoản đăng nhập, Host, hoặc `p_secret` khớp với `existing_secret`. Chặn giả mạo nộp tiền khống.

### 2.2. Kiểm tra an toàn URL bản đồ
- Database:
  - `matches.location_url`: `check (location_url is null or location_url ~* '^https?://')`
  - `venues.maps_url`: `check (maps_url is null or maps_url ~* '^https?://')`
- Frontend: `src/components/MapsPreview.tsx` kiểm tra `const isSafeUrl = /^https?:\/\//i.test(url);` và trả về `null` ngay lập tức nếu không phải URL an toàn.

### 2.3. Chống rò rỉ RAM (Anti-OOM) trong `/api/link-preview`
- Đặt `MAX_TRACKED_IPS = 1000`. Khi Map vượt ngưỡng, tự động xóa các timestamp quá hạn hoặc xóa sạch Map nếu có tấn công bơm IP giả mạo hàng loạt.

### 2.4. Hardening Supabase Storage
- Cấu hình bucket `avatars` với `file_size_limit = 2097152` (2MB) và `allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']`.

### 2.5. Trải nghiệm người dùng & Đa ngôn ngữ
- `src/app/m/[matchId]/page.tsx`: Lưu trữ `secret` trong `Identity` (`localStorage`) và tự động gửi kèm khi gọi RPC. Bắt lỗi `unauthorized_guest` với thông báo thân thiện.
- `src/lib/i18n/translations.ts`: Thêm bản dịch `errUnauthorizedGuest` cho VI và EN.

---

## 3. Kết quả nghiệm thu (Acceptance Criteria Verification)

| Tiêu chí | Nội dung kiểm tra | Kết quả | Chi tiết đánh giá |
|:---|:---|:---:|:---|
| **AC 1** | Chống IDOR Guest | **PASS** | Guest mới tự động nhận và lưu `guest_secret`. Bất kỳ ai gọi RPC với ID người khác mà không có secret đều bị từ chối với lỗi `unauthorized_guest`. |
| **AC 2** | Chặn Stored XSS | **PASS** | Database có check constraint `^https?://`. `MapsPreview.tsx` từ chối render link độc hại. |
| **AC 3** | Chống DoS / OOM | **PASS** | Rate limit Map tự động prune và giới hạn tối đa 1000 items, loại bỏ nguy cơ sập RAM Node.js. |
| **AC 4** | Khóa cứng Storage | **PASS** | Bucket `avatars` có cấu hình dung lượng tối đa 2MB và MIME whitelist ở tầng database. |
| **AC 5** | Static Checks | **PASS** | `npx tsc --noEmit` và `npm run lint` đạt 0 lỗi (Exit code 0). Không chạy lệnh `npm run build`. |

---

## 4. Kết luận
Toàn bộ các lỗ hổng Critical và High đã được xử lý triệt để. Codebase đạt chuẩn an toàn cao mà vẫn giữ nguyên trải nghiệm Zero-Friction cho người dùng.
