# TASK-56: Tối Ưu Dòng Chi Phí Dưới Cùng Trong Sổ Thu Tiền (Chỉ Hiển Thị Tiền Mỗi Người Trả)

## 1. Thông Tin Chung
- **Task ID**: TASK-56
- **Tên Task**: Tối ưu dòng chi phí dưới cùng trong Sổ thu tiền (chỉ hiển thị tiền mỗi người trả)
- **Ngày hoàn thành**: 2026-10-26
- **Trạng thái QA**: **PASS**

---

## 2. Bối Cảnh & Vấn Đề
- Trên thẻ thông tin trận đấu ở trang Sổ thu tiền (`debts/page.tsx`), header đã luôn hiển thị sẵn **Tổng chi phí** và **Đã thu**.
- Tuy nhiên, ở dòng chi phí dưới cùng khi mở dropdown, hệ thống hiển thị chuỗi dài:
  `Chi phí: 1.074.000 đ (Mỗi người trả 134.250 đ)`
- Điều này vừa làm lặp lại tổng tiền, vừa khiến chuỗi bị dài và bị cắt cụt thành `(M...` trên màn hình di động/hẹp, làm mất thông tin quan trọng nhất là số tiền mỗi người phải đóng.

---

## 3. Giải Pháp Triển Khai
1. **Tinh gọn thông tin**:
   - Loại bỏ phần hiển thị tổng tiền bị trùng lặp `{t("match.expenses")}: {formatVnd(match.totalAmount)}`.
   - Thay thế bằng thông tin tập trung vào số tiền mỗi người:
     ```tsx
     <span className="truncate">
       {t("ledger.perPerson")}:{" "}
       <strong className="font-semibold text-lime-300">
         {formatVnd(match.feePerPerson)}
       </strong>
     </span>
     ```
2. **Trực quan & Nổi bật**:
   - Số tiền mỗi người được định dạng màu xanh `text-lime-300` nổi bật, giúp Host nhận diện ngay số tiền cần thu.
   - Chuỗi ngắn gọn, hiển thị trọn vẹn 100%, không còn bị cắt chữ `(M...`.
   - Giữ nguyên nút `Chỉnh sửa chi phí` bên cạnh.

---

## 4. Danh Sách Files Thay Đổi
- [`src/app/dashboard/debts/page.tsx`](file:///D:/work/Stuff/badminton-schedualer/src/app/dashboard/debts/page.tsx): Cập nhật component `FeeForm` dòng dưới cùng để hiển thị tiền mỗi người.

---

## 5. Kết Quả Kiểm Thử (Verification Gates)
- [x] **Lint**: `npm run lint` -> **PASS**
- [x] **Typecheck**: `npx tsc --noEmit` -> **PASS**
- [x] **Build**: `npm run build` -> **PASS**
