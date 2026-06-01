# Tài liệu Thiết kế Giao diện (Frontend Design Specification)
**Dự án:** Ứng dụng Quản lý Lịch Đánh Cầu Lông & Chia sẻ Chi phí (Badminton Match Scheduler & Split-Bill)
**Công nghệ:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons, Supabase Real-time.

---

## 1. Định Hướng Trải Nghiệm (UX) & Thiết Kế Mỹ Thuật (UI)

### 1.1. Tuyên ngôn Thiết kế (Design Principles)
* **Mobile-First:** 95% thành viên sẽ truy cập bằng điện thoại ngay tại sân để điểm danh (RSVP) hoặc quét mã QR thanh toán. Giao diện phải được tối ưu hoàn hảo cho màn hình dọc di động.
* **Dynamic & High-Tech (Thể thao & Hiện đại):** Giao diện mang tinh thần thể thao trẻ trung, mạnh mẽ. Sử dụng chế độ tối (Dark Mode) làm chủ đạo để làm nổi bật các chi tiết neon, tạo cảm giác cao cấp và giảm mỏi mắt khi sử dụng ở sân tập có ánh sáng mạnh.
* **Real-time Feedback:** Mọi thao tác như bấm tham gia (RSVP Yes/No), chốt chi phí phải phản hồi lập tức và đồng bộ tức thời giữa các thành viên nhờ Supabase Real-time.

### 1.2. Hệ màu sắc chủ đạo (Color Palette)
Hệ màu được thiết kế hài hòa, sử dụng mã màu HSL để dễ cấu hình và duy trì hiệu ứng bóng đổ mịn màng:

| Vai trò màu | Mã màu gợi ý (Tailwind) | Mã Hex | Mô tả trải nghiệm trực quan |
| :--- | :--- | :--- | :--- |
| **Background** | `bg-slate-950` | `#020617` | Nền tối sâu thẳm như không gian đêm thể thao chuyên nghiệp. |
| **Primary/Accent** | `text-lime-400` / `bg-lime-500` | `#a3e635` / `#84cc16` | **Màu Xanh Volt (Vàng chanh quả cầu lông)** - Mang năng lượng thể thao mạnh mẽ. |
| **Surface/Card** | `bg-slate-900/60` | `#0f172a` (60%) | Hiệu ứng kính mờ (Glassmorphism) với đường viền mảnh `border-slate-800`. |
| **Success (Yes)** | `text-emerald-400` | `#34d399` | Trạng thái đồng ý tham gia đấu. |
| **Danger (No)** | `text-rose-400` | `#fb7185` | Trạng thái không tham gia hoặc từ chối. |
| **Warning/Alert** | `text-amber-400` | `#fbbf24` | Thông báo trạng thái chờ thanh toán hoặc cần hành động khẩn. |

---

## 2. Kiến Trúc Cấu Trúc Các Màn Hình (Routing & Pages)

Ứng dụng sử dụng cấu trúc **Next.js App Router** nằm trong thư mục `src/app`:

```
src/app/
├── layout.tsx                # Layout bao ngoài (Provider, Auth listener, global CSS)
├── page.tsx                  # Landing Page / Đăng nhập Google (Auth)
├── dashboard/
│   └── page.tsx              # Danh sách Nhóm, Lịch đấu hôm nay, Tổng quan công nợ cá nhân
├── group/
│   └── [groupId]/
│       └── page.tsx          # Chi tiết Nhóm: Lịch sắp tới, Lịch sử đấu, Danh sách thành viên
└── match/
    └── [matchId]/
        └── page.tsx          # Chi tiết Trận: Bảng điểm danh RSVP, Tính năng chia tiền & VietQR
```

---

## 3. Đặc Tả Chi Tiết Giao Diện & Linh Kiện (Component Specifications)

### 3.1. Trang Landing / Đăng nhập (`/`)
* **Thiết kế:**
  - Background sử dụng một bức ảnh mờ nghệ thuật hoặc đồ họa vector trừu tượng của quả cầu lông cách điệu phát sáng màu xanh volt.
  - Sử dụng tiêu đề lớn: `Chơi cầu lông không lo chia tiền.`
* **Tương tác:**
  - Nút đăng nhập Google Auth nổi bật dạng Glassmorphism, bo góc `rounded-2xl`, hiệu ứng chuyển sắc sang xanh volt khi di chuột qua (`hover:shadow-[0_0_20px_rgba(163,230,53,0.4)]`).
  - Sử dụng micro-animation nhẹ nhàng xoay nhẹ quả cầu lông ở background khi di chuyển chuột.

### 3.2. Màn hình Dashboard (`/dashboard`)
Giao diện trung tâm chứa thông tin tổng hợp của người dùng.
* **Component 1: Tổng hợp Công nợ cá nhân (Net Debts Widget)**
  - Hiển thị số tiền bạn cần đóng hoặc bạn cần thu (nếu là Admin) trên các nhóm.
  - Tông màu: Đỏ nhạt (`text-rose-400`) cho khoản phải đóng, Xanh nhạt (`text-emerald-400`) cho khoản phải thu.
