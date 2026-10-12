# Task Documentation: TASK-37 - Tự Động Chuyển Hướng Sang Sổ Thu Tiền & Mở Bung Trận Đấu Khi Chốt Chi Phí

## 1. Thông Tin Chung
- **Task ID**: TASK-37
- **Tên Task**: Auto-Redirect To Ledger & Auto-Expand On Match Fee Settle
- **Ngày hoàn thành**: 2026-10-12
- **Người thực hiện**: Developer Agent (OpenCode)
- **QA & Technical Auditor**: Gemini (BA + QA)
- **Trạng thái**: **PASS**

---

## 2. Bối Cảnh & Mục Tiêu

### Vấn đề trước đó:
- Khi Host bấm nút "Chốt chi phí" trên trang Chi tiết trận đấu (`/dashboard/matches/[matchId]`), sau khi hệ thống chạy xong RPC `settle_match`:
  - Trạng thái trang vẫn giữ nguyên ở màn hình Chi tiết trận đấu (chỉ hiển thị thông báo "Đã chốt chi phí").
  - Nếu Host quay lại màn hình Dashboard chính (`/dashboard`), trận đấu đó đã biến mất khỏi danh sách "Trận đấu sắp diễn ra" vì đã chuyển sang trạng thái `settled`.
  - Nếu Host muốn xem danh sách chia tiền, kiểm tra VietQR hoặc xác nhận ai đã trả tiền thì phải tự bấm sang tab "Sổ thu tiền" (`/dashboard/debts`) và cuộn tìm/bấm mở trận đấu đó thủ công. Trải nghiệm này bị gián đoạn và gây cảm giác hoang mang.

### Mục tiêu:
1. Khi Host bấm "Chốt chi phí" thành công, hệ thống tự động kích hoạt rung haptic phản hồi (`triggerHaptic("success")`) và lập tức điều hướng sang trang Sổ thu tiền (`/dashboard/debts?matchId=${matchId}`).
2. Trang Sổ thu tiền tiếp nhận query parameter `matchId` và tự động mở bung (auto-expand) accordion của đúng trận đấu đó. Host nhìn thấy ngay bảng danh sách từng người, số tiền phải thu và mã VietQR mà không cần thao tác thêm.

---

## 3. Chi Tiết Kỹ Thuật & Thay Đổi Code

### 3.1. Trang Chi Tiết Trận Đấu (`src/app/dashboard/matches/[matchId]/page.tsx`)
- Trong hàm `handleSettle`:
  - Sau khi `supabase.rpc("settle_match", ...)` thực thi thành công:
  - Kích hoạt tactile feedback: `triggerHaptic("success")`.
  - Gọi `router.push('/dashboard/debts?matchId=' + matchId)` để chuyển hướng thẳng tới Sổ thu tiền.

### 3.2. Trang Sổ Thu Tiền (`src/app/dashboard/debts/page.tsx`)
- Tách component thành `<LedgerPage>` (bọc trong `<Suspense fallback={<LedgerFallback />}>`) và `<LedgerContent>` để tuân thủ quy chuẩn Next.js App Router khi sử dụng hook `useSearchParams()`.
- Trích xuất tham số `searchParams?.get("matchId")` và truyền vào lazy initializer của state `expanded`:
  ```tsx
  const [expanded, setExpanded] = useState<string | null>(
    () => searchParams?.get("matchId") ?? null
  );
  ```
- Kết quả: Khi trang load, accordion của trận đấu vừa chốt được bung mở lập tức.

---

## 4. Kết Quả Kiểm Thử (Verification Gates)

| Gate | Lệnh Thực Thi | Kết Quả |
|------|---------------|---------|
| ESLint | `npm run lint` | **PASS** (0 warnings, 0 errors) |
| TypeScript | `npx tsc --noEmit` | **PASS** (Typecheck sạch 100%) |
| Next.js Build | `npm run build` | **PASS** (Build thành công, route `/dashboard/debts` được render tối ưu) |

---

## 5. Đánh Giá Trải Nghiệm Người Dùng (UX)
- Luồng thao tác mượt mà và trực quan: **Tạo trận -> Điểm danh -> Chốt tiền -> Tự động chuyển sang Sổ thu tiền & mở sẵn danh sách thu nợ**.
- Loại bỏ hoàn toàn sự lúng túng khi trận đấu biến mất khỏi dashboard.
