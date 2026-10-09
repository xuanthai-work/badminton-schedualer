# Task Documentation: TASK-17 - Dynamic Open Graph Metadata Cho Trang Magic Match Link

## 1. Thông tin chung
- **Task ID**: `TASK-17`
- **Tên Task**: Dynamic Open Graph Metadata Cho Trang Magic Match Link (Messenger / Social Link Preview)
- **Ngày hoàn thành**: 2026-10-09
- **Người thực hiện**: Developer Agent
- **Người kiểm thử / Audit**: Gemini (BA + QA/Auditor)
- **Trạng thái**: **PASS**

---

## 2. Mục tiêu & Vấn đề giải quyết
Trước đây, khi người dùng sao chép link trận đấu (`/m/[matchId]`) gửi vào Facebook Messenger, Zalo, hay Telegram, tin nhắn chỉ hiển thị thông tin chung chung tĩnh:
- Tiêu đề: `BSche`
- Mô tả: `Badminton match scheduling and cost splitting`

Điều này khiến người nhận không biết ngay link đó là dành cho trận đấu của thứ mấy, ngày nào, mấy giờ hay ở sân nào.
Task này bổ sung dynamic Open Graph metadata server-side cho từng trận đấu cụ thể:
- **Tiêu đề (OG Title)**: `🏸 [Tên trận hoặc Sân] | [Thứ], DD/MM`
- **Mô tả (OG Description)**: `📅 [Thứ], DD/MM/YYYY • ⏰ HH:mm - HH:mm • 📍 [Địa điểm sân] — Bấm để điểm danh tham gia!`

---

## 3. Chi tiết triển khai

### 3.1. Tạo Server Layout `src/app/m/[matchId]/layout.tsx`
- Tạo Layout dạng Server Component bọc `src/app/m/[matchId]/page.tsx`.
- Export hàm `generateMetadata`:
  - Nhận `params: Promise<{ matchId: string }>` theo đúng quy chuẩn bất đồng bộ của Next.js 16 App Router.
  - Gọi Supabase RPC `get_public_match` để lấy chi tiết trận đấu (`title`, `date`, `time`, `endTime`, `location`).
  - Xử lý chuyển đổi `date` (YYYY-MM-DD) sang định dạng tiếng Việt: Thứ trong tuần ("Thứ Hai" -> "Chủ Nhật"), ngày/tháng ngắn (`DD/MM`) và ngày/tháng/năm đầy đủ (`DD/MM/YYYY`).
  - Format thời gian bắt đầu và kết thúc (`HH:mm - HH:mm`).
  - Tạo `title`, `description`, `openGraph` (Facebook, Messenger, Zalo) và `twitter`.
  - Có cơ chế fallback an toàn khi link không tồn tại hoặc lỗi mạng, không làm crash server.

---

## 4. Kết quả QA / Technical Audit

- **Typecheck (`npx tsc --noEmit`)**: PASS (0 lỗi).
- **ESLint (`npm run lint`)**: PASS (0 cảnh báo / lỗi).
- **Acceptance Criteria Verification**:
  - [x] File `src/app/m/[matchId]/layout.tsx` hoạt động hoàn toàn ở Server Component.
  - [x] Bot crawler của Messenger / Zalo quét được đầy đủ thứ, ngày/tháng, giờ, sân.
  - [x] Không can thiệp hay ảnh hưởng logic của `page.tsx` hiện tại.
  - [x] Tuân thủ tuyệt đối quy tắc không chạy build làm hỏng dev cache.
