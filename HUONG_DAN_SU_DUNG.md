# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG CỔNG THÔNG TIN & QUẢN LÝ HỒ SƠ NHÀ Ở XÃ HỘI MARINA LIVING

Dự án **Marina Living** (Hapro) - Hệ thống Quản lý Hồ sơ, Duyệt hồ sơ & Bốc thăm Căn hộ Nhà ở Xã hội (NOXH).

---

## 📋 MỤC LỤC
1. [Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
2. [Yêu cầu hệ thống & Hướng dẫn cài đặt](#2-yêu-cầu-hệ-thống--hướng-dẫn-cài-đặt)
3. [Danh sách tài khoản Demo & Phân quyền](#3-danh-sách-tài-khoản-demo--phân-quyền)
4. [Hướng dẫn dành cho Khách hàng / Người nộp hồ sơ](#4-hướng-dẫn-dành-cho-khách-hàng--người-nộp-hồ-sơ)
   - [4.1 Đăng ký & Đăng nhập](#41-đăng-ký--đăng-nhập)
   - [4.2 Tự động nhập liệu qua quét mã QR CCCD](#42-tự-động-nhập-liệu-qua-quét-mã-qr-cccd)
   - [4.3 Hoàn thiện hồ sơ theo quy định (Mẫu 01, 03, 04, 05, 07)](#43-hoàn-thiện-hồ-sơ-theo-quy-định-mẫu-01-03-04-05-07)
   - [4.4 Nộp & Theo dõi tiến trình xét duyệt hồ sơ](#44-nộp--theo-dõi-tiến-trình-xét-duyệt-hồ-sơ)
   - [4.5 Tham gia Bốc thăm & Chọn vị trí căn hộ](#45-tham-gia-bốc-thăm--chọn-vị-trí-căn-hộ)
5. [Hướng dẫn dành cho Cán bộ & Quản trị viên (Admin Portal)](#5-hướng-dẫn-dành-cho-cán-bộ--quản-trị-viên-admin-portal)
   - [5.1 Quy trình xét duyệt hồ sơ 4 bước](#51-quy-trình-xét-duyệt-hồ-sơ-4-bước)
   - [5.2 Quản lý Bảng hàng Căn hộ (Units Management)](#52-quản-lý-bảng-hàng-căn-hộ-units-management)
   - [5.3 Cấu hình Hạn đếm ngược nộp hồ sơ (Countdown Deadline)](#53-cấu-hình-hạn-đếm-ngược-nộp-hồ-sơ-countdown-deadline)
   - [5.4 Điều hành & Giám sát phiên bốc thăm](#54-điều-hành--giám-sát-phiên-bốc-thăm)
6. [Cấu trúc tệp tin & Cơ sở dữ liệu](#6-cấu-trúc-tệp-tin--cơ-sở-dữ-liệu)
7. [Câu hỏi thường gặp & Xử lý sự cố (FAQ & Troubleshooting)](#7-câu-hỏi-thường-gặp--xử-lý-sự-cố-faq--troubleshooting)

---

## 1. GIỚI THIỆU TỔNG QUAN

Hệ thống **Cổng thông tin & Quản lý Hồ sơ Nhà ở Xã hội Marina Living** hỗ trợ toàn bộ vòng đời đăng ký mua nhà ở xã hội theo Luật Nhà ở mới nhất:
- **Trang chủ (`/`)**: Cung cấp thông tin dự án, quy chế bốc thăm, điều kiện mua NOXH, tra cứu cẩm nang & bảng hàng trực tuyến.
- **Portal Cá nhân (`/portal`)**: Nơi khách hàng nộp hồ sơ, khai báo thông tin tự động qua CCCD, cập nhật bổ sung giấy tờ và tham gia bốc thăm chọn căn hộ.
- **Trang Quản trị (`/admin`)**: Nơi cán bộ thụ lý (Tổ tiếp nhận, Tổ kiểm soát, Tiếp nhận bản gốc, Lưu trữ) và Admin quản lý tập trung toàn bộ danh sách hồ sơ, duyệt hồ sơ, vận hành bảng hàng căn hộ và đếm ngược thời hạn.

---

## 2. YÊU CẦU HỆ THỐNG & HƯỚNG DẪN CÀI ĐẶT

### Yêu cầu môi trường:
- **Node.js**: Phiên bản `>= 18.x` (khuyên dùng `Node.js 20+`).
- **Trình duyệt**: Google Chrome, Microsoft Edge, Mozilla Firefox hoặc Safari bản mới nhất.

### Các bước cài đặt & khởi chạy:

1. **Cài đặt thư viện dependencies:**
   ```bash
   npm install
   ```

2. **Chạy hệ thống ở chế độ phát triển (Development):**
   ```bash
   npm run dev
   ```
   Truy cập ứng dụng tại: `http://localhost:3000`

3. **Biên dịch cho sản xuất (Production Build):**
   ```bash
   npm run build
   npm run start
   ```

---

## 3. DANH SÁCH TÀI KHOẢN DEMO & PHÂN QUỀN

Hệ thống được thiết lập sẵn các tài khoản thử nghiệm trong `db.json`:

| Vai trò (Role) | Họ và tên | Số điện thoại / Đăng nhập | Mật khẩu | Chức năng chính |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Quản trị viên Hapro | `0999999999` hoặc `admin@hapro.vn` | `123456` (hoặc `admin123`) | Toàn quyền cấu hình hệ thống, duyệt hồ sơ, quản lý bảng hàng & đặt hạn nộp |
| **Tổ tiếp nhận** | Nguyễn Văn Tùng | `0911111111` hoặc `tung.nv@hapro.vn` | `123456` (hoặc `intake123`) | Kiểm tra tính đầy đủ ban đầu của hồ sơ online |
| **Tổ kiểm soát** | Lê Hoàng Nam | `0922222222` hoặc `nam.lh@hapro.vn` | `123456` (hoặc `control123`) | Thẩm định chi tiết tính hợp lệ & pháp lý của các mẫu đơn |
| **Tiếp nhận bản gốc**| Trần Thị Mai | `0933333333` hoặc `mai.tt@hapro.vn` | `123456` (hoặc `hardcopy123`)| Thống kê & xác nhận đối chiếu hồ sơ giấy bản gốc |
| **Bộ phận lưu trữ** | Phạm Quốc Bảo | `0944444444` hoặc `bao.pq@hapro.vn` | `123456` (hoặc `archive123`) | Phê duyệt lưu trữ cuối cùng, đủ điều kiện vào danh sách bốc thăm |
| **Người dân / Khách**| Đăng ký mới | Đăng ký qua nút **Đăng ký** trên trang chủ | Mật khẩu tùy chọn | Nộp hồ sơ, khai báo CCCD, chọn căn hộ |

---

## 4. HƯỚNG DẪN DÀNH CHO KHÁCH HÀNG / NGƯỜI NỘP HỒ SƠ

### 4.1 Đăng ký & Đăng nhập
1. Mở trang chủ `http://localhost:3000`.
2. Bấm nút **Đăng nhập / Đăng ký** trên thanh điều hướng (Navbar).
3. Nhập **Số điện thoại/Email/CCCD** và **Mật khẩu**. Nếu chưa có tài khoản, chọn tab **Đăng ký** để khởi tạo tài khoản mới.
4. Sau khi đăng nhập thành công, hệ thống tự động chuyển sang trang **Portal Cá Nhân (`/portal`)**.

### 4.2 Tự động nhập liệu qua quét mã QR CCCD
1. Tại trang Portal cá nhân, bấm **Tạo hồ sơ mới** hoặc **Sửa hồ sơ**.
2. Tìm tính năng **Quét mã QR trên CCCD**.
3. Tải lên ảnh chụp mã QR trên CCCD gắn chip (hoặc camera quét trực tiếp).
4. Hệ thống sẽ tự động trích xuất các thông tin: *Số CCCD, Họ tên, Ngày sinh, Giới tính, Địa chỉ thường trú, Ngày cấp...* điền vào Form mà không cần nhập tay.

### 4.3 Hoàn thiện hồ sơ theo quy định (Mẫu 01, 03, 04, 05, 07)
Người đăng ký hoàn thiện các mẫu đơn theo đúng quy định NOXH hiện hành:
- **Mẫu 01**: Đơn đăng ký mua/thuê nhà ở xã hội.
- **Mẫu 03**: Giấy xác nhận đối tượng & điều kiện nhà ở.
- **Mẫu 04 / Mẫu 05**: Xác nhận điều kiện thu nhập cá nhân/hộ gia đình.
- **Mẫu 07**: Giấy tự kê khai thu nhập.
- **Đính kèm tài liệu**: Tải lên các file ảnh/PDF chứng minh (CCCD, Đăng ký kết hôn, Giấy xác nhận cư trú, Bảng lương...).

### 4.4 Nộp & Theo dõi tiến trình xét duyệt hồ sơ
- Sau khi kiểm tra lại toàn bộ thông tin, chọn **Gửi nộp hồ sơ**.
- Theo dõi trạng thái trên Portal:
  - 🟡 **Chờ tiếp nhận**: Hồ sơ đã được gửi thành công, đang đợi Cán bộ tiếp nhận kiểm tra.
  - 🔵 **Đang kiểm soát / Thẩm định**: Hồ sơ đang được thẩm định pháp lý.
  - 🟠 **Yêu cầu bổ sung**: Cán bộ đã phản hồi lý do cần chỉnh sửa (vui lòng xem ghi chú và tải lại giấy tờ đúng yêu cầu).
  - 🟢 **Đã duyệt / Đủ điều kiện**: Hồ sơ hoàn toàn hợp lệ và đủ điều kiện tham gia bốc thăm.
  - 🔴 **Từ chối**: Hồ sơ không đáp ứng tiêu chuẩn mua NOXH.

### 4.5 Tham gia Bốc thăm & Chọn vị trí căn hộ
1. Khi đợt bốc thăm mở, giao diện **Bốc thăm chọn căn** sẽ hiển thị trong Portal.
2. Khách hàng tham gia các bước bốc thăm:
   - **Bước 1**: Bốc thăm lượt / quyền ưu tiên.
   - **Bước 2**: Bốc thăm chọn vị trí căn hộ theo danh sách căn còn trống trên bảng hàng trực tuyến.
3. Nhấn **Xác nhận giữ căn** sau khi chọn căn hộ thành công.

---

## 5. HƯỚNG DẪN DÀNH CHO CÁN BỘ & QUẢN TRỊ VIÊN (ADMIN PORTAL)

Truy cập trang Quản trị tại địa chỉ: `http://localhost:3000/admin` (yêu cầu đăng nhập bằng tài khoản Admin hoặc Cán bộ).

### 5.1 Quy trình xét duyệt hồ sơ 4 bước
Giao diện quản trị hiển thị danh sách hồ sơ được phân loại theo bộ lọc trạng thái và quy trình 4 bước:

```
[1. Tổ Tiếp Nhận] ➔ [2. Tổ Kiểm Soát] ➔ [3. Tiếp Nhận Bản Gốc] ➔ [4. Lưu Trữ / Chốt]
```

1. **Bước 1 - Tổ tiếp nhận**: Xem qua hồ sơ online, kiểm tra ảnh chụp CCCD & giấy tờ cơ bản. Đánh dấu *Chấp nhận* hoặc *Yêu cầu nộp lại*.
2. **Bước 2 - Tổ kiểm soát**: Rà soát kỹ các điều kiện thu nhập (Mẫu 04/05/07) và điều kiện nhà ở (Mẫu 03).
3. **Bước 3 - Tiếp nhận bản gốc**: Đóng dấu xác nhận khi người dân mang hồ sơ giấy bản gốc đến đối chiếu tại văn phòng.
4. **Bước 4 - Lưu trữ & Phê duyệt cuối**: Duyệt chính thức hồ sơ đủ điều kiện vào danh sách bốc thăm.

### 5.2 Quản lý Bảng hàng Căn hộ (Units Management)
- Xem sơ đồ bảng hàng căn hộ Marina Living theo từng tầng, từng tòa và loại căn hộ.
- Cập nhật trạng thái căn hộ: `Còn trống`, `Đã giữ chỗ`, `Đã chọn/Đã bán`, `Tạm khóa`.
- Thêm mới, chỉnh sửa diện tích, thông số, giá bán căn hộ.

### 5.3 Cấu hình Hạn đếm ngược nộp hồ sơ (Countdown Deadline)
- Trên giao diện Admin, Cán bộ có thể thiết lập ngày giờ kết thúc nhận hồ sơ (ví dụ: `2026-08-20 17:00`).
- Đếm ngược thời gian sẽ hiển thị tự động trên Trang chủ và Portal cá nhân của toàn bộ khách hàng.

### 5.4 Điều hành & Giám sát phiên bốc thăm
- Xem danh sách người tham gia đã được duyệt đủ điều kiện.
- Kích hoạt phiên bốc thăm, công khai kết quả bốc thăm quyền mua và bốc thăm căn hộ theo thời gian thực (Real-time update).
- Tải về hoặc xuất báo cáo danh sách trúng bốc thăm.

---

## 6. CẤU TRÚC TỆP TIN & CƠ SỞ DỮ LIỆU

- `db.json`: Tệp lưu trữ dữ liệu JSON (chứa danh sách `users`, `applications`, `units`, `settings`).
- `src/lib/db.js`: Thư viện thao tác đọc/ghi dữ liệu vào `db.json`.
- `src/lib/auth.js`: Quản lý phiên làm việc (Session authentication cookie/token).
- `src/lib/cccdQr.js`: Thư viện xử lý & trích xuất dữ liệu từ mã QR CCCD.
- `src/app/portal/PortalClient.js`: Giao diện & logic Portal khách hàng.
- `src/app/admin/AdminClient.js`: Giao diện & logic Trang quản trị.
- `src/app/DieuKienMua/page.js`: Trang hướng dẫn chi tiết điều kiện mua nhà ở xã hội.
- `src/app/QuyCheBocTham/page.js`: Quy chế bốc thăm quyền ưu tiên & vị trí căn hộ.

---

## 7. CÂU HỎI THƯỜNG GẶP & XỬ LÝ SỰ CỐ (FAQ & TROUBLESHOOTING)

### ❓ 1. Tôi không đăng nhập được tài khoản Admin?
- **Nguyên nhân**: Số điện thoại hoặc mật khẩu chưa đúng.
- **Khắc phục**: Sử dụng SĐT `0999999999` với mật khẩu `123456` (hoặc `admin123`).

### ❓ 2. Quét QR trên CCCD không nhận diện được thông tin?
- **Nguyên nhân**: Ảnh quét bị mờ, lóa sáng hoặc mã QR bị gập/rách.
- **Khắc phục**: Chụp ảnh mã QR vuông góc, rõ nét, đủ ánh sáng hoặc nhập tay thông tin theo từng ô tương ứng.

### ❓ 3. Dữ liệu trên hệ thống bị mất khi khởi động lại server?
- **Nguyên nhân**: Dữ liệu lưu trữ chính tại file `db.json`.
- **Khắc phục**: Kiểm tra quyền ghi file của thư mục dự án và đảm bảo file `db.json` không bị ghi đè bởi bản lưu cũ.

---
*Bản quyền thuộc về Dự án Nhà ở Xã hội Marina Living (Hapro).*
