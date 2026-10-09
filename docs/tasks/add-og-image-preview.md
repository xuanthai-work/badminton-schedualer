# Task Documentation: TASK-19 - Tích Hợp Ảnh OG Preview "Cầu Lông Đi Mà ^^" Cho Link Messenger

## 1. Thông tin chung
- **Task ID**: `TASK-19`
- **Tên Task**: Tích Hợp Ảnh OG Preview "Cầu Lông Đi Mà ^^" Cho Link Messenger (Open Graph Image Preview)
- **Ngày hoàn thành**: 2026-10-09
- **Người thực hiện**: Developer Agent
- **Người kiểm thử / Audit**: Gemini (BA + QA/Auditor)
- **Trạng thái**: **PASS**

---

## 2. Mục tiêu & Vấn đề giải quyết
Facebook Messenger và nhiều ứng dụng mạng xã hội quy định bắt buộc phải có thẻ ảnh `og:image` thì thuật toán mới render khung xem trước (Rich Preview Card). Trước đây, link thiếu thẻ ảnh đại diện nên Messenger chỉ hiển thị dòng text link đơn điệu.
Đồng thời, người dùng mong muốn sử dụng hình ảnh chú mèo hài hước biểu cảm *"Cầu lông đi mà ^^"* làm ảnh đại diện cho link chia sẻ.

---

## 3. Chi tiết triển khai

### 3.1. Lưu trữ ảnh tĩnh
- Sao chép ảnh `C:\Users\Admin\Pictures\mèo.jpg` vào `public/og-image.jpg` để phục vụ tĩnh qua đường dẫn `/og-image.jpg`.

### 3.2. Cấu hình Metadata toàn cục (`src/app/layout.tsx`)
- Thêm `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://bscheduler.xyz")`.
- Cấu hình thẻ `openGraph.images` và `twitter.images` với card type `summary_large_image`.

### 3.3. Tối ưu Dynamic Metadata từng trận (`src/app/m/[matchId]/layout.tsx`)
- Bổ sung `images: [OG_IMAGE]` vào `openGraph` và `twitter` trong khối return chính.
- Bổ sung hàm `getFallbackMetadata` trang bị đầy đủ ảnh `OG_IMAGE` cho mọi tình huống (kể cả khi link chưa có trong DB).
- Tinh chỉnh tiêu đề preview: ưu tiên `🏸 ${venueOrTitle} | ${dayName}, ${dateShort}` (ví dụ: `🏸 Sân Ngọc Vân | Chủ Nhật, 11/10`), loại bỏ trùng lặp từ ngữ.

---

## 4. Kết quả QA / Technical Audit

- **Typecheck (`npx tsc --noEmit`)**: PASS (0 lỗi).
- **ESLint (`npm run lint`)**: PASS (0 cảnh báo / lỗi).
- **Acceptance Criteria Verification**:
  - [x] File `public/og-image.jpg` tồn tại và truy cập được qua web.
  - [x] Thẻ `og:image` và `twitter:image` hiển thị đầy đủ trên toàn bộ các route.
  - [x] Tiêu đề preview hiển thị tên sân + thứ ngày cực kỳ dễ nhìn.
  - [x] Tuân thủ quy định bảo toàn cache dev server.
