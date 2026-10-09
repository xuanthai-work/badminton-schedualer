# Task Documentation: TASK-18 - Ẩn Nút Maps Trắng Của Google Và Đồng Bộ Phong Cách Dark-Theme

## 1. Thông tin chung
- **Task ID**: `TASK-18`
- **Tên Task**: Ẩn Nút Maps Trắng Của Google Và Đồng Bộ Phong Cách Dark-Theme (Crop Google Maps Embed Header)
- **Ngày hoàn thành**: 2026-10-09
- **Người thực hiện**: Developer Agent
- **Người kiểm thử / Audit**: Gemini (BA + QA/Auditor)
- **Trạng thái**: **PASS**

---

## 2. Mục tiêu & Vấn đề giải quyết
Khi nhúng iframe Google Maps Embed, Google mặc định tự hiển thị một nút "Maps ↗" với nền trắng ở góc trên bên trái của iframe. Điều này dẫn đến hai vấn đề:
1. Nút nền trắng của Google bị lệch tông thiết kế so với toàn bộ giao diện dark theme (kính mờ, viền xanh lime) của ứng dụng.
2. Trùng lặp với nút badge `openTag` ("↗ Mở Google Maps") ở góc dưới bên phải.

Giải pháp: Sử dụng kỹ thuật crop âm margin (`-mt-10` và tăng chiều cao iframe `h-[calc(100%+40px)]`), container `overflow-hidden` sẽ cắt sạch hoàn toàn thanh header chứa nút trắng của Google, giữ lại điểm ghim đỏ trung tâm và nút mở bản đồ `openTag` chuẩn dark theme ở góc dưới bên phải.

---

## 3. Chi tiết triển khai

### File `src/components/MapsPreview.tsx`
- Cập nhật `className` của `iframe`:
  ```tsx
  <iframe
    src={preview.embedUrl}
    className="pointer-events-none -mt-10 h-[calc(100%+40px)] w-full border-0"
    loading="lazy"
    title="Google Maps"
  />
  ```

---

## 4. Kết quả QA / Technical Audit

- **Typecheck (`npx tsc --noEmit`)**: PASS (0 lỗi).
- **ESLint (`npm run lint`)**: PASS (0 cảnh báo / lỗi).
- **Acceptance Criteria Verification**:
  - [x] Nút trắng "Maps ↗" của Google đã được crop ẩn hoàn toàn khỏi khung nhìn.
  - [x] Nút `↗ Mở Google Maps` phong cách dark theme ở góc dưới bên phải hiển thị rõ ràng và đẹp mắt.
  - [x] Toàn bộ bề mặt bản đồ vẫn là liên kết click mở app Google Maps chỉ đường.
  - [x] Tuân thủ quy định bảo toàn cache dev server.
