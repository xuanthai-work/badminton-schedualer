# TASK-64: Tối Ưu Hiển Thị Bill Đặt Sân, Sửa Lỗi Thoát Lightbox, Tinh Gọn BottomNav & Fix Che Chữ Status Bar PWA (iOS / iPhone)

## 1. Thông Tin Chung
- **Task ID**: TASK-64
- **Ngày hoàn thành**: 2026-10-31
- **Trạng thái QA**: **PASS**
- **Phạm vi tác động**:
  - `src/app/globals.css`
  - `src/components/BottomNav.tsx`
  - `src/app/dashboard/matches/[matchId]/page.tsx`
  - `src/app/m/[matchId]/page.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/app/dashboard/debts/page.tsx`
  - `src/app/dashboard/profile/page.tsx`
  - `src/app/dashboard/venues/page.tsx`

---

## 2. Bối Cảnh & Vấn Đề
Dựa trên phản hồi thực tế từ iPhone 15 Pro chạy PWA:
1. **Lỗi không thể thoát ra sau khi bấm xem ảnh bill**:
   - Ảnh bill (Alobo) tỉ lệ dọc 9:19.5 chiếm toàn bộ màn hình. Nút Đóng (`X`) nằm ở `top-4 right-4` (cách đỉnh màn hình 16px), bị lọt hoàn toàn ra sau thanh trạng thái hệ thống iOS (ngay vị trí pin `56%` và sóng Wi-Fi).
   - Container ảnh bên dưới chặn sự kiện chạm (`stopPropagation`), khiến người dùng bị kẹt hoàn toàn trong Lightbox mà không có cách nào thoát ra.
2. **Ảnh bill xem trước (thumbnail) bị khó nhìn**:
   - Khung xem trước đặt `h-44` nhưng dùng `objectFit: "cover"`, cắt mất toàn bộ phần đầu và phần đuôi hóa đơn, chỉ thấy mảng màu xanh ở giữa.
3. **Thanh Navigator Bar bên dưới bị quá cao và thừa khoảng đen lớn**:
   - `BottomNav` cộng dồn `pb-[calc(0.5rem+env(safe-area-inset-bottom))]` (8px + 34px) làm thanh bar đội lên gần 95px, để lại khoảng đen thừa rất lớn phía dưới chữ *"Trang chủ"*.
4. **Phần trên bị mờ mờ và che mất chữ khi cuộn**:
   - Khối `fixed -top-32 right-[-80px] blur-3xl` tạo màng sương mờ đục đè trực tiếp lên chữ tiêu đề *"DASHBOARD"*.
   - PWA dùng `statusBarStyle: "black-translucent"` khiến chữ khi cuộn trượt thẳng vào Dynamic Island và đồng hồ `21:21`, gây tình trạng chữ chồng chữ, nhòe nhoẹt.

---

## 3. Chi Tiết Triển Khai
1. **Sửa Triệt Để Lỗi Thoát Modal Lightbox (Host & Guest)**:
   - **Header Top Bar an toàn**: Tách riêng top bar có `pt-[max(0.75rem,env(safe-area-inset-top))] px-4 pb-3 flex items-center justify-between z-50`. Nút Đóng nằm hoàn toàn bên dưới Dynamic Island/Status Bar, touch target rộng rãi với nền tối tương phản cao.
   - **Nút Đóng ở cạnh dưới**: Bổ sung nút *"Đóng"* tại vùng an toàn đáy `pb-[max(1rem,env(safe-area-inset-bottom))]`, hỗ trợ thao tác một tay với ngón cái dễ dàng.
   - **Thoát đa dạng**: Bấm vào vùng đen (backdrop) bên ngoài ảnh để đóng, hoặc nhấn phím `Escape` trên bàn phím.
   - **Scroll lock**: Tự động khóa cuộn trang nền (`document.body.style.overflow = "hidden"`) khi mở lightbox.
2. **Hiển Thị Thumbnail Ảnh Bill Sắc Nét & Trọn Vẹn**:
   - Chuyển `objectFit: "cover"` sang `objectFit: "contain"` nằm trong container `bg-slate-950/80` có bo viền chuẩn.
   - Giữ nguyên tỉ lệ ảnh dọc của bill Alobo, nhìn thấy rõ ràng mã lịch, người đặt và tiền sân.
   - Áp dụng đồng bộ cho cả trang chi tiết Host (`/dashboard/matches/[matchId]`) và trang khách (`/m/[matchId]`).
3. **Tinh Gọn BottomNav**:
   - Điều chỉnh sang `pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]`, tinh chỉnh padding nút `px-3 py-1` và `leading-none`.
   - Giảm chiều cao thanh điều hướng về chuẩn Native iOS Tab Bar (~70-75px), loại bỏ hoàn toàn khoảng đen thừa.
4. **Xử Lý Status Bar & Ambient Blur**:
   - Thêm lớp bảo vệ thanh trạng thái `body::before` trong `src/app/globals.css` với `height: env(safe-area-inset-top)`, nền `rgba(2, 6, 23, 0.9)` và `backdrop-filter: blur(12px)`. Khi cuộn trang, nội dung không bị Dynamic Island và đồng hồ đè lên chữ.
   - Đổi đốm sáng trang trí từ `fixed` sang `absolute -top-40 right-[-120px] bg-lime-500/[0.07]`, loại bỏ màng sương mờ đè lên chữ tiêu đề.

---

## 4. Kết Quả Nghiệm Thu (Acceptance Criteria)
- [x] **Thoát Lightbox Xem Bill**:
  - Nút Đóng nằm hoàn toàn bên dưới Dynamic Island / Status Bar trên iPhone 15 Pro, hiển thị sắc nét và bấm thoát nhạy.
  - Có nút Đóng ở dưới đáy màn hình tiện thao tác 1 tay.
  - Bấm vào nền mờ hoặc nhấn phím `Escape` đều thoát modal mượt mà.
  - Body không bị cuộn ngầm khi lightbox đang mở.
- [x] **Hiển Thị Thumbnail Ảnh Bill**:
  - Ảnh bill hiển thị trọn vẹn tỉ lệ chuẩn `object-contain`, không bị crop cắt mất thông tin quan trọng.
  - Áp dụng đồng bộ cho cả trang chi tiết Host (`/dashboard/matches/[matchId]`) và trang người chơi (`/m/[matchId]`).
- [x] **BottomNav Gọn Gàng**:
  - Không còn khoảng đen thừa lớn ở bên dưới icon.
  - Chiều cao tab bar đạt chuẩn Native iOS (~70-75px), icon và label cân đối.
- [x] **Đỉnh Màn Hình PWA Sạch Sẽ**:
  - Không còn vệt sương mờ đè lên chữ tiêu đề.
  - Khi cuộn trang, nội dung hiển thị rõ ràng, không bị Dynamic Island hay đồng hồ đè lên mất chữ.
- [x] **Đã Vượt Qua Toàn Bộ Verification Gates**:
  - Lint: `npm run lint` -> **PASS**
  - Typecheck: `npx tsc --noEmit` -> **PASS**
  - Build: `npm run build` -> **PASS**
