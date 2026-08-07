'use client';

import React, { useState, useEffect } from 'react';

export default function PortalClient({ session, initialApplications }) {
  const [apps, setApps] = useState(initialApplications || []);
  const [showForm, setShowForm] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState(session?.fullName || '');
  const [email, setEmail] = useState(session?.email || '');
  const [targetObject, setTargetObject] = useState('Người thu nhập thấp khu vực đô thị');
  
  const [cccdFront, setCccdFront] = useState(null);
  const [cccdBack, setCccdBack] = useState(null);
  const [residency, setResidency] = useState(null);
  const [income, setIncome] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch applications list helper
  const reloadApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) {
        setApps(data.applications);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const fd = new FormData();
      fd.append('fullName', fullName);
      fd.append('email', email);
      fd.append('targetObject', targetObject);
      
      if (cccdFront) fd.append('cccdFront', cccdFront);
      if (cccdBack) fd.append('cccdBack', cccdBack);
      if (residency) fd.append('residency', residency);
      if (income) fd.append('income', income);

      const res = await fetch('/api/applications', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();

      if (data.success) {
        setMessage('🎉 Nộp hồ sơ thành công! Hồ sơ của bạn đã được chuyển tới bộ phận tuyển dụng thẩm định.');
        setShowForm(false);
        // Reset form files
        setCccdFront(null);
        setCccdBack(null);
        setResidency(null);
        setIncome(null);
        reloadApplications();
      } else {
        setMessage(`⚠️ Lỗi: ${data.message}`);
      }
    } catch (err) {
      setMessage('⚠️ Lỗi kết nối gửi hồ sơ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-light py-5" style={{ minHeight: '80vh' }}>
      <div className="container">
        {/* Header cá nhân */}
        <div className="card border-0 shadow-sm mb-4 p-4" style={{ borderRadius: '16px' }}>
          <div className="row align-items-center justify-content-between">
            <div className="col-md-8">
              <h2 className="fw-bold text-emerald mb-1">CỔNG THÔNG TIN ĐĂNG KÝ CƯ DÂN</h2>
              <p className="text-muted mb-0">
                Chào mừng <strong>{session?.fullName}</strong> ({session?.phoneNumber}). Quản lý hồ sơ và tiến độ thẩm định mua căn hộ.
              </p>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <span className="badge bg-emerald px-3 py-2 fs-6 rounded-pill">Đối tượng cư dân</span>
            </div>
          </div>
        </div>

        {message && (
          <div className="alert alert-success alert-dismissible fade show shadow-sm border-0 mb-4" role="alert" style={{ borderRadius: '12px' }}>
            {message}
            <button type="button" className="btn-close" onClick={() => setMessage('')} aria-label="Close"></button>
          </div>
        )}

        <div className="row g-4">
          {/* Cột trái: Danh sách hồ sơ đã nộp */}
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: '16px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold text-emerald mb-0">Hồ Sơ Đã Nộp</h4>
                {!showForm && (
                  <button 
                    className="btn btn-emerald rounded-pill px-3 py-2 btn-sm fw-bold" 
                    onClick={() => setShowForm(true)}
                  >
                    ➕ Nộp Hồ Sơ Mới
                  </button>
                )}
              </div>

              {apps.length === 0 ? (
                <div className="text-center py-5 text-muted border border-dashed rounded-3">
                  <span className="fs-1 d-block mb-2">📁</span>
                  Bạn chưa có hồ sơ đăng ký nào được nộp trực tuyến.
                  <br />
                  Hãy click nút <strong>Nộp Hồ Sơ Mới</strong> để bắt đầu.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {apps.map((app) => (
                    <div className="p-3 border rounded-3 bg-white" key={app.id}>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fw-bold text-dark">Mã hồ sơ: {app.id.toUpperCase()}</span>
                        <span className={`badge px-3 py-1.5 fs-7 rounded-pill ${
                          app.status === 'approved' ? 'bg-success' :
                          app.status === 'rejected' ? 'bg-danger' :
                          app.status === 'reviewing' ? 'bg-info text-dark' : 'bg-warning text-dark'
                        }`}>
                          {app.status === 'approved' ? 'Đã phê duyệt' :
                           app.status === 'rejected' ? 'Bị từ chối' :
                           app.status === 'reviewing' ? 'Đang kiểm duyệt' : 'Đã tiếp nhận'}
                        </span>
                      </div>

                      <div className="row g-2 small text-muted mb-3 fs-7">
                        <div className="col-12">Đối tượng: <strong>{app.targetObject}</strong></div>
                        <div className="col-6">Ngày nộp: <strong>{new Date(app.createdAt).toLocaleDateString('vi-VN')}</strong></div>
                        <div className="col-6">Số điện thoại: <strong>{app.phoneNumber}</strong></div>
                      </div>

                      {/* Tài liệu đính kèm */}
                      <div className="border-top pt-2">
                        <span className="d-block small fw-bold text-dark mb-1">Tài liệu đã đính kèm:</span>
                        <div className="d-flex gap-2 flex-wrap fs-8">
                          {app.documents.cccdFront && <span className="badge bg-secondary">CCCD Mặt trước</span>}
                          {app.documents.cccdBack && <span className="badge bg-secondary">CCCD Mặt sau</span>}
                          {app.documents.residency && <span className="badge bg-secondary">Xác nhận Cư trú</span>}
                          {app.documents.income && <span className="badge bg-secondary">Xác nhận Thu nhập</span>}
                        </div>
                      </div>

                      {/* Phản hồi từ admin */}
                      {app.notes && (
                        <div className="mt-3 p-2 bg-light border border-start border-3 border-emerald rounded-3 small">
                          <strong>💬 Ghi chú kiểm duyệt:</strong> {app.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Form nộp hồ sơ mới hoặc Thông tin hướng dẫn */}
          <div className="col-lg-5">
            {showForm ? (
              <div className="card border-0 shadow-sm p-4" style={{ borderRadius: '16px' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="fw-bold text-emerald mb-0">Nộp Hồ Sơ Mới</h4>
                  <button className="btn btn-outline-secondary btn-sm rounded-pill" onClick={() => setShowForm(false)}>Hủy</button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Họ tên người đăng ký</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Email liên hệ</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Đối tượng ưu tiên mua NOXH</label>
                    <select 
                      className="form-select" 
                      value={targetObject}
                      onChange={(e) => setTargetObject(e.target.value)}
                    >
                      <option value="Người thu nhập thấp khu vực đô thị">Người thu nhập thấp khu vực đô thị</option>
                      <option value="Người lao động làm việc tại các doanh nghiệp">Công nhân, người lao động tại DN</option>
                      <option value="Cán bộ, công chức, viên chức, lực lượng vũ trang">Cán bộ công chức, viên chức</option>
                      <option value="Hộ nghèo, cận nghèo đô thị">Hộ nghèo, cận nghèo đô thị</option>
                    </select>
                  </div>

                  <hr className="my-4" />
                  <h5 className="fw-bold text-dark mb-3">Tải lên giấy tờ minh chứng (Ảnh/PDF)</h5>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Ảnh CCCD Mặt trước</label>
                    <input 
                      type="file" 
                      className="form-control form-control-sm"
                      accept="image/*,application/pdf"
                      onChange={(e) => setCccdFront(e.target.files[0])}
                      required 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Ảnh CCCD Mặt sau</label>
                    <input 
                      type="file" 
                      className="form-control form-control-sm"
                      accept="image/*,application/pdf"
                      onChange={(e) => setCccdBack(e.target.files[0])}
                      required 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Xác nhận thông tin cư trú (CT07 / Sổ hộ khẩu cũ)</label>
                    <input 
                      type="file" 
                      className="form-control form-control-sm"
                      accept="image/*,application/pdf"
                      onChange={(e) => setResidency(e.target.files[0])}
                      required 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Giấy xác nhận thu nhập thấp (Mẫu 03)</label>
                    <input 
                      type="file" 
                      className="form-control form-control-sm"
                      accept="image/*,application/pdf"
                      onChange={(e) => setIncome(e.target.files[0])}
                      required 
                    />
                  </div>

                  <button type="submit" className="btn btn-emerald w-100 py-2.5 rounded-pill fw-bold mt-3" disabled={isLoading}>
                    {isLoading ? 'Đang tải hồ sơ lên...' : '🚀 Gửi Hồ Sơ Xét Duyệt'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="card border-0 shadow-sm p-4 bg-emerald text-white" style={{ borderRadius: '16px' }}>
                <h4 className="fw-bold text-white mb-3">Quy trình thẩm định</h4>
                <p className="text-light small">
                  Sau khi hồ sơ trực tuyến được gửi thành công:
                </p>
                <ol className="text-light small ps-3">
                  <li className="mb-2"><strong>Bước 1: Tiếp nhận trực tuyến.</strong> Bộ phận tư vấn kiểm tra hình ảnh các giấy tờ và cập nhật trạng thái "Đang thẩm định".</li>
                  <li className="mb-2"><strong>Bước 2: Yêu cầu bổ sung (nếu có).</strong> Nếu ảnh giấy tờ bị mờ hoặc sai biểu mẫu, bạn sẽ nhận được ghi chú yêu cầu bổ sung tệp mới.</li>
                  <li className="mb-2"><strong>Bước 3: Phê duyệt sơ bộ.</strong> Bạn nhận lịch hẹn đem hồ sơ giấy bản gốc đến văn phòng đối chiếu trực tiếp.</li>
                </ol>
                <div className="alert alert-light text-dark border-0 py-2 mt-4 fs-7 fw-semibold">
                  📞 Hỗ trợ trực tiếp: 1900 6666
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
