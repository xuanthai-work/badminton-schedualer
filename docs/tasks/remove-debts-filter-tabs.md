# Task: Tối Giản Sổ Thu Tiền: Bỏ Thanh Bộ Lọc, Giữ Nguyên Sắp Xếp Dòng Thời Gian

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- **Bỏ thanh tab bộ lọc** (`all`, `pending`, `completed`) trên trang Sổ thu tiền (`/dashboard/debts`), mang lại giao diện tinh gọn, không ma sát, đồng bộ với Trang chủ.
- **Giữ nguyên thứ tự dòng thời gian**: Các trận đấu hiển thị tuần tự từ mới nhất đến cũ nhất theo `matchDate` & `matchTime`, không đảo lộn vị trí.
- Dọn dẹp các translation keys không còn sử dụng (`ledger.all`, `ledger.pending`, `ledger.completed`).

## 3. Các thay đổi chính
1. **`src/app/dashboard/debts/page.tsx`**:
   - Loại bỏ state `filter` và các buttons chuyển tab.
   - Trực tiếp hiển thị `visible = matches` đã được sắp xếp theo thời gian mới nhất trước.
2. **`src/lib/i18n/translations.ts`**:
   - Xóa bỏ các key `all`, `pending`, `completed` trong mục `ledger` ở cả `vi` và `en`.

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
