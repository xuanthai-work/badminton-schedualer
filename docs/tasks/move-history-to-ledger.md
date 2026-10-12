# Task: Chuyển lịch sử từ Trang chủ sang Sổ thu tiền & Tách bạch trạng thái trận đấu

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- **Trang chủ (`/dashboard`)**: Chỉ hiển thị các trận CHƯA chốt tiền (`status === "open"`), loại bỏ phân chia `upcoming` / `history`.
- **Sổ thu tiền (`/dashboard/debts`)**: Quản lý toàn bộ các trận ĐÃ chốt tiền (`status === "closed"`), bổ sung khung giờ thi đấu, nút sao chép link mời và nút xóa buổi đánh từ phần lịch sử cũ.

## 3. Các thay đổi chính
1. **`src/app/dashboard/page.tsx`**:
   - Bỏ state `tab` và buttons chuyển đổi `upcoming` / `history`.
   - Lọc và hiển thị danh sách các trận `status === "open"`, sắp xếp theo thứ tự thời gian.
   - Cập nhật EmptyState hiển thị khi không có trận nào đang mở.
2. **`src/app/dashboard/debts/page.tsx`**:
   - Bổ sung `matchTime` và `matchEndTime` vào `LedgerMatch` và truy vấn từ Supabase.
   - Hiển thị khung giờ thi đấu trên card trận đấu.
   - Bổ sung nút "Sao chép link mời" và nút "Xóa buổi đánh" (với modal xác nhận).
3. **`src/lib/i18n/translations.ts`**:
   - Dọn dẹp các translation keys không còn sử dụng (`dashboard.upcoming`, `dashboard.history`, `dashboard.emptyHistory`).

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
