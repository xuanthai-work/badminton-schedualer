# Task: Tinh Gọn Form Chi Phí Sau Khi Chốt & Cảnh Báo Khi Sửa Chi Phí Đã Có Người Thanh Toán

## 1. Thông tin chung
- **Mã Task**: TASK-48
- **Ngày hoàn thành**: 2026-10-15
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA / Technical Auditor)

---

## 2. Mục tiêu
- **Ẩn và thu gọn form chi phí khi trận đấu đã chốt (`status === 'closed'`)**:
  - Không mở bung form nhập tiền cồng kềnh, trả lại diện tích tối đa cho danh sách người chơi và đối soát thanh toán.
  - Hiển thị bảng tóm tắt chi phí ngắn gọn, chuyên nghiệp.
- **Bổ sung nút [Chỉnh sửa chi phí] an toàn có xác nhận cảnh báo**:
  - Khi đã có người chơi (ngoài Host) thanh toán (`confirmed`): Bật hộp thoại cảnh báo:
    *"Đã có {count} người thanh toán theo mức giá cũ. Nếu sửa chi phí, bạn cần tự đối soát phần chênh lệch với họ. Bạn có chắc muốn tiếp tục?"*
  - Khi chưa có ai thanh toán: Cho phép mở form chỉnh sửa ngay lập tức (phòng trường hợp Host lỡ tay gõ nhầm số tiền).
  - Có nút [Hủy chỉnh sửa] để thu gọn lại nếu không muốn thay đổi nữa.
  - Tự động thu gọn form sau khi cập nhật thành công.
- Áp dụng đồng bộ ở cả trang **Chi tiết trận** và **Sổ thu tiền**.

---

## 3. Các thay đổi chính
1. **`src/lib/i18n/translations.ts`**:
   - Thêm translation keys: `common.continue`, `match.editCosts`, `match.cancelEditCosts`, `match.warnEditFeeTitle`, `match.warnEditFeeMsg` (hỗ trợ cả tiếng Việt và tiếng Anh).
2. **`src/app/dashboard/matches/[matchId]/page.tsx`**:
   - Tích hợp hook `useConfirm`.
   - Khi trận `closed`: Thay form mở toang bằng nút `[ Chỉnh sửa chi phí ]` nằm dưới bảng tóm tắt chi phí.
   - Kiểm tra `paidCount`: Nếu có người đã đóng tiền, bật popup cảnh báo trước khi mở form.
3. **`src/app/dashboard/debts/page.tsx`**:
   - Trong `FeeForm`: Mặc định hiển thị thanh tóm tắt chi phí (Tổng tiền & Tiền/người) kèm nút `[ Chỉnh sửa chi phí ]`.
   - Khi bấm sửa: Kiểm tra số người đã thanh toán và hiển thị modal cảnh báo nếu cần.
   - Thêm nút `[ Hủy chỉnh sửa ]` ở header của form.

---

## 4. Kết quả nghiệm thu (QA Verification Gates)
- [x] **TypeScript Check**: `npx tsc --noEmit` hoàn tất không có lỗi.
- [x] **Lint Check**: `npm run lint` đạt chuẩn 100%.
- [x] **Code Review**: Logic chặt chẽ, type-safe, UX mượt mà và an toàn cho Host.
