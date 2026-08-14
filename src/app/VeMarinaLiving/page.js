import React from 'react';
import Link from 'next/link';

export default function VeMarinaLivingPage() {
  return (
    <div className="bg-cream py-5">
      <div className="container" style={{ maxWidth: '960px' }}>
        <div className="text-center mb-5">
          <span className="v2-kicker">Câu chuyện thương hiệu</span>
          <h1 className="fw-bold text-emerald mt-2">VỀ MARINA LIVING</h1>
          <p className="text-muted fs-5 mx-auto" style={{ maxWidth: '700px' }}>
            Kiến tạo tổ ấm an cư xã hội chuẩn mực mới – Xanh, kết nối và bền vững bên Vịnh di sản Hạ Long.
          </p>
        </div>

        {/* Cột chữ giới thiệu so le hình ảnh */}
        <div className="row align-items-center gy-4 mb-5">
          <div className="col-md-6">
            <h3 className="fw-bold text-emerald">Sứ Mệnh An Cư Bền Vững</h3>
            <p className="text-muted">
              Marina Living là thương hiệu nhà ở xã hội (NOXH) thế hệ mới do BIM Land – thành viên tập đoàn BIM Group phát triển. Với tinh thần kế thừa uy tín phát triển các dự án nghỉ dưỡng quốc tế, Marina Living không chỉ đơn thuần mang tới một căn nhà giá cả hợp lý mà hơn thế, chúng tôi muốn tạo dựng một môi trường sống chất lượng cao cho cộng đồng dân cư địa phương.
            </p>
            <p className="text-muted">
              Dự án đầu tiên tại đa giác 3, Hùng Thắng được thiết kế tối ưu hóa gió biển tự nhiên, ánh sáng chan hòa và diện tích cảnh quan cây xanh trung tâm rộng lớn, tạo nên nét đẹp kiến trúc hiện đại đầy ấn tượng.
            </p>
          </div>
          <div className="col-md-6">
            <div className="rounded-4 overflow-hidden shadow">
              <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800" className="w-100" alt="Dự án Marina Living" />
            </div>
          </div>
        </div>

        {/* Hệ thống giá trị */}
        <div className="mb-5">
          <h3 className="fw-bold text-emerald text-center mb-4">HỆ GIÁ TRỊ CỦA MARINA LIVING</h3>
          <div className="row g-4">
            {[
              {
                letter: 'M',
                name: 'Modern (Hiện đại)',
                desc: 'Thiết kế kiến trúc hiện đại, sang trọng, mang phong cách Singapore tối ưu hóa ánh sáng tự nhiên và luồng khí đối lưu trong căn hộ.'
              },
              {
                letter: 'A',
                name: 'Accessible (Dễ tiếp cận)',
                desc: 'Giải pháp tài chính linh hoạt, mức giá bán ưu đãi theo sự kiểm duyệt của Sở Xây dựng giúp người lao động thu nhập thấp dễ dàng mua nhà.'
              },
              {
                letter: 'R',
                name: 'Responsible (Trách nhiệm)',
                desc: 'Phát triển dự án với tinh thần trách nhiệm cao nhất về tiến độ, chất lượng thi công bền bỉ và pháp lý đất đai lâu dài rõ ràng.'
              },
              {
                letter: 'I',
                name: 'Integrity (Chất lượng)',
                desc: 'Lựa chọn vật liệu xây dựng thân thiện môi trường, hệ thống quản lý tòa nhà, phòng cháy chữa cháy an toàn và bảo mật.'
              }
            ].map((v, i) => (
              <div className="col-md-6" key={i}>
                <div className="p-4 bg-white rounded-4 shadow-sm border border-success border-opacity-10 h-100 lift">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <span className="fs-1 fw-bold text-gold" style={{ fontFamily: 'monospace' }}>{v.letter}</span>
                    <h5 className="fw-bold text-dark mb-0">{v.name}</h5>
                  </div>
                  <p className="text-muted small mb-0">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lời kêu gọi đăng ký */}
        <div className="p-4 bg-emerald text-white rounded-4 text-center shadow-sm">
          <h3 className="fw-bold text-white mb-3">Sẵn Sàng Cho Điểm Khởi Đầu Mới?</h3>
          <p className="text-light mx-auto mb-4" style={{ maxWidth: '600px' }}>
            Nộp hồ sơ trực tuyến ngay hôm nay để nhận thông báo xét duyệt điều kiện đợt 1 và đặt chỗ căn hộ đẹp nhất tại dự án Marina Living Hạ Long.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link href="/DieuKienMua" className="btn btn-gold rounded-2 px-4 py-2 text-decoration-none">
              Trắc nghiệm Điều Kiện Mua ➜
            </Link>
            <Link href="/#matbang" className="btn btn-outline-light rounded-2 px-4 py-2 text-decoration-none">
              Xem Bảng Hàng Căn Hộ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
