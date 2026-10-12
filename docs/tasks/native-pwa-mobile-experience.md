# Task: Native-ize PWA Mobile Experience & Realtime Ledger Sync

## 1. Thông tin chung
- **Mã Task**: TASK-33
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
Tối ưu hóa toàn diện trải nghiệm tương tác trên thiết bị di động (PWA) để tiệm cận cảm giác mượt mà và nhạy bén như Native App:
1. **Khử cảm giác web**: Loại bỏ độ trễ chạm 300ms, vệt xám nhấp nháy (`tap-highlight`), hiệu ứng cuộn nảy lộ nền (`overscroll-bounce`) trên Safari/iOS và chặn vô tình bôi đen văn bản khi thao tác.
2. **Tactile Feedback & Safe Haptics**: Bổ sung phản hồi xúc giác (rung tinh tế) và thị giác tức thì (0ms) khi chạm nút. Trạng thái nghiệp vụ tài chính/RSVP chỉ chốt khi server xác thực thành công.
3. **Đồng bộ thời gian thực (Supabase Realtime)**: Cập nhật tự động Sổ nợ (`/dashboard/debts`) qua WebSocket khi có bất kỳ thay đổi nào từ bảng `match_guests` mà không cần reload trang.

---

## 3. Các thay đổi chính

1. **`src/app/globals.css`**:
   - Thêm `overscroll-behavior-y: none;` và `-webkit-tap-highlight-color: transparent;` cho `html, body`.
   - Bổ sung `touch-action: manipulation;` cho `button, a, input, select, label, [role="button"]` để triệt tiêu độ trễ 300ms.
   - Bổ sung `user-select: none; -webkit-touch-callout: none;` cho các phần tử tương tác tránh bôi đen ngoài ý muốn.

2. **`src/lib/haptics.ts`**:
   - Tạo helper `triggerHaptic(type: "light" | "medium" | "success" | "warning")` sử dụng `navigator.vibrate` với các xung rung tinh tế.
   - Cơ chế fallback an toàn: không ném lỗi trên môi trường không hỗ trợ (desktop hoặc iOS Safari).

3. **`src/app/dashboard/debts/page.tsx`**:
   - Tích hợp Supabase Realtime channel lắng nghe sự kiện `*` trên bảng `match_guests`, tự động reload dữ liệu ngầm khi có biến động nợ/thanh toán.
   - Thêm spinner `Loader2` trong 0ms khi host bấm "Xác nhận đã thanh toán", gọi haptic phản hồi xúc giác tương ứng với kết quả.

4. **`src/app/m/[matchId]/page.tsx`**:
   - Thêm pending spinner tức thì cho nút RSVP ("Tham gia") và nút "Tôi đã chuyển tiền".
   - Kèm phản hồi xúc giác `triggerHaptic` theo luồng thao tác.

5. **`src/components/BottomNav.tsx`**:
   - Tích hợp `triggerHaptic("light")` khi chuyển tab trên thanh điều hướng dưới cùng.

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **ESLint (`npm run lint`)**: PASS (0 lỗi, 0 cảnh báo)
- [x] **TypeScript Typecheck (`npx tsc --noEmit`)**: PASS (0 lỗi)
- [x] **Next.js Production Build (`npm run build`)**: PASS (Turbopack compile và static page generation thành công)
