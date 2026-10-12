# Task: Cập Nhật Content Security Policy (CSP) Cho Vercel Speed Insights

## 1. Thông tin chung
- **Ngày hoàn thành**: 2026-10-12
- **Trạng thái**: PASS (Đã QA Audit & Verify)
- **Người thực hiện**: Developer Agent
- **Người nghiệm thu**: Gemini (BA + QA)

## 2. Mục tiêu
- Khắc phục lỗi cảnh báo đỏ trên console trình duyệt khi tải script phân tích hiệu năng của Vercel Speed Insights:
  - Cho phép domain tải script của Vercel (`https://va.vercel-scripts.com`) trong chỉ thị `script-src`.
  - Cho phép domain gửi dữ liệu telemetry/vitals của Vercel (`https://vitals.vercel-insights.com`, `https://va.vercel-scripts.com`) trong chỉ thị `connect-src`.

## 3. Các thay đổi chính
1. **`next.config.ts`**:
   - `script-src`: Thêm `https://va.vercel-scripts.com`.
   - `connect-src`: Thêm `https://vitals.vercel-insights.com https://va.vercel-scripts.com`.

## 4. Kết quả nghiệm thu (QA Verification)
- [x] ESLint (`npm run lint`): PASS
- [x] TypeScript Typecheck (`npx tsc --noEmit`): PASS
- [x] Next.js Production Build (`npm run build`): PASS
