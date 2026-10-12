# Project Documentation & Task History

Thư mục lưu trữ tài liệu kỹ thuật và lịch sử các task đã hoàn thành sau khi vượt qua bước **QA / Technical Audit (PASS)**.

## Quy tắc ghi nhận
- Chỉ ghi nhận task vào `docs/tasks/` khi đã được Gemini Audit & QA PASS.
- Cập nhật mục **Completed Tasks** bên dưới sau mỗi task được nghiệm thu thành công.

## Completed Tasks

| Task ID | Tên Task | Ngày hoàn thành | Trạng thái QA | Tài liệu chi tiết |
|---------|----------|-----------------|---------------|-------------------|
| TASK-01 | Magic Public Link cho Trận đấu (Zero-Friction RSVP & VietQR Payment) | 2026-10-09 | **PASS** | [magic-public-match-link.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/magic-public-match-link.md) |
| TASK-02 | Tinh gọn Codebase, Gỡ bỏ Friends & Web Push, Chuyển đổi Trang Công nợ thành "Sổ thu tiền" | 2026-10-09 | **PASS** | [cleanup-ledger-refactor.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/cleanup-ledger-refactor.md) |
| TASK-03 | Chuyển đổi Kiến trúc sang Flat Match-Centric (Bỏ hoàn toàn khái niệm Nhóm) | 2026-10-09 | **PASS** | [flat-matches-refactor.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/flat-matches-refactor.md) |
| TASK-04 | Quản lý Danh sách Sân Cầu Lông & Tự Động Đặt Tên Buổi Đánh | 2026-10-09 | **PASS** | [saved-venues-and-auto-title.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/saved-venues-and-auto-title.md) |
| TASK-05 | Fix UI Ngày Tháng & Địa Điểm Trên Trang Sổ Thu Tiền | 2026-10-09 | **PASS** | [fix-debts-date-ui.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/fix-debts-date-ui.md) |
| TASK-06 | Loại Bỏ Hoàn Toàn Chuông Thông Báo (Remove NotificationBell) | 2026-10-09 | **PASS** | [remove-notification-bell.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/remove-notification-bell.md) |
| TASK-07 | Tối Ưu Trang Tài Khoản - Gỡ Bỏ Tag Cá Nhân & Upload QR Tĩnh | 2026-10-09 | **PASS** | [profile-cleanup-remove-tag-qr.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/profile-cleanup-remove-tag-qr.md) |
| TASK-08 | Tự Động Thêm Host Vào Danh Sách Tham Gia Khi Tạo Buổi Đánh (Auto Host RSVP) | 2026-10-09 | **PASS** | [auto-host-rsvp.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/auto-host-rsvp.md) |
| TASK-09 | Host Có Quyền Xóa Người Tham Gia (Kể Cả Host) Kèm Modal Xác Nhận | 2026-10-09 | **PASS** | [host-remove-participant.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/host-remove-participant.md) |
| TASK-10 | Chuyển Danh Sách Sân Thành Kho Dùng Chung & Chống Trùng Lặp Thông Minh | 2026-10-09 | **PASS** | [shared-venues-deduplication.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/shared-venues-deduplication.md) |
| TASK-11 | Refactor Toàn Diện Codebase & Tạo Script Reset Database Sạch | 2026-10-09 | **PASS** | [codebase-refactor-clean-db.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/codebase-refactor-clean-db.md) |
| TASK-12 | Vá Lỗ Hổng Bảo Mật & Gia Cố Toàn Diện Hệ Thống (Security Hardening) | 2026-10-09 | **PASS** | [security-hardening.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/security-hardening.md) |
| TASK-13 | Giới Hạn Tối Đa 20 Người Tham Gia Cho Trận Đấu (Max Players Hardening) | 2026-10-09 | **PASS** | [max-players-cap.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/max-players-cap.md) |
| TASK-14 | Gia Cố Bảo Mật Toàn Diện (Security Hardening 2.0 - IDOR, XSS, Anti-OOM, Storage) | 2026-10-09 | **PASS** | [security-hardening-2.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/security-hardening-2.md) |
| TASK-15 | Khắc Phục Lỗi Hiển Thị Ảnh Google Maps (Fix Maps Preview CSP & Image Fallback) | 2026-10-09 | **PASS** | [fix-maps-preview-csp.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/fix-maps-preview-csp.md) |
| TASK-16 | Bổ Sung Nút Tải Ảnh VietQR Trên Trang Magic Match Link | 2026-10-09 | **PASS** | [add-download-qr-button.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/add-download-qr-button.md) |
| TASK-17 | Dynamic Open Graph Metadata Cho Trang Magic Match Link (Messenger Link Preview) | 2026-10-09 | **PASS** | [dynamic-match-og-metadata.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/dynamic-match-og-metadata.md) |
| TASK-18 | Ẩn Nút Maps Trắng Của Google Và Đồng Bộ Phong Cách Dark-Theme | 2026-10-09 | **PASS** | [crop-google-maps-embed-button.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/crop-google-maps-embed-button.md) |
| TASK-19 | Tích Hợp Ảnh OG Preview "Cầu Lông Đi Mà ^^" Cho Link Messenger | 2026-10-09 | **PASS** | [add-og-image-preview.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/add-og-image-preview.md) |
| TASK-20 | Chuẩn Hóa Open Graph Preview Card Với Logo BSche (1200x630) & Bổ Sung `og:url` | 2026-10-09 | **PASS** | [standardize-og-preview-card.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/standardize-og-preview-card.md) |
| TASK-21 | Tối Ưu Nút Tải VietQR Trên iOS Safari Bằng Web Share API (Lưu Trực Tiếp Vào Photos) | 2026-10-09 | **PASS** | [ios-safari-qr-web-share.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/ios-safari-qr-web-share.md) |
| TASK-22 | Chuyển Lịch Sử Từ Trang Chủ Sang Sổ Thu Tiền & Tách Bạch Trạng Thái Trận Đấu | 2026-10-12 | **PASS** | [move-history-to-ledger.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/move-history-to-ledger.md) |
| TASK-23 | Tối Ưu Dropdown Sổ Thu Tiền: Bỏ Nút Xem Trận, Gộp Chi Phí Với Công Thức Cầu & Xóa Người Chơi | 2026-10-12 | **PASS** | [optimize-ledger-dropdown.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/optimize-ledger-dropdown.md) |
| TASK-24 | Rà Soát & Dọn Dẹp Code Cũ, Biến Và Translation Keys Không Còn Sử Dụng | 2026-10-12 | **PASS** | [cleanup-dead-code-and-translations.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/cleanup-dead-code-and-translations.md) |
| TASK-25 | Cập Nhật Content Security Policy (CSP) Cho Vercel Speed Insights | 2026-10-12 | **PASS** | [fix-csp-vercel-speed-insights.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/fix-csp-vercel-speed-insights.md) |
| TASK-26 | Tối Giản Sổ Thu Tiền: Bỏ Thanh Bộ Lọc, Giữ Nguyên Sắp Xếp Dòng Thời Gian | 2026-10-12 | **PASS** | [remove-debts-filter-tabs.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/remove-debts-filter-tabs.md) |
| TASK-27 | Đồng Bộ Công Thức Tính Tiền Cầu Vào Form Chốt Chi Phí (Trang Chi Tiết Trận) | 2026-10-12 | **PASS** | [sync-shuttle-formula-match-detail.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/sync-shuttle-formula-match-detail.md) |
| TASK-28 | Sửa Lỗi Layout Che Mất Tên Người Tham Gia (Ẩn Badge & Rút Gọn Nút Xác Nhận) | 2026-10-12 | **PASS** | [fix-participant-row-layout.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/fix-participant-row-layout.md) |
| TASK-29 | Xóa Nút Tải Ảnh QR Trên Trang Magic Link Của Người Chơi | 2026-10-12 | **PASS** | [remove-download-qr-button.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/remove-download-qr-button.md) |
| TASK-30 | Đổi Logic Khóa Điểm Danh RSVP: Chỉ Khóa Khi Host Chốt Tiền | 2026-10-12 | **PASS** | [rsvp-lock-on-match-settle.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/rsvp-lock-on-match-settle.md) |
| TASK-31 | Thiết Kế Lại Phân Cấp Thị Giác Form Chi Phí (Sổ Thu Tiền & Chi Tiết Trận) | 2026-10-12 | **PASS** | [redesign-fee-form-visual-hierarchy.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/redesign-fee-form-visual-hierarchy.md) |
| TASK-32 | Ẩn Nút Xóa Người Chơi Khi Đã Xác Nhận Thanh Toán (Confirmed) | 2026-10-12 | **PASS** | [hide-delete-btn-when-confirmed.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/hide-delete-btn-when-confirmed.md) |
| TASK-33 | Tối Ưu Trải Nghiệm PWA Mượt Như Native App & Đồng Bộ Sổ Nợ Realtime | 2026-10-12 | **PASS** | [native-pwa-mobile-experience.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/native-pwa-mobile-experience.md) |
| TASK-34 | Tích Hợp Kéo Xuống Để Làm Mới (Pull-To-Refresh) Chuẩn Mobile PWA | 2026-10-12 | **PASS** | [pull-to-refresh.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/pull-to-refresh.md) |
| TASK-35 | Chuẩn Hóa Cú Pháp VietQR & Xây Dựng Webhook Tự Động Xác Nhận Chuyển Khoản | 2026-10-12 | **PASS** | [standardize-vietqr-bank-webhook.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/standardize-vietqr-bank-webhook.md) |
| TASK-36 | Xây Dựng Ứng Dụng Android Native BSche Bank Sync (APK) & Offline Queue | 2026-10-12 | **PASS** | [build-android-bank-sync-app.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/build-android-bank-sync-app.md) |
| TASK-37 | Tự Động Chuyển Hướng Sang Sổ Thu Tiền & Mở Bung Trận Đấu Khi Chốt Chi Phí | 2026-10-12 | **PASS** | [auto-redirect-ledger-on-settle.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/auto-redirect-ledger-on-settle.md) |
| TASK-38 | Nâng Cấp Mã VietQR Sang BSCHEL, Sửa Dịch Vụ Bắt Thông Báo Cake Cho Android | 2026-10-12 | **PASS** | [upgrade-vietqr-prefix-bschel-and-fix-cake-sync.md](file:///D:/work/Stuff/badminton-schedualer/docs/tasks/upgrade-vietqr-prefix-bschel-and-fix-cake-sync.md) |
