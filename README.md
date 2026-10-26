# BSche - Badminton Match Scheduling & Cost Splitting

> **BSche** (Cầu lông đi mà ^^) là ứng dụng web & PWA quản lý lịch đánh cầu lông hiện đại, hỗ trợ tạo kèo khảo sát số lượng người, điểm danh tức thì không cần tài khoản, tự động chia chi phí kèm mã VietQR, sổ thu tiền thông minh và đồng bộ giao dịch ngân hàng tự động 24/7 (BSche Bank Sync).

---

## 🚀 Tính Năng Nổi Bật (Key Features)

### 🏸 1. Magic Public Match Link (`/m/[matchId]`)
- **Điểm danh tức thì (Zero Friction)**: Người tham gia chỉ cần mở link là có thể bấm "Tham gia" hoặc "Hủy" ngay trên trình duyệt mà không cần đăng ký tài khoản hay tải ứng dụng.
- **Bảo mật định danh**: Lưu danh tính cục bộ an toàn qua `localStorage` và mã bí mật (`guest_secret`) chống mạo danh hoặc sửa đè thông tin người khác.
- **Giới hạn số lượng**: Tự động chặn khi đạt mốc tối đa 20 người/buổi đánh để tránh quá tải sân.

### 🔒 2. Khóa Link Đăng Ký Thông Minh (Registration Lock)
- **Nút trạng thái linh hoạt**: Host có thể bấm **"Khóa đăng ký"** (màu Đỏ) hoặc **"Đang mở"** (màu Xanh) bất cứ lúc nào trên header chi tiết trận đấu.
- **Chặn người mới nhưng bảo lưu quyền người cũ**: Khi khóa link, người mới không thể tham gia, nhưng các thành viên đã đăng ký trước đó vẫn có thể đổi tên hoặc hủy đăng ký bình thường nếu có việc bận đột xuất.
- **Tùy chọn độc lập**: Dù đang khóa hay mở đăng ký, Host vẫn có thể bấm chốt chi phí & chia tiền sau trận bình thường.

### 📍 3. Lên Lịch Linh Hoạt & Kho Sân Dùng Chung (Flexible Venues)
- **Tạo lịch không cần sân trước**: Mặc định hỗ trợ tùy chọn *"Chưa chọn sân"*, giúp Host dễ dàng tạo lịch để gom đủ số lượng thành viên trước rồi mới liên hệ đặt sân thực tế.
- **Kho sân dùng chung & Bản đồ**: Lưu trữ danh sách sân thường chơi, tự động điền link Google Maps và hiển thị bản đồ trực tiếp trên trang trận đấu.
- **Tự động đặt tên buổi đánh**: Tự động sinh tên kèo theo thứ ngày (ví dụ: *"Thứ Tư, 28/10/2026"*), giao diện modal căn giữa màn hình rộng rãi, không bị che khuất.

### 💳 4. Tự Động Chia Chi Phí & Thanh Toán VietQR
- **Công thức tính tinh gọn**: Chỉ gồm **Tiền sân + Tiền cầu** (tự động nhân theo đơn giá ống và số quả sử dụng).
- **Sinh mã VietQR Napas 24/7**: Tự động tạo mã QR chuyển khoản chính xác tới từng đồng, đúng số tài khoản của Host/người ứng tiền kèm cú pháp chuyển khoản chuẩn: `BSCHEL <Mã trận> <Mã người chơi>`.

### 📖 5. Sổ Thu Tiền & Quản Lý Công Nợ (Ledger)
- **Theo dõi tiến độ thu tiền trực quan**: Thống kê tổng tiền, số tiền đã thu, số tiền còn thiếu và tỷ lệ người đã đóng tiền.
- **Hiển thị số tiền mỗi người**: Nhìn thấy ngay số tiền chính xác mỗi người phải nộp (ví dụ: *Mỗi người: 134.250 đ*).
- **Xác nhận thanh toán 2 chiều**: Host có thể bấm toggle xác nhận đã đóng tiền hoặc hủy xác nhận linh hoạt.

### 🤖 6. BSche Bank Sync (Android App) - Tự Động Gạch Nợ Realtime
- **Ứng dụng Android Native độc lập** ([`android-sync-app`](android-sync-app/)): Chạy ngầm an toàn qua Notification Listener Service, tự động bắt biến động số dư từ các app ngân hàng (Cake, Vietcombank, Techcombank, MB Bank, v.v.).
- **Tự động gạch nợ qua Webhook**: Khớp cú pháp `BSCHEL`, tự động đổi trạng thái người chơi sang *Đã thanh toán* trên web theo thời gian thực mà Host không cần kiểm tra sao kê thủ công.
- **Offline Queue**: Tự động lưu hàng đợi và gửi lại khi có mạng nếu mất kết nối internet.

