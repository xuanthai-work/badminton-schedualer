# Task: Tối Ưu Dropdown Sổ Thu Tiền: Bỏ Nút Xem Trận, Gộp Chi Phí Với Công Thức Cầu & Xóa Người Chơi

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- **Bỏ nút "Xem trận"** trên thẻ trận ở trang Sổ thu tiền (`/dashboard/debts`).
- **Khối Người tham gia & Xóa người chơi**:
  - Tích hợp nút Xóa người (`Trash2`) cho từng người tham gia trong dropdown Sổ thu tiền kèm popup xác nhận (Nút Xác nhận xóa BÊN TRÁI, Hủy BÊN PHẢI).
  - Gọi RPC `host_remove_guest` xóa người và tự động chia lại tiền (`recompute_split`).
- **Khối Chi phí & Cập nhật chi phí (Gộp All-in-One)**:
  - Form trực quan hiển thị và chỉnh sửa trực tiếp Tiền sân, Tiền cầu, Tiền nước.
  - Hỗ trợ công thức tính tiền cầu ngầm: `(Giá 1 ống / 12) × Số quả cầu đã dùng`.
  - Tính nhẩm realtime: Tổng chi phí và Tiền mỗi người trả.
  - Nút "Cập nhật chi phí" lưu vào DB qua RPC `settle_match`.

## 3. Các thay đổi chính
1. **`src/app/dashboard/debts/page.tsx`**:
   - Mở rộng kiểu dữ liệu `LedgerMatch` thêm `courtFee`, `shuttleFee`, `waterFee` và query từ Supabase.
   - Loại bỏ nút "Xem trận" (`viewMatch`).
   - Tích hợp nút xóa khách và modal xác nhận `payerToRemove` chuẩn UX.
   - Xây dựng component `FeeForm` gộp xem chi phí và cập nhật chi phí với công thức tính tiền cầu ngầm.
2. **`src/lib/i18n/translations.ts`**:
   - Bổ sung translation keys cho `tubePrice`, `shuttleCount`, `shuttleUnit`.

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
