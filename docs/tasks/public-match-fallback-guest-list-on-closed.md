# Task Documentation: TASK-39 - Hiển Thị Bảng Người Chơi & Chọn Xem VietQR Khi Trận Đấu Đã Chốt Sổ

## 1. Thông Tin Chung
- **Task ID**: TASK-39
- **Tên Task**: Public Match Fallback Guest List & QR Viewer On Closed Matches
- **Ngày hoàn thành**: 2026-10-13
- **Người thực hiện**: Developer Agent (OpenCode)
- **QA & Technical Auditor**: Gemini (BA + QA)
- **Trạng thái**: **PASS**

---

## 2. Bối Cảnh & Mục Tiêu

### Vấn đề:
- Khi người tham gia truy cập link trận đấu đã chốt sổ (`match.status === "closed"`), nếu họ bị mất danh tính trong `localStorage` (nguyên nhân rất thường gặp do mở qua In-App Browser của Zalo/Messenger, mở bằng Safari iPhone ở chế độ Tab Riêng Tư, hoặc do Host tự thêm tên hộ trên Dashboard), trang web trước đây chỉ hiển thị dòng thông báo đơn điệu: *"Trận đấu này đã kết thúc & đã chốt sổ"*.
- Người chơi không có cách nào xem được số tiền mình phải trả và không lấy được mã VietQR để thanh toán.

### Mục tiêu:
1. Thay vì chỉ hiển thị dòng thông báo trơ trọi, hệ thống hiển thị bảng **Danh sách tham gia & Thanh toán** gồm tất cả người chơi trong trận cùng trạng thái thanh toán (Đã thanh toán / Chưa thanh toán).
2. Cho phép người dùng bấm nút **"Đây là tôi (Xem QR)"** ngay tại dòng tên của mình để mở ra màn hình thanh toán VietQR cá nhân (đúng số tiền, STK Host, cú pháp `BSCHEL <mã_trận> <mã_người>`).
3. Tự động lưu lại danh tính này vào `localStorage` của trình duyệt hiện tại để những lần truy cập sau được nhận diện tự động.
4. Với người đã có danh tính sẵn, vẫn ưu tiên hiện ngay mã QR của họ, đồng thời bổ sung nút **"Đổi người khác / Xem danh sách"** để dễ dàng chuyển đổi hoặc thanh toán hộ bạn bè.

---

## 3. Chi Tiết Thay Đổi Code

### 3.1. `src/app/m/[matchId]/page.tsx`
- Bổ sung state `selectedGuestId` và `showListManual`.
- Xây dựng component `<ClosedMatchGuestList>`:
  - Duyệt danh sách người tham gia (`yesGuests`).
  - Hiển thị avatar chữ cái đầu (`InitialAvatar`), tên người chơi, badge "Đã xác nhận" (`confirmed`) hoặc "Chưa thanh toán" (`unpaid`).
  - Nút **"Đây là tôi (Xem QR)"**: Khi bấm, lập tức chọn người chơi, gọi `saveIdentity({ id: guest.guestId, name: guest.name })` và hiển thị `<GuestPayment>`.
- Trong component `<GuestPayment>`:
  - Bổ sung nút **"Đổi người khác / Xem danh sách"** (`onBackToList`), cho phép quay lại bảng danh sách bất cứ lúc nào.

### 3.2. `src/lib/i18n/translations.ts`
- Bổ sung các translation keys cho cả Tiếng Việt và Tiếng Anh:
  - `closedListTitle`: "Danh sách tham gia & Thanh toán"
  - `closedListSubtitle`: "Chọn tên của bạn để quét mã VietQR thanh toán"
  - `imThisPlayer`: "Đây là tôi (Xem QR)"
  - `switchPlayer`: "Đổi người khác / Xem danh sách"
  - `backToList`: "← Quay lại danh sách"

---

## 4. Kết Quả Kiểm Thử (Verification Gates)

| Gate | Lệnh Thực Thi | Kết Quả |
|------|---------------|---------|
| ESLint | `npm run lint` | **PASS** |
| TypeScript | `npx tsc --noEmit` | **PASS** |
| Next.js Build | `npm run build` | **PASS** |
