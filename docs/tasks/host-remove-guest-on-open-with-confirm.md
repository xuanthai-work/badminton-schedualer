# Task Documentation: TASK-51 - Chuyển Quyền Xóa Người Chơi Sang Trận Đấu Mở (Kèm Popup Xác Nhận) & Ẩn Xóa Khi Đã Chốt Sổ

## 1. Thông Tin Chung
- **Task ID**: TASK-51
- **Tên Task**: Allow Host to Remove Participants on Open Match with Confirmation Popup and Hide Delete on Closed Match
- **Ngày hoàn thành**: 2026-10-21
- **Người thực hiện**: Developer Agent (OpenCode) + Gemini (QA & Auditor)
- **QA & Technical Auditor**: Gemini (BA + QA)
- **Trạng thái**: **PASS**

---

## 2. Bối Cảnh & Vấn Đề

### Bối cảnh:
- Trước đây (tại TASK-49), hệ thống đã ẩn nút xóa người tham gia khi trận đấu đang mở (`open`) và chỉ cho phép xóa khi đã chốt sổ (`closed`).
- Tuy nhiên trong quá trình vận hành thực tế:
  - Khi trận đấu đã **chốt sổ (`closed`)**: Chi phí sân, cầu, nước đã được chốt và chia đều cho những người tham dự. Nếu lúc này xóa người chơi thì việc tính toán chi phí sẽ bị xáo trộn, gây nhập nhằng tiền nong.
  - Khi trận đấu còn **đang mở (`open`)**: Người chơi có thể bận đột xuất hoặc Host thêm nhầm danh sách, Host cần có quyền xóa người đó ra khỏi danh sách điểm danh trước giờ chốt sổ.

### Yêu cầu:
1. Đảo ngược logic: Cho phép Host xóa người tham gia khi trận đấu còn đang mở (`status === "open"`).
2. Khi Host bấm nút thùng rác: Phải hiển thị modal popup xác nhận ("Bạn có chắc muốn xóa [Tên] khỏi buổi đánh này?"), chỉ khi bấm Xác nhận mới thực hiện xóa.
3. Ẩn hoàn toàn nút thùng rác xóa người tham gia khi trận đấu đã chốt tiền (`status === "closed"`).

---

## 3. Chi Tiết Kỹ Thuật

### File tác động:
- `src/app/dashboard/matches/[matchId]/page.tsx`

### Nội dung thay đổi:
1. Tại component `ParticipantList`:
   - Cập nhật điều kiện render nút thùng rác `Trash2`:
     ```tsx
     {isHost && status === "open" && (
       <button
         type="button"
         aria-label={t("match.removeGuestTitle")}
         onClick={() => onRequestDelete(g)}
         className="rounded-lg p-1.5 text-slate-400 transition hover:text-rose-400 active:scale-95"
       >
         <Trash2 size={15} strokeWidth={2} />
       </button>
     )}
     ```
2. Modal xác nhận xóa (`guestToDelete`):
   - Kích hoạt khi `onRequestDelete(g)` được gọi.
   - Hiển thị dialog modal với tên người cần xóa, nút Xóa màu đỏ và nút Hủy.
   - Khi xác nhận, gọi RPC `host_remove_guest` xóa thành công và tải lại dữ liệu tức thì.

---

## 4. Kết Quả Kiểm Thử (Verification Gates)

| Verification Gate | Lệnh thực thi | Kết quả | Ghi chú |
|---|---|---|---|
| **ESLint** | `npm run lint` | **PASS** | 0 warnings, 0 errors |
| **Typecheck** | `npx tsc --noEmit` | **PASS** | TypeScript 5.x passed cleanly |
| **Next.js Build** | `npm run build` | **PASS** | Compiled production build thành công 12 static & dynamic routes |

---

## 5. Kết Luận
Task hoàn thành chính xác 100% yêu cầu: Host có thể xóa người tham gia khi trận đấu đang mở (có modal popup xác nhận chống bấm nhầm) và không còn nút xóa khi trận đấu đã chốt tiền.
