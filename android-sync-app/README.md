# BSche Bank Sync (Android)

Ứng dụng Android native tự động bắt thông báo **biến động số dư Vietcombank**
(`com.VCB`), lọc các giao dịch có mã chuyển khoản BSche (`BS <match> <guest>`),
lưu vào hàng đợi offline (SQLite) và đồng bộ về webhook BSche
(`/api/webhook/bank-payment`) — tự retry khi có mạng trở lại.

---

## 1. Yêu cầu môi trường

- **JDK 17** (đã cấu hình `JAVA_HOME`).
- **Android Studio** (Ladybug trở lên) kèm Android SDK 34.
- Thiết bị Android thật (khuyến nghị) để thử Notification Listener.

Cấu hình Gradle trong project:

| Thành phần | Phiên bản |
| --- | --- |
| Android Gradle Plugin | 8.5.2 |
| Gradle | 8.7 |
| Kotlin | 1.9.24 |
| compileSdk / targetSdk | 34 |
| minSdk | 26 |

---

## 2. Mở project & build APK

### Cách A — Android Studio (khuyến nghị)

1. `File → Open` → chọn thư mục `android-sync-app/`.
2. Chờ **Gradle Sync** hoàn tất (Android Studio tự tải Gradle 8.7 và cài SDK nếu thiếu).
3. `Build → Build Bundle(s) / APK(s) → Build APK(s)`.
4. APK nằm ở:
   `android-sync-app/app/build/outputs/apk/debug/app-debug.apk`

### Cách B — Dòng lệnh (Gradle Wrapper)

> Repo chỉ chứa `gradle/wrapper/gradle-wrapper.properties` (không kèm file nhị phân
> `gradle-wrapper.jar`). Nếu máy bạn đã có Gradle, hãy sinh wrapper trước:

```bash
cd android-sync-app
gradle wrapper --gradle-version 8.7
./gradlew assembleDebug        # Windows: .\gradlew.bat assembleDebug
```

Nếu chưa có Gradle, dùng thẳng Android Studio (Cách A) là nhanh nhất.

---

## 3. Cài đặt & cấu hình

1. Cài APK lên thiết bị:
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```
2. Mở app **BSche Bank Sync**.
3. **Card "Trạng thái dịch vụ"** → bấm *Cấp quyền truy cập thông báo* → bật cho app.
4. **Card "Cấu hình Webhook"**:
   - **Webhook URL**: `http://<IP-máy-chạy-web>:3000/api/webhook/bank-payment`
     (dùng IP LAN, ví dụ `http://192.168.1.10:3000/...`; đừng dùng `localhost` vì đó là chính điện thoại).
   - **Webhook Secret**: đúng giá trị `BANK_WEBHOOK_SECRET` trong `.env` của web BSche.
   - Bấm **Lưu cấu hình**, sau đó **Kiểm tra kết nối** (server trả về `200/400/404` là đã tới nơi; `401` là sai secret).
5. **Card "Kiểm tra mô phỏng"** → *Bắn thông báo VCB giả lập* để chạy thử toàn bộ luồng mà chưa cần giao dịch thật.
6. **Card "Lịch sử giao dịch gần đây"**: badge **xanh = Đã gửi**, **vàng = Chờ mạng**, **hồng = Thất bại**.

> App bật `usesCleartextTraffic="true"` để test với `http://` LAN nội bộ. Production nên
> dùng HTTPS và tắt lại cờ này.

---

## 4. Bất tử trên Poco X3 Pro / MIUI 13

MIUI kill tiến trình nền rất mạnh, cần làm đủ 4 bước sau để app chạy ổn định:

1. **Cấp quyền truy cập thông báo**
   `Cài đặt → Ứng dụng → Quản lý ứng dụng → BSche Bank Sync → Thông báo → Truy cập thông báo` (bật).
   Hoặc làm trực tiếp từ nút trong app.
2. **Bật Tự khởi chạy (Autostart)**
   `Cài đặt → Ứng dụng → Quản lý ứng dụng → BSche Bank Sync → Tự khởi chạy` (bật).
3. **Tiết kiệm pin = Không hạn chế**
   `Cài đặt → Ứng dụng → Quản lý ứng dụng → BSche Bank Sync → Tiết kiệm pin → Không hạn chế`.
4. **Khóa app trong Đa nhiệm**
   Mở *Recent Apps* (gần đây), kéo app BSche Bank Sync xuống và bấm **🔒** để khóa.

Gợi ý thêm: `Cài đặt → PIN/Power → Khóa màn hình` → tắt tối ưu khi khóa cho Vietcombank và BSche Bank Sync.

---

## 5. Cách hoạt động

- `BankNotificationListenerService` nhận mọi notification, **chỉ xử lý** notification từ
  `com.VCB` có chứa `BS `.
- Trích xuất số tiền bằng regex `\+([0-9][0-9.,]*)\s*(VND|đ|₫)?`.
- Ghi giao dịch vào SQLite với trạng thái `PENDING` → gửi webhook → `SYNCED`.
- Nếu mất mạng, giao dịch giữ `PENDING`; `ConnectivityManager.NetworkCallback`
  kích hoạt retry ngay khi có mạng. `BootReceiver` flush hàng đợi PENDING sau khi khởi động lại máy.

---

## 6. Cấu trúc mã nguồn

```
android-sync-app/
├── settings.gradle.kts
├── build.gradle.kts
└── app/
    ├── build.gradle.kts
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/bsche/banksync/
        │   ├── MainActivity.kt
        │   ├── BankNotificationListenerService.kt
        │   ├── TransactionDbHelper.kt
        │   ├── WebhookSender.kt
        │   ├── BootReceiver.kt
        │   ├── TransactionAdapter.kt
        │   ├── Prefs.kt
        │   └── Transaction.kt
        └── res/…
```