* **Component 2: Danh sách Nhóm của tôi (My Groups)**
  - Thiết kế Grid hiển thị các nhóm dưới dạng thẻ card kính mờ. Mỗi thẻ hiển thị: Tên nhóm, số lượng thành viên, tên Admin.
  - Có nút nổi bật dạng Floating Button `+ Tạo Nhóm mới` để mở một Pop-up Panel dạng Slide-over.
* **Component 3: Lịch Đấu Sắp Diễn Ra (Today/Upcoming Match Widget)**
  - Hiển thị trận đấu gần nhất. Tích hợp nút chọn RSVP nhanh `Tham gia ✅` / `Nghỉ ❌` trực tiếp ngoài Dashboard mà không cần vào chi tiết.

### 3.3. Chi tiết Nhóm (`/group/[groupId]`)
Trang quản lý chi tiết của một câu lạc bộ/nhóm đấu.
* **Tab 1: Lịch đấu (Matches)**
  - Hiển thị danh sách trận đấu được phân loại thành **Sắp diễn ra (Upcoming)** và **Đã kết thúc (Past)**.
  - Cung cấp nút `+ Lên lịch buổi mới` dành riêng cho Admin của nhóm.
* **Tab 2: Thành viên (Members)**
  - Danh sách thành viên cùng Avatar từ Google Auth. Có huy hiệu nhỏ `Admin` hoặc `Thành viên`.
  - Nút `Mời thành viên` sinh ra liên kết mời (Invite Link) động để gửi qua Zalo/Messenger.
* **Tab 3: Thống kê chi phí (Stats)**
  - Biểu đồ thống kê chi phí sân, cầu, nước theo từng tháng bằng thư viện đồ họa tối giản (hoặc Tailwind CSS Bars).

### 3.4. Chi tiết Trận đấu & RSVP (`/match/[matchId]`)
Đây là màn hình hoạt động chính của hệ thống, đòi hỏi UX/UI tỉ mỉ nhất.

```
+-------------------------------------------------------------+
|  [<- Nhóm Thứ 3 Vui Vẻ]                Trận Đấu #42         |
|  📅 Thứ 3, 20:00 - 22:00 | 📍 Sân Viettel, Sân số 3        |
|  🟢 Trạng thái: Đang mở điểm danh                           |
+-------------------------------------------------------------+
|                                                             |
|   DANH SÁCH THAM GIA (8/12) - Giới hạn: 12 người            |
|                                                             |
|   [Yes] 🟢 Attending (8)           [No] 🔴 Absent (2)       |
|   -------------------------        ----------------------   |
|   1. 👤 Nguyễn Văn A (Admin)       1. 👤 Trần Văn X         |
|   2. 👤 Lê Hoàng B                 2. 👤 Phạm Thị Y         |
|   3. 👤 Trần C                                              |
|                                                             |
|   [ ] Hạn chốt điểm danh: Trước 18:00 cùng ngày             |
+-------------------------------------------------------------+
|                                                             |
|   BẠN CÓ THAM GIA BUỔI NÀY KHÔNG?                           |
|   +-----------------------+   +--------------------------+  |
|   |    ✅ THAM GIA (Yes)  |   |      ❌ BẬN/NGHỈ (No)    |  |
|   +-----------------------+   +--------------------------+  |
|                                                             |
+-------------------------------------------------------------+
|   [ADMIN PANEL: CHỐT CHI PHÍ & CHIA TIỀN]                   |
+-------------------------------------------------------------+
```

#### Trạng thái 1: Trận đấu đang mở (Open)
* **Bảng danh sách RSVP thời gian thực:**
  - Chia làm hai cột: "Tham gia" và "Nghỉ".
  - Người dùng bấm nút RSVP sẽ lập tức kích hoạt hiệu ứng scale nhảy nhẹ (Spring physics) của avatar của họ di chuyển từ cột này sang cột khác kèm theo âm thanh nhẹ (haptic feedback nếu chạy trên Webview/PWA).
  - Có thanh tiến trình (Progress bar) chỉ giới hạn số người tối đa (Ví dụ: `8 / 12 người`). Nếu đầy, nút đăng ký sẽ chuyển sang trạng thái danh sách chờ (Waiting List).

#### Trạng thái 2: Trận đấu đã chốt chi phí (Closed) - Tính năng Chia tiền & VietQR
Khi Admin chốt chi phí, phần giao diện điểm danh sẽ hiển thị hóa đơn thu nhỏ cực đẹp:

1. **Bảng phân bổ chi phí (Expense Breakdown Card):**
   - Thiết kế dạng hóa đơn siêu thị (Receipt) cách điệu với đường viền đứt nét ở chân.
   - Thống kê chi tiết:
     * Tiền sân: `500,000đ`
     * Tiền cầu: `120,000đ`
     * Tiền nước: `50,000đ`
     * **Tổng chi phí:** `670,000đ`
     * **Số người chia:** `8` (chỉ đếm RSVP = Yes)
     * **Mỗi người đóng:** `83,750đ` (Tự động làm tròn thông minh hoặc giữ nguyên).
