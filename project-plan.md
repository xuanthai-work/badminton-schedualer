Dưới đây là bản thiết kế hệ thống và lộ trình phát triển cho ứng dụng quản lý lịch đánh cầu lông của bạn, tập trung vào tính thực dụng và tối ưu chi phí.

### 1. Kiến trúc Hệ thống & Công nghệ (Tech Stack)

**Frontend (Client-side)**

* **Ngôn ngữ:** TypeScript.
* **Framework:** Next.js (React) hoặc Vite (React/Svelte). Next.js có ưu điểm xử lý routing tốt và dễ dàng deploy zero-cost.
* **Styling:** Tailwind CSS (nhanh, gọn, không cần viết CSS thuần).
* **Hosting:** Vercel hoặc Cloudflare Pages (Free tier dư sức cho ứng dụng nhóm nhỏ).

**Backend & Cơ sở dữ liệu (Cloud-First, Zero-cost)**
Thay vì tự code toàn bộ backend từ đầu, bạn nên sử dụng **BaaS (Backend as a Service)** để tiết kiệm thời gian và hoàn toàn miễn phí.

* **Lựa chọn 1: Supabase (Khuyên dùng).** Cung cấp sẵn database PostgreSQL, API (REST/GraphQL), và hệ thống Authentication. Free tier cho phép 500MB database và 50,000 MAU, quá đủ cho nhu cầu này. Bạn chỉ cần gọi API trực tiếp từ Frontend TypeScript.
* **Lựa chọn 2: Cloudflare Workers + Cloudflare D1 (SQLite).** Hoàn toàn serverless, chi phí bằng 0 cho hàng trăm ngàn request mỗi ngày. Thích hợp nếu bạn muốn tự viết logic API bằng TypeScript.

**Phương án Backup: Localhost (Self-hosted)**
Nếu không muốn dùng Cloud hoặc muốn tận dụng phần cứng sẵn có, bạn có thể tự host toàn bộ hệ thống:

* Đóng gói Backend (Node.js/Python) và Database (PostgreSQL) dưới dạng **Docker container**.
* Chạy các container này thông qua Docker Desktop trên máy tính cá nhân.
* Để các thành viên khác truy cập vào web mà không cần cấu hình port-forwarding phức tạp hay mua IP tĩnh, bạn có thể sử dụng giải pháp VPN Mesh như **Tailscale**. Các thành viên chỉ cần cài Tailscale để tham gia vào mạng nội bộ ảo và truy cập IP local của máy bạn.

---

### 2. Thiết kế Cơ sở dữ liệu (Database Schema)

Hệ thống cần các bảng (tables) cốt lõi sau:

* **Users:** `id`, `name`, `email`
* **Groups:** `id`, `name`, `created_by` (người tạo nhóm)
* **Group_Members:** `group_id`, `user_id`, `role` (Admin/Member)
* **Matches (Lịch đánh):** `id`, `group_id`, `date`, `time`, `location`, `status` (Open/Closed)
* **RSVPs (Xác nhận tham gia):** `match_id`, `user_id`, `status` (Yes/No)
* **Expenses (Chi phí - 1-1 với Match):** `match_id`, `court_fee`, `shuttle_fee`, `water_fee`, `total_amount`, `fee_per_person`

---

### 3. Luồng nghiệp vụ (Business Logic)

**Tính năng 1: Tạo nhóm & Lịch**

* User đăng nhập (Google Auth qua Supabase).
* Tạo Group và thêm thành viên (nhập email hoặc chia sẻ link invite).
* Admin tạo một Match mới (chọn ngày, giờ, sân). Trạng thái mặc định là "Open".

**Tính năng 2: Quản lý RSVP (Điểm danh)**

* Khi Match được tạo, các thành viên trong Group sẽ thấy lịch trên dashboard.
* Thành viên bấm nút "Tham gia" (Yes) hoặc "Nghỉ" (No).
* Giao diện hiển thị realtime danh sách những người đã chọn "Yes". Hệ thống sẽ khóa việc đổi trạng thái trước giờ đánh 1-2 tiếng (tùy bạn cấu hình).

**Tính năng 3: Chốt chi phí & Chia tiền**

* Sau buổi đánh, Admin chuyển trạng thái Match sang "Closed".
* Admin nhập 3 thông số: Tiền sân, Tiền cầu, Tiền nước.
* Logic tính toán (chạy trên Frontend hoặc API):
* Tổng chi phí = Tiền sân + Tiền cầu + Tiền nước.
* Số người tham gia = Đếm số lượng RSVP có `status == Yes`.
* Tiền mỗi người = Tổng chi phí / Số người tham gia.


* Giao diện hiển thị số tiền mỗi cá nhân cần đóng. Có thể tích hợp việc tạo mã QR chuyển khoản (dùng API VietQR miễn phí) để mọi người quét và trả tiền trực tiếp.

---

### 4. Lộ trình triển khai (Action Plan)

* **Phase 1 (Setup & Auth):** Khởi tạo Next.js TypeScript, kết nối Supabase. Làm tính năng đăng nhập và quản lý User/Group.
* **Phase 2 (Core Features):** Viết tính năng tạo lịch (Matches) và hệ thống điểm danh (RSVP).
* **Phase 3 (Billing):** Thêm form nhập chi phí, tính toán chia tiền và hiển thị bảng tổng kết chi phí cho từng cá nhân. Tích hợp QR code thanh toán.
* **Phase 4 (Deploy):** Đẩy mã nguồn lên GitHub, kết nối Vercel để auto-deploy frontend. Tùy chọn thiết lập môi trường Docker + Tailscale nếu chạy localhost.