### 📱 7. Trải Nghiệm PWA Mượt Như Native App
- Hỗ trợ cài đặt trực tiếp lên màn hình chính điện thoại (iOS / Android).
- Tích hợp **Kéo xuống để làm mới (Pull-To-Refresh)** mượt mà.
- Thiết kế Dark-Theme hiện đại, màu sắc chủ đạo Neon Lime cá tính, hỗ trợ phản hồi xúc giác (Haptic Feedback) khi thao tác.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend Web** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack), [React 19](https://react.dev/) |
| **Ngôn ngữ** | TypeScript 5 |
| **Giao diện & Styling** | Tailwind CSS v4, Lucide React Icons, PWA Web Manifest |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, RPC Stored Procedures, Realtime Channels) |
| **Android Sync App** | Kotlin, Android SDK 34, NotificationListenerService, SQLite, OkHttp |
| **Thanh toán & Tiện ích** | VietQR API, `date-fns`, Web Share API |
| **Hosting & Deployment** | Vercel |

---

## 📂 Cấu Trúc Thư Mục (Project Structure)

```text
badminton-schedualer/
├── android-sync-app/           # Ứng dụng Android Native BSche Bank Sync
│   └── app/src/main/           # Kotlin source code, Notification Service & UI
├── docs/                       # Tài liệu kỹ thuật & Nhật ký nhiệm vụ
│   ├── README.md               # Danh mục tổng hợp tất cả các task đã hoàn thành
│   └── tasks/                  # Chi tiết từng task (TASK-01 -> TASK-59)
├── public/                     # Static assets (icon, splash, og-image)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   └── webhook/bank-payment/   # Webhook xử lý gạch nợ tự động từ app Android
│   │   ├── dashboard/          # Trang quản lý dành cho Host
│   │   │   ├── debts/          # Sổ thu tiền & quản lý chi phí
│   │   │   ├── matches/[id]/   # Trang chi tiết trận đấu & điều khiển kèo
│   │   │   ├── profile/        # Quản lý tài khoản & cài đặt ngân hàng nhận tiền
│   │   │   └── venues/         # Kho sân cầu lông dùng chung
│   │   ├── m/[matchId]/        # Magic Public Link điểm danh & thanh toán VietQR
│   │   ├── layout.tsx          # Root Layout & Open Graph Metadata
│   │   └── page.tsx            # Trang đăng nhập / Trang chủ
│   ├── components/             # Reusable UI Components (Modal, DateField, TimeField, Avatars...)
│   └── lib/                    # Tiện ích chung (Supabase Client, i18n, Haptics, VietQR...)
├── supabase/                   # Schema Database & các SQL Migration script
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
BANK_WEBHOOK_SECRET=your-webhook-secret-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. Khởi tạo Database Supabase
Chạy toàn bộ script tại [`supabase/reset-database.sql`](supabase/reset-database.sql) trong **Supabase SQL Editor** để khởi tạo đầy đủ tables, index, RLS policies và stored procedures.

### 4. Chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Truy cập [http://localhost:3000](http://localhost:3000) trên trình duyệt.

### 5. Kiểm tra chất lượng (Verification Gates)
```bash
# Kiểm tra cú pháp và quy chuẩn code
npm run lint

# Kiểm tra kiểu dữ liệu TypeScript
npx tsc --noEmit

# Kiểm tra build production
npm run build
```

---

## 📚 Tài Liệu Kỹ Thuật & Lịch Sử Task (Task History)

Toàn bộ quá trình phân tích nghiệp vụ, kiến trúc hệ thống và kết quả nghiệm thu QA được lưu trữ chi tiết tại:
👉 [**docs/README.md**](docs/README.md)

### Một số mốc nhiệm vụ tiêu biểu:
- **[TASK-59](docs/tasks/optimize-modal-height-and-remove-match-name.md)**: Tối ưu kích thước modal (chống scrollbar khi mở picker) và bỏ tên buổi đánh ở modal sửa lịch.
- **[TASK-58](docs/tasks/center-modals-ui.md)**: Đổi modal tạo lịch, thêm sân và sửa lịch sang dạng căn giữa màn hình (centered modal).
- **[TASK-57](docs/tasks/optional-venue-and-remove-court-number.md)**: Mặc định tùy chọn chưa chọn sân khi tạo/sửa lịch và loại bỏ trường sân số.
- **[TASK-56](docs/tasks/optimize-ledger-per-person-display.md)**: Tối ưu dòng chi phí dưới cùng trong Sổ thu tiền (chỉ hiển thị tiền mỗi người đóng).
- **[TASK-55](docs/tasks/smart-status-button-in-match-detail.md)**: Gộp nút khóa đăng ký và badge trạng thái thành Nút Trạng Thái Thông Minh (Xanh / Đỏ).
- **[TASK-54](docs/tasks/remove-water-fee-and-add-registration-lock.md)**: Xóa bỏ hoàn toàn tiền nước (DB & UI) và bổ sung tính năng khóa nhận người mới.
- **[TASK-42](docs/tasks/universal-bank-sync-onboarding-bind.md)** & **[TASK-36](docs/tasks/build-android-bank-sync-app.md)**: Xây dựng ứng dụng Android Native BSche Bank Sync & Offline Queue.
- **[TASK-01](docs/tasks/magic-public-match-link.md)**: Xây dựng Magic Public Link cho trận đấu (Zero-Friction RSVP & VietQR).

---

## 📄 License
Phát triển bởi xuanthai-work. Bản quyền thuộc về dự án **BSche**.
