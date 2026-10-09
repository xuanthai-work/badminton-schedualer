# BSche - Badminton Match Scheduling & Cost Splitting

> **BSche** (Cầu lông đi mà ^^) là ứng dụng web quản lý lịch cầu lông hiện đại, hỗ trợ tạo kèo, điểm danh tức thì (realtime) không cần tài khoản, và tự động chia chi phí kèm mã VietQR chuyển khoản nhanh cho cả nhóm.

---

## 🚀 Tính Năng Nổi Bật (Key Features)

- **🏸 Magic Public Match Link (`/m/[matchId]`)**:
  - Chia sẻ link trận đấu công khai. Người tham gia có thể điểm danh tham gia (Có / Không) ngay lập tức mà không cần tạo tài khoản hay đăng nhập.
  - Hỗ trợ lưu định danh khách bền vững qua `localStorage` trên trình duyệt.

- **💳 Tự Động Chia Chi Phí & Thanh Toán VietQR**:
  - Nhập tiền sân, tiền cầu, tiền nước ➔ hệ thống tự động tính chi phí bình quân cho mỗi người tham gia.
  - Sinh mã **VietQR động** chuẩn Napas 24/7 với số tài khoản của chủ kèo (hoặc người ứng tiền), kèm số tiền chính xác và nội dung chuyển khoản rõ ràng.
  - Hỗ trợ nút tải ảnh mã QR trực tiếp về thư viện ảnh điện thoại để chuyển khoản nhanh trong ứng dụng ngân hàng.

- **🌐 Rich Link Preview Card (Facebook Messenger, Zalo, Telegram)**:
  - Tích hợp chuẩn **Open Graph (1200 x 630 px)** và Twitter Card `summary_large_image`.
  - Hiển thị đầy đủ logo BSche, tên sân, thứ ngày, khung giờ thi đấu và lời mời điểm danh trực quan ngay khi dán link vào khung chat.

- **⚡ Cập Nhật Realtime**:
  - Danh sách người tham gia và trạng thái thanh toán được đồng bộ tức thì giữa tất cả người xem thông qua Supabase Realtime Channels.

- **📍 Quản Lý Sân Dùng Chung & Bản Đồ (Shared Venues & Maps)**:
  - Tự động gợi ý sân cầu lông phổ biến đã lưu trong hệ thống.
  - Tích hợp bản đồ Google Maps xem nhanh vị trí sân thi đấu trực tiếp trên trang trận đấu.

- **🛡️ An Toàn & Bảo Mật (Security Hardened)**:
  - Gia cố bảo mật toàn diện: Phân quyền qua Supabase Row Level Security (RLS) và hàm RPC `SECURITY DEFINER`.
  - Cơ chế mã khóa bảo mật (`secret`) cho từng người tham gia để chống mạo danh.
  - Giới hạn tối đa 20 người/trận đấu để chống quá tải (Anti-OOM & Spam).

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4, Lucide React Icons |
| **Backend / DB** | [Supabase](https://supabase.com/) (PostgreSQL, RLS, RPC Stored Procedures, Realtime) |
| **Thanh toán & Tiện ích** | VietQR API, `date-fns` |
| **Hosting & CDN** | Vercel |

---

## 📂 Cấu Trúc Thư Mục (Project Structure)

```text
badminton-schedualer/
├── docs/                       # Tài liệu kỹ thuật & Nhật ký task hoàn thành
│   ├── README.md               # Danh mục tổng hợp toàn bộ các task đã nghiệm thu
│   └── tasks/                  # Chi tiết từng task triển khai (TASK-01 -> TASK-20)
├── public/                     # Static assets (og-image.png, icons, manifests)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout & global metadata (Open Graph)
│   │   ├── page.tsx            # Trang chủ quản lý danh sách trận
│   │   ├── m/[matchId]/        # Magic Public Match Link (layout & page)
│   │   ├── venues/             # Quản lý kho sân cầu lông
│   │   └── profile/            # Cài đặt tài khoản & cấu hình ngân hàng nhận tiền
│   ├── components/             # Reusable UI components
│   └── lib/                    # Tiện ích: Supabase client, i18n, VietQR helper
├── supabase/                   # SQL migration scripts & schema database
└── justdoit.md                 # Quản lý task hiện tại của workflow
```

---

## 💻 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Getting Started)

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình biến môi trường
Tạo file `.env.local` hoặc `.env` với các biến cần thiết:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://bscheduler.xyz
```

### 3. Chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Truy cập [http://localhost:3000](http://localhost:3000) trên trình duyệt.

### 4. Kiểm tra chất lượng (Verification Gates)
```bash
# Kiểm tra kiểu dữ liệu TypeScript
npx tsc --noEmit

# Kiểm tra cú pháp và quy chuẩn code
npm run lint
```
*(Lưu ý: Không tự ý chạy `npm run build` trên local để bảo toàn dev cache).*

---

## 📚 Tài Liệu Kỹ Thuật & Lịch Sử Task (Task History)

Toàn bộ quá trình phát triển, kiến trúc kỹ thuật và kết quả QA Audit được ghi nhận chi tiết tại:
👉 [**docs/README.md**](docs/README.md)

### Danh sách các task gần đây:
- **[TASK-21](docs/tasks/ios-safari-qr-web-share.md)**: Tối ưu nút tải VietQR trên iOS Safari bằng Web Share API (lưu trực tiếp vào Photos).
- **[TASK-20](docs/tasks/standardize-og-preview-card.md)**: Chuẩn hóa Open Graph Preview Card với Logo BSche (1200x630) & bổ sung `og:url`.
- **[TASK-19](docs/tasks/add-og-image-preview.md)**: Tích hợp ảnh OG Preview cho link Messenger.
- **[TASK-17](docs/tasks/dynamic-match-og-metadata.md)**: Dynamic Open Graph Metadata cho trang Magic Match Link.
- **[TASK-16](docs/tasks/add-download-qr-button.md)**: Bổ sung nút tải ảnh VietQR trên trang Magic Match Link.
- **[TASK-14](docs/tasks/security-hardening-2.md)**: Gia cố bảo mật toàn diện (IDOR, XSS, Anti-OOM, Storage RLS).
- **[TASK-01](docs/tasks/magic-public-match-link.md)**: Xây dựng Magic Public Link cho trận đấu (Zero-Friction RSVP & VietQR).
