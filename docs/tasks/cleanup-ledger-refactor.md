# Task: Tinh gọn Codebase, Gỡ bỏ Friends & Web Push, Chuyển đổi Trang Công nợ thành "Sổ thu tiền" (Host Collection Ledger)

- **Task Name**: Cleanup & Ledger Refactor
- **Ngày hoàn thành**: 2026-10-09
- **Trạng thái QA**: **PASS** (100% Acceptance Criteria & Verification Gates)

---

## 1. Objective
Tái cấu trúc và tinh gọn codebase để phù hợp với mô hình mới (Host quản trị + Khách tương tác qua Magic Link):
1. Gỡ bỏ hoàn toàn phân hệ Bạn bè (`/dashboard/friends`, friend requests, friend logic).
2. Gỡ bỏ hoàn toàn hệ thống Web Push Notifications (`web-push`, API route push, `PushToggle`, VAPID env).
3. Đơn giản hóa `BottomNav.tsx` thành 3 tab cốt lõi: **Trang chủ**, **Sổ thu tiền**, **Tài khoản**.
4. Chuyển đổi trang `/dashboard/debts` thành **"Sổ thu tiền" (Host Collection Ledger)** giúp Host theo dõi tổng thu chi của từng trận đấu đã chốt, biết ai đã trả, ai chờ duyệt, ai chưa trả và hỗ trợ duyệt tiền nhanh.
5. Dọn dẹp form mời `username#tag` và popover kết bạn trong `MembersPanel.tsx`.

---

## 2. Scope & Thay đổi chi tiết
- **Đã xóa bỏ**:
  - `src/app/dashboard/friends/page.tsx`
  - `src/app/api/push/notify/route.ts`
  - `src/lib/push.ts`
  - `src/components/PushToggle.tsx`
  - `src/components/OnboardingPrompts.tsx`
- **Đã cập nhật**:
  - `package.json`: Gỡ bỏ `web-push`, `@types/web-push`.
  - `.env.example`: Bỏ các biến VAPID và Web Push secret.
  - `src/components/BottomNav.tsx`: Thu gọn còn 3 tab (`Home`, `Ledger`, `Profile`).
  - `src/app/dashboard/debts/page.tsx`: Viết lại giao diện Sổ thu tiền chuyên nghiệp cho Host (truy vấn `expenses`, `payments` và `match_guests`, tính toán tiến độ thu tiền, hỗ trợ duyệt thanh toán trực tiếp).
  - `src/app/dashboard/groups/[id]/MembersPanel.tsx`: Rút gọn code (từ 668 dòng xuống ~240 dòng), loại bỏ logic kết bạn và form mời bằng tag.
  - `src/app/dashboard/profile/page.tsx`: Gỡ bỏ component `<PushToggle />`.
  - `src/components/NotificationBell.tsx`: Chuyển hướng các thông báo friend về `/dashboard`.
  - `src/lib/i18n/translations.ts`: Bổ sung key `ledger`, dọn sạch các key cũ của `friends`, `push`, `onboard`.

---

## 3. Acceptance Criteria Audit

| STT | Tiêu chí (Acceptance Criteria) | Kết quả Audit | Ghi chú |
| :--- | :--- | :---: | :--- |
| **AC 1** | BottomNav hiển thị đúng 3 tab: Trang chủ, Sổ thu tiền, Tài khoản | **PASS** | `BottomNav.tsx` dùng `Home`, `ReceiptText` (nav.ledger), `User`. |
| **AC 2** | Gỡ bỏ sạch sẽ Friends & Push, không còn dead imports | **PASS** | Đã xóa 5 files/thư mục thừa, không còn tham chiếu gãy. |
| **AC 3** | Gỡ bỏ dependencies `web-push` và tinh gọn `.env.example` | **PASS** | `package.json` và `.env.example` đã được dọn sạch. |
| **AC 4** | Trang `/dashboard/debts` hoạt động như một Sổ thu tiền cho Host | **PASS** | Hiển thị danh sách trận đã chốt, tiến độ `{paid}/{total}`, số tiền đã thu và còn thiếu, lọc trạng thái. |
| **AC 5** | Host duyệt nhanh thanh toán trực tiếp trên Sổ thu tiền | **PASS** | Hỗ trợ nút duyệt `confirmPayer` gọi `confirm_guest_payment` hoặc `confirm_payment`. |
| **AC 6** | `MembersPanel.tsx` sạch sẽ, không còn form mời hay kết bạn | **PASS** | Giao diện thành viên nhóm gọn gàng, có hint chia sẻ link trận đấu. |
| **AC 7** | Quality Gates (Lint, Typecheck, Build) | **PASS** | 100% pass với 0 lỗi. |

---

## 4. Verification Gates
- `npx tsc --noEmit`: **PASS** (Exit code 0, không có lỗi TypeScript)
- `npm run lint`: **PASS** (Exit code 0, ESLint không có lỗi)
- `npm run build`: **PASS** (Next.js 16 App Router build thành công, 11 static/dynamic pages tối ưu)
