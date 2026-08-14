'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function DieuKienMuaPage() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    // Bước 1: Nhà ở
    nhaO: {
      chuaCoNha: false,
      dienTichNho: false,
      nhaHuHong: false,
    },
    // Bước 2: Cư trú
    cuTru: {
      coHoKhau: false,
      coTamTruBaoHiem: false,
    },
    // Bước 3: Thu nhập
    thuNhap: {
      thuNhapThap: false,
      hoNgheo: false,
      laoDongDoanhNghiep: false,
      congChucVienChuc: false,
      nopThueThuNhapThuongXuyen: false,
    }
  });

  const [result, setResult] = useState(null); // 'ok', 'fail', null

  const handleToggleNhaO = (key) => {
    setAnswers(prev => ({
      ...prev,
      nhaO: { ...prev.nhaO, [key]: !prev.nhaO[key] }
    }));
  };

  const handleToggleCuTru = (key) => {
    setAnswers(prev => ({
      ...prev,
      cuTru: { ...prev.cuTru, [key]: !prev.cuTru[key] }
    }));
  };

  const handleToggleThuNhap = (key) => {
    setAnswers(prev => ({
      ...prev,
      thuNhap: { ...prev.thuNhap, [key]: !prev.thuNhap[key] }
    }));
  };

  const checkEligibility = () => {
    // Điều kiện 1: Khó khăn về nhà ở (chưa có nhà, hoặc diện tích < 10m2/người, hoặc nhà dột nát)
    const passNhaO = answers.nhaO.chuaCoNha || answers.nhaO.dienTichNho || answers.nhaO.nhaHuHong;
    
    // Điều kiện 2: Cư trú tại Quảng Ninh (hộ khẩu thường trú hoặc tạm trú + đóng BHXH 1 năm)
    const passCuTru = answers.cuTru.coHoKhau || answers.cuTru.coTamTruBaoHiem;
    
    // Điều kiện 3: Thu nhập (thu nhập thấp, nghèo, lao động, công chức và KHÔNG thuộc diện nộp thuế TNCN thường xuyên)
    const passThuNhap = (
      answers.thuNhap.thuNhapThap || 
      answers.thuNhap.hoNgheo || 
      answers.thuNhap.laoDongDoanhNghiep || 
      answers.thuNhap.congChucVienChuc
    ) && !answers.thuNhap.nopThueThuNhapThuongXuyen;

    const eligible = passNhaO && passCuTru && passThuNhap;
    setResult(eligible ? 'ok' : 'fail');
    setStep(4);
  };

  const resetSurvey = () => {
    setAnswers({
      nhaO: { chuaCoNha: false, dienTichNho: false, nhaHuHong: false },
      cuTru: { coHoKhau: false, coTamTruBaoHiem: false },
      thuNhap: { thuNhapThap: false, hoNgheo: false, laoDongDoanhNghiep: false, congChucVienChuc: false, nopThueThuNhapThuongXuyen: false }
    });
    setResult(null);
    setStep(1);
  };

  return (
    <div className="bg-cream py-5" style={{ minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="text-center mb-4">
          <span className="v2-kicker">Công cụ trắc nghiệm</span>
          <h1 className="fw-bold text-emerald mt-2">BẠN CÓ ĐỦ ĐIỀU KIỆN MUA NOXH KHÔNG?</h1>
          <p className="text-muted">
            Theo quy định Luật Nhà ở Việt Nam, hãy hoàn thành khảo sát 3 bước nhanh để kiểm tra sơ bộ điều kiện mua Nhà ở xã hội Marina Living Hạ Long.
          </p>
        </div>

        {/* Thanh tiến độ */}
        <div className="d-flex gap-2 mb-4 justify-content-between">
          <div className={`progress-seg ${step >= 1 ? 'on' : ''}`} style={{ height: '8px', flex: 1, borderRadius: '4px' }}></div>
          <div className={`progress-seg ${step >= 2 ? 'on' : ''}`} style={{ height: '8px', flex: 1, borderRadius: '4px' }}></div>
          <div className={`progress-seg ${step >= 3 ? 'on' : ''}`} style={{ height: '8px', flex: 1, borderRadius: '4px' }}></div>
        </div>

        <div className="survey-wrap p-4 bg-white shadow rounded-4">
          {/* BƯỚC 1: NHÀ Ở */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h4 className="fw-bold text-emerald mb-3">Bước 1: Tình trạng nhà ở hiện tại</h4>
              <p className="text-muted mb-4">Chọn tất cả các trường hợp đúng với hộ gia đình của bạn:</p>
              
              <div className="d-flex flex-column gap-3">
                <div 
                  className={`choice-card d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer ${answers.nhaO.chuaCoNha ? 'selected border-success bg-success bg-opacity-10' : ''}`}
                  onClick={() => handleToggleNhaO('chuaCoNha')}
                >
                  <input type="checkbox" className="form-check-input m-0" checked={answers.nhaO.chuaCoNha} readOnly />
                  <div>
                    <strong className="d-block text-dark">Chưa có nhà ở thuộc sở hữu</strong>
                    <span className="small text-muted">Chưa đứng tên quyền sở hữu nhà ở hoặc đất ở tại tỉnh Quảng Ninh.</span>
                  </div>
                </div>

                <div 
                  className={`choice-card d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer ${answers.nhaO.dienTichNho ? 'selected border-success bg-success bg-opacity-10' : ''}`}
                  onClick={() => handleToggleNhaO('dienTichNho')}
                >
                  <input type="checkbox" className="form-check-input m-0" checked={answers.nhaO.dienTichNho} readOnly />
                  <div>
                    <strong className="d-block text-dark">Có nhà ở nhưng diện tích quá chật hẹp</strong>
                    <span className="small text-muted">Diện tích bình quân đầu người của hộ gia đình nhỏ hơn 10m² sàn/người.</span>
                  </div>
                </div>

                <div 
                  className={`choice-card d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer ${answers.nhaO.nhaHuHong ? 'selected border-success bg-success bg-opacity-10' : ''}`}
                  onClick={() => handleToggleNhaO('nhaHuHong')}
                >
                  <input type="checkbox" className="form-check-input m-0" checked={answers.nhaO.nhaHuHong} readOnly />
                  <div>
                    <strong className="d-block text-dark">Nhà ở bị hư hỏng dột nát, tạm bợ</strong>
                    <span className="small text-muted">Nhà ở hiện tại bị xuống cấp nghiêm trọng, mất an toàn nhưng chưa có điều kiện xây mới.</span>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end mt-4">
                <button className="btn btn-emerald px-4 py-2 rounded-2" onClick={() => setStep(2)}>Tiếp theo ➜</button>
              </div>
            </div>
          )}

          {/* BƯỚC 2: CƯ TRÚ */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h4 className="fw-bold text-emerald mb-3">Bước 2: Điều kiện cư trú tại địa phương</h4>
              <p className="text-muted mb-4">Bạn hoặc người đứng tên hồ sơ có một trong các giấy tờ cư trú sau tại Quảng Ninh không?</p>

              <div className="d-flex flex-column gap-3">
                <div 
                  className={`choice-card d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer ${answers.cuTru.coHoKhau ? 'selected border-success bg-success bg-opacity-10' : ''}`}
                  onClick={() => handleToggleCuTru('coHoKhau')}
                >
                  <input type="checkbox" className="form-check-input m-0" checked={answers.cuTru.coHoKhau} readOnly />
                  <div>
                    <strong className="d-block text-dark">Có đăng ký thường trú tại tỉnh Quảng Ninh</strong>
                    <span className="small text-muted">Có hộ khẩu thường trú hoặc giấy xác nhận thông tin cư trú tại địa phương.</span>
                  </div>
                </div>

                <div 
                  className={`choice-card d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer ${answers.cuTru.coTamTruBaoHiem ? 'selected border-success bg-success bg-opacity-10' : ''}`}
                  onClick={() => handleToggleCuTru('coTamTruBaoHiem')}
                >
                  <input type="checkbox" className="form-check-input m-0" checked={answers.cuTru.coTamTruBaoHiem} readOnly />
                  <div>
                    <strong className="d-block text-dark">Tạm trú và đóng Bảo hiểm xã hội trên 1 năm</strong>
                    <span className="small text-muted">Có đăng ký tạm trú tại Quảng Ninh và đóng BHXH tại tỉnh từ 1 năm trở lên.</span>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-between mt-4">
                <button className="btn btn-light px-4 py-2 rounded-2" onClick={() => setStep(1)}>➜ Quay lại</button>
                <button className="btn btn-emerald px-4 py-2 rounded-2" onClick={() => setStep(3)}>Tiếp theo ➜</button>
              </div>
            </div>
          )}

          {/* BƯỚC 3: THU NHẬP */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h4 className="fw-bold text-emerald mb-3">Bước 3: Tình trạng thu nhập & Đối tượng</h4>
              <p className="text-muted mb-4">Chọn tất cả các tiêu chí đúng về thu nhập của bạn:</p>

              <div className="d-flex flex-column gap-3">
                <div 
                  className={`choice-card d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer ${answers.thuNhap.thuNhapThap ? 'selected border-success bg-success bg-opacity-10' : ''}`}
                  onClick={() => handleToggleThuNhap('thuNhapThap')}
                >
                  <input type="checkbox" className="form-check-input m-0" checked={answers.thuNhap.thuNhapThap} readOnly />
                  <div>
                    <strong className="d-block text-dark">Là người thu nhập thấp hoặc hộ cận nghèo</strong>
                    <span className="small text-muted">Có thu nhập bình quân đầu người không thuộc diện nộp thuế thu nhập cá nhân thường xuyên.</span>
                  </div>
                </div>

                <div 
                  className={`choice-card d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer ${answers.thuNhap.laoDongDoanhNghiep ? 'selected border-success bg-success bg-opacity-10' : ''}`}
                  onClick={() => handleToggleThuNhap('laoDongDoanhNghiep')}
                >
                  <input type="checkbox" className="form-check-input m-0" checked={answers.thuNhap.laoDongDoanhNghiep} readOnly />
                  <div>
                    <strong className="d-block text-dark">Là công nhân, người lao động đang làm việc tại doanh nghiệp</strong>
                    <span className="small text-muted">Lao động tại các khu công nghiệp, doanh nghiệp sản xuất, dịch vụ.</span>
                  </div>
                </div>

                <div 
                  className={`choice-card d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer ${answers.thuNhap.congChucVienChuc ? 'selected border-success bg-success bg-opacity-10' : ''}`}
                  onClick={() => handleToggleThuNhap('congChucVienChuc')}
                >
                  <input type="checkbox" className="form-check-input m-0" checked={answers.thuNhap.congChucVienChuc} readOnly />
                  <div>
                    <strong className="d-block text-dark">Cán bộ công chức, viên chức, lực lượng vũ trang</strong>
                    <span className="small text-muted">Công tác tại các cơ quan nhà nước, đơn vị sự nghiệp công lập, quân đội, công an.</span>
                  </div>
                </div>

                <div 
                  className={`choice-card d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer ${answers.thuNhap.nopThueThuNhapThuongXuyen ? 'selected border-danger bg-danger bg-opacity-10' : ''}`}
                  onClick={() => handleToggleThuNhap('nopThueThuNhapThuongXuyen')}
                >
                  <input type="checkbox" className="form-check-input m-0 text-danger" checked={answers.thuNhap.nopThueThuNhapThuongXuyen} readOnly />
                  <div>
                    <strong className="d-block text-danger">Có đóng Thuế thu nhập cá nhân thường xuyên</strong>
                    <span className="small text-muted">Có mức thu nhập chịu thuế cao hơn mức giảm trừ gia cảnh quy định (đối tượng chịu thuế TNCN bậc cao).</span>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-between mt-4">
                <button className="btn btn-light px-4 py-2 rounded-2" onClick={() => setStep(2)}>➜ Quay lại</button>
                <button className="btn btn-emerald px-4 py-2 rounded-2" onClick={checkEligibility}>Kiểm tra kết quả ➜</button>
              </div>
            </div>
          )}

          {/* BƯỚC 4: KẾT QUẢ */}
          {step === 4 && (
            <div className="animate-fade-in text-center py-3">
              {result === 'ok' ? (
                <div>
                  <div className="result-banner result-ok fs-5 mb-4 shadow-sm">
                    🎉 CHÚC MỪNG! BẠN ĐỦ ĐIỀU KIỆN SƠ BỘ ĐỂ MUA NHÀ Ở XÃ HỘI
                  </div>
                  <p className="text-muted mb-4 fs-6">
                    Theo khảo sát của hệ thống, bạn hoàn toàn đủ điều kiện nộp hồ sơ đăng ký mua nhà ở xã hội tại dự án **Marina Living Hạ Long**. Vui lòng đăng ký tài khoản cư dân và nộp hồ sơ trực tuyến ngay để được bộ phận tư vấn ưu tiên xét duyệt.
                  </p>
                  <div className="d-flex justify-content-center gap-3">
                    <button className="btn btn-emerald px-4 py-2.5 rounded-2 fw-bold" data-bs-toggle="modal" data-bs-target="#registerModal">
                      Đăng Ký Tài Khoản & Nộp Hồ Sơ
                    </button>
                    <button className="btn btn-light px-4 py-2.5 rounded-2" onClick={resetSurvey}>
                      Khảo sát lại
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="result-banner result-fail fs-5 mb-4 shadow-sm">
                    ⚠️ CHƯA ĐỦ ĐIỀU KIỆN MUA NHÀ Ở XÃ HỘI
                  </div>
                  <p className="text-muted mb-4 fs-6 text-start">
                    Bạn chưa đáp ứng đầy đủ điều kiện quy định sơ bộ vì một số lý do sau:
                    <br />- Cần khó khăn về nhà ở (chưa sở hữu nhà hoặc diện tích quá nhỏ).
                    <br />- Cần có hộ khẩu thường trú tại Quảng Ninh hoặc tạm trú dài hạn + bảo hiểm xã hội 1 năm.
                    <br />- Phải thuộc đối tượng thu nhập thấp và **không thuộc diện đóng thuế thu nhập cá nhân thường xuyên**.
                  </p>
                  <p className="fw-semibold text-emerald mb-4">
                    Nếu bạn còn thắc mắc, vui lòng đăng ký nhận cuộc gọi tư vấn chuyên sâu từ đội ngũ bán hàng BIM Group.
                  </p>
                  <div className="d-flex justify-content-center gap-3">
                    <button className="btn btn-gold px-4 py-2.5 rounded-2 fw-bold" data-bs-toggle="modal" data-bs-target="#loginModal">
                      Đăng Ký Nhận Tư Vấn Trực Tiếp
                    </button>
                    <button className="btn btn-light px-4 py-2.5 rounded-2" onClick={resetSurvey}>
                      Khảo sát lại
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
