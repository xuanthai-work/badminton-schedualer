# Task: Vá Lỗ Hổng Bảo Mật & Gia Cố Toàn Diện Hệ Thống (Security Hardening)

- **Task Name**: Security Hardening & Vulnerability Remediation
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria & Quality Gates)

---

## 1. Objective
Khắc phục triệt để các rủi ro an ninh thông tin được phát hiện trong đợt Security Audit theo chuẩn OWASP:
1. **Vá RLS Policy của bảng `matches`**: Ngăn chặn tình trạng tài khoản đăng nhập đọc được danh sách trận đấu và chi phí của các host khác. Khóa chặt quyền xem: `using (created_by = auth.uid())`.
2. **Ngăn chặn Stored XSS qua File Upload Avatar (`ImageUpload.tsx`)**: Whitelist chặt chẽ chỉ cho phép ảnh raster (`image/jpeg`, `image/png`, `image/webp`), cấm tiệt định dạng `image/svg+xml` và kiểm tra đuôi mở rộng hợp lệ.
3. **Kích hoạt Security Headers & Content Security Policy trong `next.config.ts`**: Bật `X-Frame-Options: DENY` (chống Clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, và CSP chuẩn.
4. **Chống DoS / Resource Exhaustion (`/api/link-preview`)**: Triển khai In-memory Rate Limiting giới hạn tối đa 20 lượt gọi / phút trên mỗi địa chỉ IP (trả về HTTP 429 nếu vượt ngưỡng).
5. **Ràng buộc độ dài chuỗi trong Database (`supabase/reset-database.sql`)**: Thêm giới hạn độ dài cho các cột văn bản (`title`, `location`, `name`, `address`) để tránh tấn công tràn bộ nhớ.

---

## 2. Scope & Thay đổi chi tiết
- `next.config.ts`: Cấu hình Security Headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy).
- `src/components/ImageUpload.tsx`: Whitelist MIME type (`ALLOWED_MIME`) và extension (`ALLOWED_EXTS`), chặn hoàn toàn SVG.
- `src/app/api/link-preview/route.ts`: In-memory rate limiting (20 requests/phút/IP, trả về 429).
- `supabase/reset-database.sql`: Sửa policy `matches` SELECT chỉ cho chủ sở hữu, thêm check constraints độ dài chuỗi cho `matches` và `venues`.

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | Security Headers & CSP | **PASS** | `next.config.ts` có đầy đủ X-Frame-Options, CSP, nosniff, frame-ancestors 'none'. |
| **AC 2** | Chống Stored XSS trong Upload | **PASS** | `ImageUpload.tsx` từ chối tất cả file không thuộc JPG/PNG/WebP, chặn tiệt SVG. |
| **AC 3** | In-memory Rate Limiting | **PASS** | `/api/link-preview` chặn với mã 429 nếu gọi quá 20 lần/phút từ cùng 1 IP. |
| **AC 4** | Siết chặt RLS matches | **PASS** | `matches` SELECT đổi thành `using (created_by = auth.uid())`, bỏ `or auth.uid() is not null`. |
| **AC 5** | Ràng buộc độ dài chuỗi DB | **PASS** | Bổ sung `check (length(...) <= ...)` cho `matches` và `venues`. |
| **AC 6** | Quality Gates (Lint & Typecheck) | **PASS** | `npx tsc --noEmit` và `npm run lint` đều exit code 0. |

---

## 4. Verification Gates
- `npx tsc --noEmit`: **PASS** (Exit code 0).
- `npm run lint`: **PASS** (Exit code 0).
