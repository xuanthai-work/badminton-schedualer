# Task: Thiết Kế Lại Phân Cấp Thị Giác Form Chi Phí (Sổ Thu Tiền & Chi Tiết Trận)

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- **Hạ bậc "Tiền cầu"**: Loại bỏ hoàn toàn banner to đùng màu xanh gây lấn át thị giác và hiểu nhầm là nút bấm; thay bằng dòng text phụ trợ mờ nhẹ `= Tiền cầu: xxx đ` đặt ngay dưới 2 ô nhập cầu.
- **Nâng bật "Tổng tiền" và "Tiền mỗi người"**: Đưa vào card tổng kết trực quan trước nút submit, trong đó con số **Mỗi người** được hiển thị to và nổi bật nhất form (`text-xl font-bold text-lime-300`).

## 3. Các thay đổi chính
1. **`src/app/dashboard/debts/page.tsx`**:
   - Trong `FeeForm`: Bỏ banner `bg-lime-500/10` của Tiền cầu, thay bằng dòng chữ mờ `= Tiền cầu: ...`.
   - Nâng cấp phần tổng kết thành khối card rõ ràng, hiển thị số người chia và làm nổi bật số tiền mỗi người trả.
2. **`src/app/dashboard/matches/[matchId]/page.tsx`**:
   - Đồng bộ cấu trúc visual hierarchy tương tự cho form Chốt chi phí.
3. **`src/lib/i18n/translations.ts`**:
   - Bổ sung translation key `peopleCount: "{count} người"`.

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
