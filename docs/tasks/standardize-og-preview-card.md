# Task Documentation: TASK-20 - Chuẩn Hóa Open Graph Preview Card Với Logo BSche & Thêm `og:url`

## 1. Thông tin chung
- **Task ID**: `TASK-20`
- **Tên Task**: Chuẩn Hóa Open Graph Preview Card Với Logo BSche (1200x630) & Bổ Sung `og:url`
- **Ngày hoàn thành**: 2026-10-09
- **Người thực hiện**: Developer Agent
- **Người kiểm thử / Audit**: Gemini (BA + QA/Auditor)
- **Trạng thái**: **PASS**

---

## 2. Mục tiêu & Vấn đề giải quyết
- Trước đây, khi chia sẻ link trận đấu `/m/[matchId]` vào Facebook Messenger, hệ thống chỉ hiển thị một dòng text URL màu xanh mà không hiển thị khung card xem trước (Rich Link Preview Card).
- **Nguyên nhân cốt lõi phát hiện qua điều tra**:
  1. Thiếu thẻ bắt buộc `og:url` trong giao thức Open Graph chuẩn, khiến Facebook Messenger không xác định được canonical key để liên kết card preview vào chat.
  2. Kích thước vật lý của ảnh cũ chỉ là 236 x 234 px (dưới ngưỡng tối thiểu 600 x 315 px của Facebook card preview), đồng thời sai lệch so với kích thước 600x600 px khai báo trong code, dẫn đến việc parser của Messenger loại bỏ hoàn toàn card.
  3. Thiếu các thuộc tính bổ trợ như `siteName`, `locale`.

---

## 3. Chi tiết triển khai

### 3.1. Tạo Banner Open Graph Chuẩn 1200 x 630 px
- Tạo file banner `public/og-image.png` với kích thước chuẩn quốc tế **1200 x 630 px** (tỉ lệ 1.91:1) từ logo BSche (`src/app/icon.png`).
- Đặt logo trung tâm nổi bật, nền tối đồng bộ theme Slate-950 (`#020617`), dung lượng tối ưu 251 KB.
- Loại bỏ file ảnh cũ `public/og-image.jpg`.

### 3.2. Cập nhật Dynamic Metadata (`src/app/m/[matchId]/layout.tsx`)
- Thêm thuộc tính `url` (`og:url`) cho cả luồng dynamic (`https://bscheduler.xyz/m/${matchId}`) và fallback (`https://bscheduler.xyz`).
- Cấu hình `openGraph.images`:
  - `url: "https://bscheduler.xyz/og-image.png"`
  - `secureUrl: "https://bscheduler.xyz/og-image.png"`
  - `width: 1200`
  - `height: 630`
  - `type: "image/png"`
- Bổ sung `siteName: "BSche"` và `locale: "vi_VN"`.
- Cấu hình Twitter card `summary_large_image` trỏ tới `https://bscheduler.xyz/og-image.png`.

### 3.3. Đồng bộ Metadata Toàn Cục (`src/app/layout.tsx`)
- Cập nhật `openGraph.images` trong root metadata sang `/og-image.png` với kích thước 1200x630.
- Bổ sung `siteName: "BSche"` và `locale: "vi_VN"`.
- Đồng bộ `twitter.images: ["/og-image.png"]`.

---

## 4. Kết quả QA / Technical Audit

- **Typecheck (`npx tsc --noEmit`)**: PASS (0 lỗi).
- **ESLint (`npm run lint`)**: PASS (0 cảnh báo / lỗi).
- **Kích thước file ảnh (`public/og-image.png`)**: 1200 x 630 px (251 KB) - Hoàn toàn thỏa mãn yêu cầu của Facebook / Twitter / Telegram / Zalo.
- **Tuân thủ quy định dự án**: Tuyệt đối không chạy `npm run build`, bảo toàn cache runtime dev.
