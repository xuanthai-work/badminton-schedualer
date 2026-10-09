# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Nhóm trưởng / Chủ sân (Organizers)**: Người đứng ra đặt sân, tạo lịch trận đấu cầu lông định kỳ hoặc đột xuất, theo dõi danh sách thành viên tham gia (RSVP) và chịu trách nhiệm chia tiền sân/cầu, thu tiền từ người chơi.
- **Thành viên nhóm / Người chơi phong trào (Players)**: Tham gia các buổi chơi cầu lông cùng bạn bè hoặc nhóm CLB, cần xem lịch đấu, xác nhận tham gia nhanh chóng (Yes/No/Maybe), xem số tiền mình cần thanh toán và thực hiện chuyển khoản qua mã QR (VietQR) tiện lợi trên điện thoại.

## Product Purpose
BSche là nền tảng quản lý lịch chơi cầu lông và tài chính nhóm tinh gọn, giúp việc hẹn lịch, chốt danh sách người chơi và chia tiền sân trở nên minh bạch, tự động và không còn tình trạng quên nợ hay khó xử khi thu tiền. Thành công của sản phẩm là giảm thiểu thời gian nhắn tin trao đổi qua chat group, tự động hóa tính toán chi phí theo số lượng người tham gia thực tế và tạo mã QR thanh toán tức thì.

## Positioning
Khác với các ứng dụng quản lý giải đấu hay booking sân thương mại phức tạp, BSche tập trung giải quyết triệt để bài toán sinh hoạt cầu lông phong trào đời thực tại Việt Nam: **Tạo kèo nhanh - Chốt danh sách RSVP chuẩn - Chia tiền sòng phẳng - Quét VietQR thanh toán trong vài giây**, tối ưu giao diện dạng ứng dụng di động (PWA) để thao tác tức thì ngay tại sân.

## Operating Context
- **Môi trường sử dụng thực tế**: Người dùng chủ yếu thao tác trên điện thoại di động khi đang di chuyển hoặc trực tiếp tại sân cầu lông (ánh sáng thay đổi, thao tác nhanh một tay giữa các set đấu).
- **Thói quen thanh toán**: Sử dụng ngân hàng số và quét mã VietQR phổ biến tại Việt Nam.
- **Kênh thông báo**: Dựa trên Web Push Notification và liên kết chia sẻ trực tiếp (PWA standalone hoặc trình duyệt di động) để nhắc lịch và báo nợ.

## Capabilities and Constraints
- **Chức năng chính đã xác nhận**:
  - Quản lý nhóm (Groups) & Lời mời thành viên qua username hoặc liên kết.
  - Tạo và quản lý trận đấu (Matches): Thời gian, sân đấu, địa điểm (tích hợp bản đồ/Google Maps), số sân, thời hạn chốt điểm danh (RSVP cutoff).
  - Điểm danh & Trạng thái RSVP (Tham gia / Không tham gia / Có thể).
  - Quản lý công nợ (Debts) & Chia tiền (Split bill): Tính tiền theo đầu người hoặc tùy biến người chịu chi phí; sinh mã VietQR chuyển khoản trực tiếp theo thông tin ngân hàng của chủ sân.
  - Xác nhận nợ & Lịch sử thanh toán.
  - Đa ngôn ngữ (i18n: Tiếng Việt `vi` và Tiếng Anh `en`).
  - Web Push Notifications & PWA Manifest.
- **Ràng buộc kỹ thuật**:
  - Tech stack: Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (PostgreSQL & Row Level Security).
  - Giao diện: Thiết kế ưu tiên Mobile (Mobile-first layout với Bottom Navigation), hỗ trợ Dark mode (#020617 background).

## Brand Commitments
- **Tên sản phẩm**: BSche (Badminton Scheduler).
- **Tone & Voice**: Thân thiện, tiện dụng, rõ ràng, minh bạch, mang tinh thần thể thao phong trào.
- **Nhận diện**: Tông màu tối hiện đại (`#020617`), điểm nhấn màu thể thao nổi bật, icon cầu lông đặc trưng.

## Evidence on Hand
- Mã nguồn đầy đủ với các luồng Dashboard, Quản lý Nhóm, Trận đấu, Công nợ và Hồ sơ cá nhân (`src/app/dashboard/*`).
- Hệ thống cơ sở dữ liệu Supabase và các hàm RPC/RLS sẵn có trong `supabase/*.sql`.
- Bộ bản dịch song ngữ Việt - Anh đầy đủ tại `src/lib/i18n/translations.ts`.
- Danh mục mã ngân hàng Việt Nam tích hợp VietQR tại `src/lib/banks.ts`.

## Product Principles
1. **Mobile-First & Thao tác tại sân**: Mọi luồng chính (RSVP, xem tiền, quét QR) phải thực hiện được trong vòng dưới 10 giây trên màn hình điện thoại.
2. **Minh bạch tài chính**: Số tiền chia, ai đã thanh toán, ai còn nợ phải rõ ràng, không gây nhập nhằng hay khó xử giữa bạn bè.
3. **Tiết kiệm thao tác (Zero Friction)**: Tự động hóa tính toán chi phí theo số lượng người tham gia thực tế; tích hợp sẵn VietQR để không cần nhập số tài khoản thủ công.
4. **Đáng tin cậy & Real-time**: Thông tin trạng thái trận đấu và thanh toán được cập nhật tức thì, hỗ trợ nhắc nhở thông minh.

## Accessibility & Inclusion
- Độ tương phản màu sắc cao trên nền tối, nút bấm và vùng chạm (touch target) tối thiểu 44x44px đảm bảo dễ thao tác bằng một tay trên điện thoại.
- Hỗ trợ đầy đủ tiếng Việt có dấu và hiển thị định dạng tiền tệ VND chuẩn mực (`formatVnd`).