2. **VietQR Dynamic Generator (Linh hồn của thanh toán nhanh):**
   - **Cơ chế:** Giao diện hiển thị một mã QR thanh toán động được tạo thông qua API của VietQR (`img.vietqr.io`).
   - **URL Generator mẫu:**
     ```
     https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact.png?amount=<AMOUNT>&addInfo=<MEMO>&accountName=<NAME>
     ```
     * Trong đó:
       - `<BANK_ID>`: Ngân hàng của Admin (Ví dụ: `vcb`, `mbbank`).
       - `<ACCOUNT_NO>`: Số tài khoản của Admin.
       - `<AMOUNT>`: `83750` (Tự động điền đúng số tiền lẻ của người dùng cần đóng).
       - `<MEMO>`: Nội dung chuyển khoản tự động chuẩn hóa dạng không dấu để tránh lỗi: `BADMINTON <GROUP_ID> <MATCH_ID> <USER_NAME_NO_ACCENT>` (Ví dụ: `BADMINTON T3VV 42 NGUYEN VAN A`).
   - **Giao diện:** Mã QR nằm ở vị trí trung tâm, bên cạnh có nút `Bấm để phóng to` hoặc `Sao chép số tài khoản & nội dung` hỗ trợ người dùng chuyển khoản thủ công.
   - **Trạng thái đóng tiền:** Danh sách thành viên bên dưới sẽ có thêm nút kiểm duyệt màu cam/xanh bên cạnh tên:
     * Thành viên bấm: `Tôi đã chuyển khoản` -> Chuyển sang trạng thái "Đợi Admin duyệt" (`amber-400`).
     * Admin thấy tiền về, bấm xác nhận -> Chuyển sang trạng thái "Đã thanh toán" (`emerald-400`).

---

## 4. Hệ Thống Micro-Animations & Hiệu Ứng Chuyển Động

Ứng dụng hướng tới tiêu chuẩn thiết kế cao cấp, sử dụng thư viện **Framer Motion** để tạo cảm giác mượt mà trong từng chuyển động:

1. **Slide-over Modal (Bảng trượt từ dưới lên):**
   - Khi Admin bấm "Chốt tiền", bảng nhập chi phí sẽ trượt từ cạnh dưới màn hình lên với gia tốc mượt mà (`type: "spring", stiffness: 300, damping: 30`).
2. **Interactive RSVP Buttons:**
   - Khi hover vào nút "Tham gia", nút sẽ có viền sáng neon màu xanh lime lan tỏa nhẹ.
   - Khi bấm, nút sẽ thu nhỏ nhẹ (`scale: 0.95`) rồi nảy lên (`scale: 1.05`) để phản hồi xúc giác trực quan.
3. **Skeleton Loading:**
   - Thay vì hiển thị vòng xoay spinner truyền thống, ứng dụng sử dụng các khung xương xám mờ chuyển động sóng (`animate-pulse`) để duy trì độ cao cấp của giao diện trong quá trình tải dữ liệu Supabase.

---

## 5. Quy Chuẩn Kỹ Thuật Khi Triển Khai (Tailwind & CSS Tokens)

Để duy trì tính nhất quán của thiết kế, chúng ta sẽ thiết lập các biến Tailwind mở rộng trong tệp cấu hình `tailwind.config.ts` (hoặc định nghĩa trong `globals.css`):

### 5.1. Cấu hình biến CSS (`src/app/globals.css`)
```css
@layer base {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    
    /* Volt Green (Xanh cầu lông) */
    --primary: 84.2 81% 54%; 
    --primary-foreground: 222.2 47.4% 11.2%;
    
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --border: 217.2 32.6% 17.5%;
  }
}
```

### 5.2. Hiệu ứng viền mờ cao cấp (Glassmorphism Utility)
Định nghĩa sẵn class CSS để tái sử dụng trên các thẻ card và bảng điều khiển:
```css
.glass-panel {
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

---

## 6. Lộ Trình Phát Triển Giao Diện (UI Implementation Steps)

1. **Bước 1:** Khởi tạo nền tảng thiết kế bằng cách thiết lập tệp `globals.css` với bảng màu Volt Green và Glassmorphism.
2. **Bước 2:** Xây dựng khung giao diện chính (Shell Layout) bao gồm thanh điều hướng di động (Bottom Navigation Bar) dạng icon tối giản (Trang chủ, Nhóm, Tài khoản).
3. **Bước 3:** Phát triển linh kiện cốt lõi của ứng dụng - **Trang RSVP & QR Chia Tiền Real-time**. Thiết lập cơ chế kết nối real-time của Supabase để kiểm tra sự phản hồi.
4. **Bước 4:** Hoàn thiện trải nghiệm PWA (Progressive Web App) để người dùng có thể "Thêm vào màn hình chính" (Add to Home Screen) trên điện thoại, tạo trải nghiệm như một ứng dụng di động thực thụ không cần qua App Store/Google Play.
