import React from 'react';
import Link from 'next/link';

export default function CungBanMuaNhaPage() {
  return (
    <div className="bg-cream py-5">
      <div className="container" style={{ maxWidth: '960px' }}>
        <div className="text-center mb-5">
          <span className="v2-kicker">Cẩm nang hướng dẫn</span>
          <h1 className="fw-bold text-emerald mt-2">HƯỚNG DẪN CÙNG BẠN MUA NHÀ</h1>
          <p className="text-muted fs-5 mx-auto" style={{ maxWidth: '700px' }}>
            Quy trình 5 bước nộp hồ sơ, thẩm định và sở hữu căn hộ thuộc dự án Nhà ở xã hội Marina Living Hạ Long.
          </p>
        </div>

        {/* Cấu trúc các bước dạng thẻ đứng */}
        <div className="row g-4 mb-5">
          {[
            {
              step: '01',
              title: 'Tự kiểm tra điều kiện',
              desc: 'Sử dụng công cụ trắc nghiệm trực tuyến để kiểm tra sơ bộ xem gia đình bạn có đủ điều kiện mua Nhà ở xã hội theo quy định Luật Nhà ở hay không.',
              linkText: 'Trắc nghiệm điều kiện ➜',
              linkHref: '/DieuKienMua'
            },
            {
              step: '02',
              title: 'Chuẩn bị hồ sơ pháp lý',
              desc: 'Tải và khai các biểu mẫu bắt buộc: Mẫu số 01 (Đơn đăng ký), Mẫu số 02 (Xác nhận thực trạng nhà ở), Giấy tờ cư trú, CCCD và chứng minh thu nhập thấp.',
              linkText: 'Tải biểu mẫu PDF',
              linkHref: '#'
            },
            {
              step: '03',
              title: 'Đăng ký và Nộp trực tuyến',
              desc: 'Tạo tài khoản Cổng thông tin cư dân, điền thông tin đối tượng và upload các bản quét (scan/ảnh chụp) giấy tờ để bộ phận tư vấn thẩm định trước.',
              linkText: 'Đăng ký tài khoản ngay',
              linkHref: '?auth=register'
            },
            {
              step: '04',
              title: 'Thẩm định hồ sơ gốc',
              desc: 'Sau khi hồ sơ trực tuyến được duyệt, khách hàng mang bộ hồ sơ giấy bản gốc đến văn phòng tư vấn tại Hạ Long Marine Plaza để đối chiếu và niêm yết công khai.',
              linkText: 'Xem địa điểm văn phòng',
              linkHref: '#office'
            },
            {
              step: '05',
              title: 'Ký HĐMB & Nhận bàn giao',
              desc: 'Thực hiện bốc thăm quyền mua/chọn căn (nếu có), ký hợp đồng mua bán với BIM Land và đóng tiền theo tiến độ xây dựng cho đến khi nhận bàn giao căn hộ.',
              linkText: 'Xem bảng hàng căn hộ',
              linkHref: '/#matbang'
            }
          ].map((item, idx) => (
            <div className="col-md-6 col-lg-4" key={idx}>
              <div className="card h-100 border border-success border-opacity-10 shadow-sm lift" style={{ borderRadius: '16px' }}>
                <div className="card-body p-4 d-flex flex-column justify-content-between">
                  <div>
                    <span className="badge bg-emerald fs-6 rounded-3 px-3 py-2 mb-3">Bước {item.step}</span>
                    <h4 className="fw-bold text-emerald mb-2">{item.title}</h4>
                    <p className="text-muted small lh-base">{item.desc}</p>
                  </div>
                  {item.linkText && (
                    <div className="mt-3 border-top pt-2">
                      <Link href={item.linkHref} className="text-gold fw-bold small text-decoration-none hover-underline">
                        {item.linkText}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Địa chỉ văn phòng tư vấn */}
        <div id="office" className="p-4 bg-white rounded-4 shadow-sm border border-success border-opacity-10">
          <h3 className="fw-bold text-emerald mb-3">📍 Địa Điểm Văn Phòng Tư Vấn Nhà Ở Xã Hội</h3>
          <div className="row gy-3">
            <div className="col-md-6 border-end border-success border-opacity-10 pr-md-4">
              <h5 className="fw-bold text-dark">Văn phòng tư vấn Marina Living Halong</h5>
              <p className="text-muted small">
                Nằm tại khu trung tâm thương mại Halong Marine Plaza, Bãi Cháy. Đây là nơi tiếp nhận trực tiếp các bộ hồ sơ giấy của cư dân, thực hiện giải đáp các thắc mắc chuyên sâu và niêm yết danh sách người được mua công khai.
              </p>
              <p className="mb-1">📍 <strong>Hạ Long Marine Plaza, phường Bãi Cháy, TP. Hạ Long, Quảng Ninh.</strong></p>
              <p>📞 Hotline: <strong>1900 6666 (Nhánh số 3)</strong></p>
            </div>
            <div className="col-md-6 pl-md-4">
              <h5 className="fw-bold text-dark">Thời gian làm việc</h5>
              <ul className="text-muted small">
                <li>Thứ Hai - Thứ Sáu: Sáng 08:00 - 12:00, Chiều 13:30 - 17:30</li>
                <li>Thứ Bảy: Sáng 08:00 - 12:00 (Chiều Thứ Bảy & Chủ Nhật nghỉ)</li>
              </ul>
              <div className="alert alert-success py-2 mt-3 fs-7 border-0 bg-success bg-opacity-10 text-emerald fw-semibold">
                🔔 Khách hàng vui lòng đặt lịch hẹn trước khi đến văn phòng để được tư vấn chu đáo nhất.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
