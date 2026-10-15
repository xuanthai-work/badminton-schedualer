# Task: Bỏ Nút Xóa Người Dùng Khi Chưa Chốt Sổ Tại Trang Chi Tiết Trận Đấu

## 1. Thông tin chung
- **Mã Task**: TASK-49
- **Ngày hoàn thành**: 2026-10-15
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
- **Ẩn hoàn toàn nút xóa người chơi khi chưa chốt sổ**:
  - Khi trận đấu đang mở (`status === "open"`), người chơi tự chủ động điểm danh tham gia hoặc hủy trên Magic link.
  - Loại bỏ hoàn toàn icon thùng rác bên cạnh mỗi người chơi trong danh sách để tránh 100% nguy cơ Host vô tình chạm/quẹt nhầm xóa người tham gia.
- **Duy trì quyền quản lý khi đã chốt sổ**:
  - Chỉ hiển thị nút xóa khi trận đấu **đã chốt sổ** (`status === "closed"`) **VÀ** người chơi đó **chưa thanh toán** (`paymentStatus !== "confirmed"`), phục vụ mục đích loại bỏ người vắng mặt để hệ thống tự động chia lại tiền (`recompute_split`).
  - Người đã thanh toán (`paymentStatus === "confirmed"`) tiếp tục được ẩn nút xóa.

---

## 3. Các thay đổi chính
1. **`src/app/dashboard/matches/[matchId]/page.tsx`**:
   - Cập nhật điều kiện render nút `Trash2` trong `ParticipantList`:
     - Cũ: `isHost && (status !== "closed" || paymentStatus !== "confirmed")`
     - Mới: `isHost && status === "closed" && paymentStatus !== "confirmed"`

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **TypeScript Check**: `npx tsc --noEmit` hoàn tất không có lỗi.
- [x] **Lint Check**: `npm run lint` đạt chuẩn 100%.
- [x] **Code Review**: Logic chặt chẽ, loại bỏ hoàn toàn khả năng ấn nhầm xóa người chơi trước khi chốt sổ.
