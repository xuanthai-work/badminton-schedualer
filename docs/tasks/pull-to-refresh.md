# Task: Tích Hợp Kéo Xuống Để Làm Mới (Pull-To-Refresh) Chuẩn Mobile PWA

## 1. Thông tin chung
- **Mã Task**: TASK-34
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
- Xây dựng tính năng kéo xuống để làm mới (Pull-to-Refresh) chuẩn Mobile Native thay thế reload của trình duyệt:
  - Cho phép người dùng chủ động vuốt kéo từ đỉnh màn hình xuống để tải lại dữ liệu mới nhất mà không phải thoát trang.
  - Phản hồi xúc giác & thị giác mượt mà: spinner xoay tỷ lệ theo cự ly kéo, rung nhẹ haptic (`triggerHaptic`) khi kéo đủ ngưỡng (threshold) và quay đều trong lúc fetch dữ liệu.
  - Tái sử dụng dưới dạng component wrapper `<PullToRefresh>` áp dụng cho 4 màn hình chính:
    1. Chi tiết trận đấu của host (`/dashboard/matches/[matchId]`)
    2. Trang chủ Dashboard (`/dashboard`)
    3. Sổ nợ / Quản lý thu tiền (`/dashboard/debts`)
    4. Trang công khai của người chơi (`/m/[matchId]`)

---

## 3. Các thay đổi chính

1. **`src/components/PullToRefresh.tsx`**:
   - Tạo mới component wrapper cảm ứng:
     - Bắt sự kiện `touchstart`, `touchmove`, `touchend`, `touchcancel`.
     - Chỉ kích hoạt khi người dùng đang ở đỉnh trang (`window.scrollY <= 0`).
     - Hệ số cản ma sát `DAMPING = 0.4`, giới hạn kéo tối đa `MAX_PULL = 80px`, ngưỡng kích hoạt `THRESHOLD = 60px`.
     - Gọi `triggerHaptic("light")` khi chạm ngưỡng và `triggerHaptic("success")` khi tải xong.
     - Indicator tròn nổi bật ở đỉnh với `Loader2` màu lime.

2. **`src/app/dashboard/matches/[matchId]/page.tsx`**:
   - Bọc nội dung trang bằng `<PullToRefresh onRefresh={load}>`. Host có thể vuốt làm mới danh sách người tham gia và chi phí bất kỳ lúc nào.

3. **`src/app/dashboard/page.tsx`**:
   - Bọc danh sách trận đấu bằng `<PullToRefresh onRefresh={() => (userId ? loadMatches(userId) : Promise.resolve())}>`.

4. **`src/app/dashboard/debts/page.tsx`**:
   - Bọc danh sách sổ nợ bằng `<PullToRefresh onRefresh={() => (userId ? load(userId) : Promise.resolve())}>`.

5. **`src/app/m/[matchId]/page.tsx`**:
   - Bọc trang public bằng `<PullToRefresh onRefresh={load}>`.

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **ESLint (`npm run lint`)**: PASS (0 errors, 0 warnings)
- [x] **TypeScript Typecheck (`npx tsc --noEmit`)**: PASS (0 errors)
- [x] **Next.js Production Build (`npm run build`)**: PASS (Turbopack compile và static page generation thành công)
