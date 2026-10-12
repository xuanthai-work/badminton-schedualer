# Task: Đồng Bộ Công Thức Tính Tiền Cầu Vào Form Chốt Chi Phí (Trang Chi Tiết Trận)

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- Đồng bộ hóa công thức tính tiền cầu ngầm `(Giá 1 ống / 12) × Số quả cầu` vào form Chốt chi phí tại trang Chi tiết trận đấu (`/dashboard/matches/[matchId]`).
- Tự động tính nhẩm realtime Tổng chi phí và Tiền mỗi người chia đều.
- Gửi số tiền cầu đã tính vào RPC `settle_match` khi Host bấm "Chốt và chia tiền".

## 3. Các thay đổi chính
1. **`src/app/dashboard/matches/[matchId]/page.tsx`**:
   - Thay thế ô nhập tiền cầu đơn lẻ bằng 2 ô: Giá 1 ống cầu (`tubePrice`) và Số quả cầu (`shuttleCount`).
   - Tự động tính ngầm `shuttleFeeCalculated = Math.round((tubePrice * 1000 / 12) * shuttleCount)`.
   - Hiển thị nhãn thành tiền cầu, tổng chi phí và tiền mỗi người trả realtime.
   - Hàm `handleSettle` gửi `shuttleFeeCalculated` vào RPC `settle_match`.

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
