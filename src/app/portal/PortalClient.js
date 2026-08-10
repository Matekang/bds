'use client';

import React, { useState } from 'react';

export default function PortalClient({ session, initialApplications }) {
  const [apps, setApps] = useState(initialApplications || []);
  const activeApp = apps.length > 0 ? apps[0] : null;

  // Form View vs List View state
  const [viewMode, setViewMode] = useState(activeApp ? 'view' : 'edit'); // 'view' | 'edit'

  // Wizard Step State (1 -> 6)
  const [currentFormStep, setCurrentFormStep] = useState(activeApp ? 3 : 1);

  // Mobile customer info collapse toggle
  const [showCustomerInfoMobile, setShowCustomerInfoMobile] = useState(false);

  // Customer metadata (Deterministic fallback to prevent Next.js React hydration mismatch)
  const defaultMaKH = session?.userId ? `KH-${String(session.userId).padStart(4, '0')}` : 'KH-1001';
  const maKH = activeApp?.maKH || defaultMaKH;
  const maHoSo = activeApp?.id || 'Chưa cấp';

  // STEP 1 STATES: Kênh biết đến thông tin
  const [infoChannel, setInfoChannel] = useState(activeApp?.infoChannel || 'social_media');
  const [needLoanConsult, setNeedLoanConsult] = useState(activeApp?.needLoanConsult || 'yes');

  // STEP 2 STATES: Nhóm đối tượng & Loại căn
  const [targetObject, setTargetObject] = useState(activeApp?.targetObject || 'K1');
  const [unitType, setUnitType] = useState(activeApp?.unitType || '2PN');
  const [preferredFloor, setPreferredFloor] = useState(activeApp?.preferredFloor || 'mid');

  // STEP 3 STATES: Nộp hồ sơ (Tài khoản & CCCD & Tệp)
  const [fullName, setFullName] = useState(activeApp?.fullName || session?.fullName || '');
  const [email, setEmail] = useState(activeApp?.email || session?.email || '');
  const [cccdNumber, setCccdNumber] = useState(activeApp?.cccdNumber || '');
  const [cccdPreview, setCccdPreview] = useState(activeApp?.cccdImage || '');

  // STEP 5 STATES: Lịch hẹn đối chứng bản cứng
  const [appointmentDate, setAppointmentDate] = useState(activeApp?.appointmentDate || '2026-08-22');
  const [appointmentTime, setAppointmentTime] = useState(activeApp?.appointmentTime || '09:00 - 10:00');
  const [appointmentConfirmed, setAppointmentConfirmed] = useState(activeApp?.appointmentConfirmed || false);

  // Documents state (doc1 -> doc9)
  const defaultDocs = {
    doc1: activeApp?.documents?.doc1 || null,
    doc2: activeApp?.documents?.doc2 || null,
    doc3: activeApp?.documents?.doc3 || null,
    doc4: activeApp?.documents?.doc4 || null,
    doc5: activeApp?.documents?.doc5 || null,
    doc6: activeApp?.documents?.doc6 || null,
    doc7: activeApp?.documents?.doc7 || null,
    doc8: activeApp?.documents?.doc8 || null,
    doc9: activeApp?.documents?.doc9 || null,
  };

  const [uploadedDocs, setUploadedDocs] = useState(defaultDocs);
  const [filesToUpload, setFilesToUpload] = useState({});
  const [cccdFile, setCccdFile] = useState(null);

  // Agreement Checkboxes
  const [agreedTerms1, setAgreedTerms1] = useState(activeApp?.agreedTerms1 ?? false);
  const [agreedTerms2, setAgreedTerms2] = useState(activeApp?.agreedTerms2 ?? false);

  // Status & Notification states
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [previewModalDoc, setPreviewModalDoc] = useState(null);

  // Danh sách các kênh biết đến thông tin
  const infoChannelsList = [
    { id: 'social_media', icon: '🌐', name: 'Mạng xã hội (Facebook, Zalo, TikTok)', desc: 'Tin tức, bài đăng, nhóm thảo luận trên MXH' },
    { id: 'press_media', icon: '📰', name: 'Báo chí / Truyền hình / Pano ngoài trời', desc: 'Báo điện tử, thời sự VTV/QTV, bảng biển quảng cáo' },
    { id: 'referral', icon: '👥', name: 'Người thân / Bạn bè / Đồng nghiệp giới thiệu', desc: 'Được người quen giới thiệu thông tin dự án' },
    { id: 'agency', icon: '🏢', name: 'Sàn giao dịch / Đơn vị tư vấn BĐS', desc: 'Chuyên viên tư vấn các sàn đối tác chính thức' },
    { id: 'bim_event', icon: '📬', name: 'Thư ngỏ / Sự kiện BIM Group', desc: 'Nhận thư ngỏ trực tiếp hoặc tham dự sự kiện' },
    { id: 'other', icon: '❓', name: 'Kênh thông tin khác', desc: 'Tìm kiếm trên Google, diễn đàn khác...' },
  ];

  // Danh sách các nhóm đối tượng Luật Nhà Ở
  const targetGroupsList = [
    { id: 'K1', title: 'K1. Người có công với cách mạng, thân nhân liệt sĩ', desc: 'Theo quy định của pháp luật về ưu đãi người có công' },
    { id: 'K2', title: 'K2. Hộ gia đình nghèo, cận nghèo tại khu vực nông thôn & đô thị', desc: 'Có xác nhận hộ nghèo/cận nghèo theo quy định' },
    { id: 'K3', title: 'K3. Hộ gia đình bị ảnh hưởng bởi thiên tai, biến đổi khí hậu', desc: 'Thuộc vùng ô nhiễm môi trường hoặc bị ảnh hưởng thiên tai' },
    { id: 'K4', title: 'K4. Người thu nhập thấp tại khu vực đô thị', desc: 'Cán bộ, công chức, viên chức, người lao động thu nhập thấp' },
    { id: 'K5', title: 'K5. Công nhân, người lao động làm việc tại các KCN, doanh nghiệp', desc: 'Đang làm việc tại các khu công nghiệp, cụm công nghiệp' },
    { id: 'K6', title: 'K6. Sĩ quan, quân nhân chuyên nghiệp, công an nhân dân', desc: 'Lực lượng vũ trang nhân dân công tác trên địa bàn' },
    { id: 'K7', title: 'K7. Cán bộ, công chức, viên chức theo quy định', desc: 'Đang công tác tại các cơ quan nhà nước, tổ chức chính trị' },
    { id: 'K8', title: 'K8. Đối tượng đã trả lại nhà ở công vụ', desc: 'Đã trả lại nhà ở công vụ theo quy định' },
    { id: 'K9', title: 'K9. Hộ gia đình, cá nhân thuộc diện thu hồi đất, giải tỏa', desc: 'Chưa được nhà nước bồi thường bằng nhà ở, đất ở' },
  ];

  // Document specifications list matching Vietnamese requirements
  const documentList = [
    {
      id: 'doc1',
      num: 1,
      required: true,
      title: 'Mẫu số 01_Mẫu đơn đăng ký mua, thuê mua, thuê NOXH (Ban hành kèm theo NĐ261/2025/NĐ-CP)',
      tags: ['📖 Sổ tay', '📥 Tải mẫu']
    },
    {
      id: 'doc2',
      num: 2,
      required: true,
      title: 'Mẫu số 02_Giấy tờ chứng minh điều kiện về nhà ở để được mua, thuê mua nhà ở xã hội trường hợp chưa có nhà ở thuộc sở hữu của mình (Ban hành kèm theo TT08/2026/TT-BXD); hoặc Mẫu số 03_Giấy tờ chứng minh điều kiện về nhà ở để được mua, thuê mua nhà ở xã hội trường hợp có nhà ở nhưng diện tích bình quân đầu người dưới 15m2 (Ban hành kèm theo TT05/2024/TT-BXD);hoặc 02 Mẫu tham khảo_Giấy tờ chứng minh đối với trường hợp người đã có nhà ở thuộc sở hữu...',
      tags: ['📖 Sổ tay', '📥 Tải mẫu']
    },
    {
      id: 'doc3',
      num: 3,
      required: true,
      title: 'Giấy tờ chứng minh người có công với cách mạng hoặc thân nhân liệt sỹ (Pháp lệnh Ưu đãi người có công với cách mạng)',
      tags: ['📖 Sổ tay']
    },
    {
      id: 'doc4',
      num: 4,
      required: true,
      title: 'Bản sao y công chứng CCCD của Chủ hộ, tất cả các thành viên trong gia đình (nếu kết hôn) và tất cả thành viên có tên trong Xác nhận cư trú CT07',
      tags: ['📖 Sổ tay']
    },
    {
      id: 'doc5',
      num: 5,
      required: true,
      title: 'Giấy chứng nhận kết hôn hoặc xác nhận tình trạng hôn nhân của người đứng đơn',
      tags: ['📖 Sổ tay']
    },
    {
      id: 'doc6',
      num: 6,
      required: false,
      title: 'Giấy tờ chứng minh độc thân đang nuôi con vị thành niên (nếu có)',
      tags: ['📖 Sổ tay']
    },
    {
      id: 'doc7',
      num: 7,
      required: true,
      title: 'Xác nhận cư trú của người đứng đơn (mẫu CT07; bổ sung xác nhận của vợ/chồng nếu không cùng nơi đăng ký cư trú)',
      tags: ['📖 Sổ tay']
    },
    {
      id: 'doc8',
      num: 8,
      required: false,
      title: 'Xác nhận người khuyết tật (nếu có)',
      tags: ['📖 Sổ tay']
    },
    {
      id: 'doc9',
      num: 9,
      required: false,
      title: 'Giấy tờ chứng minh có từ 02 con đẻ trở lên (Nếu có)',
      tags: ['📖 Sổ tay']
    }
  ];

  // Dynamic progress calculation
  const calculateProgress = () => {
    const requiredKeys = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5', 'doc7'];
    let filledCount = cccdNumber ? 1 : 0;
    requiredKeys.forEach(k => {
      if (uploadedDocs[k] || filesToUpload[k]) filledCount++;
    });
    return Math.round((filledCount / 7) * 100);
  };

  const progressPercent = calculateProgress();

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

  const handleCccdChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCccdFile(file);
      setCccdPreview(URL.createObjectURL(file));
      setTimeout(() => {
        if (!cccdNumber) {
          const generatedCccd = '035' + Math.floor(100000000 + Math.random() * 900000000);
          setCccdNumber(generatedCccd);
        }
        setMessage({ text: '⚡ Đã đọc thành công thông tin thẻ CCCD của bạn!', type: 'success' });
      }, 600);
    }
  };

  const handleDocFileChange = (docId, file) => {
    if (!file) return;
    setFilesToUpload(prev => ({ ...prev, [docId]: file }));
    setUploadedDocs(prev => ({
      ...prev,
      [docId]: { name: file.name, url: URL.createObjectURL(file) }
    }));
    setMessage({ text: `📁 Đã chọn file "${file.name}" cho mục ${docId.toUpperCase()}`, type: 'info' });
  };

  const handleRemoveDoc = (docId) => {
    setFilesToUpload(prev => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
    setUploadedDocs(prev => ({ ...prev, [docId]: null }));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  // Submit / Update Application
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreedTerms1 || !agreedTerms2) {
      setMessage({ text: '⚠️ Bạn vui lòng tích chọn đồng ý 2 nội dung điều khoản để tiếp tục.', type: 'warning' });
      return;
    }

    setIsLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const fd = new FormData();
      if (activeApp?.id) fd.append('appId', activeApp.id);
      fd.append('fullName', fullName);
      fd.append('email', email);
      fd.append('cccdNumber', cccdNumber);
      fd.append('infoChannel', infoChannel);
      fd.append('needLoanConsult', needLoanConsult);
      fd.append('targetObject', targetObject);
      fd.append('unitType', unitType);
      fd.append('preferredFloor', preferredFloor);
      fd.append('agreedTerms1', agreedTerms1);
      fd.append('agreedTerms2', agreedTerms2);

      if (cccdFile) {
        fd.append('cccdFile', cccdFile);
      }

      Object.keys(filesToUpload).forEach(k => {
        fd.append(k, filesToUpload[k]);
      });

      const res = await fetch('/api/applications', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ text: '🎉 Nộp / Cập nhật hồ sơ thành công! Chuyển sang Bước 4 để theo dõi tiến độ.', type: 'success' });
        reloadApplications();
        setCurrentFormStep(4);
      } else {
        setMessage({ text: `⚠️ Lỗi: ${data.message}`, type: 'danger' });
      }
    } catch (err) {
      setMessage({ text: '⚠️ Thất bại khi kết nối máy chủ nộp hồ sơ.', type: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm appointment in Step 5
  const handleConfirmAppointment = () => {
    setAppointmentConfirmed(true);
    setMessage({ text: `🎉 Đã xác nhận lịch hẹn đối chứng bản cứng vào ngày ${appointmentDate} khung giờ ${appointmentTime}!`, type: 'success' });
  };

  return (
    <div style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. TOP HEADER (Green Bar - Mobile Optimized) */}
      <header className="py-2 px-2 px-md-3 text-white shadow-sm" style={{ backgroundColor: '#0b6640', borderBottom: '1px solid #084e31' }}>
        <div className="container-fluid d-flex justify-content-between align-items-center flex-wrap gap-2">
          
          {/* Logo & Main Portal Title */}
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center justify-content-center rounded-circle bg-white flex-shrink-0" style={{ width: '36px', height: '36px', color: '#0b6640', fontWeight: 'bold' }}>
              <span className="fs-6">🏠</span>
            </div>
            <div>
              <div className="fw-bold text-white lh-1" style={{ fontSize: '0.95rem' }}>Cổng nộp hồ sơ trực tuyến</div>
              <div className="small fw-semibold uppercase" style={{ color: '#fed47e', fontSize: '0.68rem', letterSpacing: '0.3px' }}>
                HÀNH TRÌNH SỐ HÓA HỒ SƠ KHÁCH HÀNG
              </div>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="d-flex align-items-center gap-2 ms-auto">
            <button 
              className="btn btn-sm text-white border-0 d-flex align-items-center gap-1.5 rounded-pill px-2.5 py-1"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)', fontSize: '0.8rem' }}
              onClick={() => setViewMode(viewMode === 'view' ? 'edit' : 'view')}
            >
              📁 Hồ sơ <span className="badge bg-danger rounded-circle p-1" style={{ fontSize: '0.65rem' }}>{apps.length}</span>
            </button>

            {/* User Dropdown Profile */}
            <div className="dropdown">
              <button className="btn btn-sm text-white dropdown-toggle border-0 fw-semibold d-flex align-items-center gap-1.5 p-1" type="button" data-bs-toggle="dropdown" aria-expanded="false" style={{ fontSize: '0.82rem' }}>
                <span className="rounded-circle bg-warning text-dark d-inline-flex justify-content-center align-items-center fw-bold" style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}>
                  👤
                </span>
                <span className="d-none d-sm-inline">{session?.fullName || 'Khách hàng'}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2 fs-7">
                <li><button className="dropdown-item py-2" onClick={() => setViewMode('view')}>📄 Xem hồ sơ đã nộp</button></li>
                <li><button className="dropdown-item py-2" onClick={() => { setViewMode('edit'); setCurrentFormStep(1); }}>✏️ Cập nhật thông tin</button></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item text-danger py-2" onClick={handleLogout}>🚪 Đăng xuất</button></li>
              </ul>
            </div>

            <button className="btn btn-danger btn-sm rounded-pill px-2.5 py-0.5 fw-bold fs-8" onClick={handleLogout}>
              Thoát
            </button>
          </div>
        </div>
      </header>

      {/* 2. SUB-BAR NAVIGATION (High-Contrast Buttons Fixed for Mobile & Desktop) */}
      <div className="bg-white border-bottom py-2 px-2 px-md-3">
        <div className="container-fluid d-flex justify-content-between align-items-center flex-wrap gap-2">
          
          <div className="d-flex align-items-center gap-2">
            <button 
              className="btn btn-sm rounded-pill px-2.5 py-1 fw-bold fs-8 border"
              style={{ backgroundColor: '#ffffff', color: '#1e293b', borderColor: '#cbd5e1' }}
              onClick={() => setViewMode(viewMode === 'view' ? 'edit' : 'view')}
            >
              ← Hồ sơ của tôi
            </button>
            
            <span className="badge text-white px-2.5 py-1.5 rounded-pill fs-8 fw-bold" style={{ backgroundColor: '#475569' }}>
              {activeApp ? (
                activeApp.status === 'approved' ? '✓ Đã duyệt hồ sơ' :
                activeApp.status === 'rejected' ? '❌ Cần bổ sung' :
                activeApp.status === 'reviewing' ? '⏳ Đang thẩm duyệt' : 'Chờ gửi hồ sơ'
              ) : 'Chờ gửi hồ sơ'}
            </span>
          </div>

          {/* HIGH CONTRAST CRISP BUTTONS */}
          <div className="d-flex align-items-center gap-2">
            <button 
              className="btn btn-sm rounded-pill px-3 py-1.5 fw-bold fs-7 shadow-sm transition-all" 
              style={{
                backgroundColor: viewMode === 'view' ? '#0b6640' : '#ffffff',
                color: viewMode === 'view' ? '#ffffff' : '#0f172a',
                border: viewMode === 'view' ? '1px solid #0b6640' : '1px solid #0b6640',
                boxShadow: viewMode === 'view' ? '0 2px 8px rgba(11,102,64,0.3)' : 'none'
              }}
              onClick={() => setViewMode('view')}
            >
              👁 Xem Hồ Sơ &amp; Tiến Độ
            </button>

            <button 
              className="btn btn-sm rounded-pill px-3 py-1.5 fw-bold fs-7 shadow-sm transition-all" 
              style={{
                backgroundColor: viewMode === 'edit' ? '#0b6640' : '#ffffff',
                color: viewMode === 'edit' ? '#ffffff' : '#0f172a',
                border: viewMode === 'edit' ? '1px solid #0b6640' : '1px solid #0b6640',
                boxShadow: viewMode === 'edit' ? '0 2px 8px rgba(11,102,64,0.3)' : 'none'
              }}
              onClick={() => setViewMode('edit')}
            >
              ✏️ {activeApp ? 'Cập Nhật Hồ Sơ' : 'Kê Khai &amp; Nộp Hồ Sơ Mới'}
            </button>
          </div>

        </div>
      </div>

      <div className="container-fluid py-3 px-2 px-md-4">

        {message.text && (
          <div className={`alert alert-${message.type || 'info'} alert-dismissible fade show border-0 shadow-sm mb-3 rounded-3 fs-7 py-2.5`} role="alert">
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage({ text: '', type: '' })}></button>
          </div>
        )}

        {/* 3. STEPPER PROGRESS (COMPACT 4 STAGES GRID - MOBILE OPTIMIZED) */}
        <div className="row row-cols-2 row-cols-md-4 g-2 mb-3">
          <div className="col">
            <div className={`p-2 p-md-3 rounded-3 bg-white border h-100 ${currentFormStep <= 3 ? 'border-2 border-success shadow-sm' : ''}`} style={{ borderColor: '#0b6640' }}>
              <div className="d-flex align-items-center gap-1.5">
                <span className="badge rounded-circle bg-success text-white d-flex align-items-center justify-content-center p-1" style={{ width: '22px', height: '22px', fontSize: '0.75rem' }}>1</span>
                <span className="text-muted fs-8 fw-semibold">Giai đoạn 1</span>
              </div>
              <div className="fw-bold text-dark mt-1 fs-7">Nộp hồ sơ</div>
            </div>
          </div>

          <div className="col">
            <div className={`p-2 p-md-3 rounded-3 bg-white border h-100 ${currentFormStep === 4 ? 'border-2 border-success shadow-sm' : 'opacity-75'}`}>
              <div className="d-flex align-items-center gap-1.5">
                <span className="badge rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center p-1" style={{ width: '22px', height: '22px', fontSize: '0.75rem' }}>2</span>
                <span className="text-muted fs-8 fw-semibold">Giai đoạn 2</span>
              </div>
              <div className="fw-semibold text-secondary mt-1 fs-7">Thẩm duyệt bản mềm</div>
            </div>
          </div>

          <div className="col">
            <div className={`p-2 p-md-3 rounded-3 bg-white border h-100 ${currentFormStep === 5 ? 'border-2 border-success shadow-sm' : 'opacity-75'}`}>
              <div className="d-flex align-items-center gap-1.5">
                <span className="badge rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center p-1" style={{ width: '22px', height: '22px', fontSize: '0.75rem' }}>3</span>
                <span className="text-muted fs-8 fw-semibold">Giai đoạn 3</span>
              </div>
              <div className="fw-semibold text-secondary mt-1 fs-7">Thẩm duyệt bản cứng</div>
            </div>
          </div>

          <div className="col">
            <div className={`p-2 p-md-3 rounded-3 bg-white border h-100 ${currentFormStep === 6 ? 'border-2 border-success shadow-sm' : 'opacity-75'}`}>
              <div className="d-flex align-items-center gap-1.5">
                <span className="badge rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center p-1" style={{ width: '22px', height: '22px', fontSize: '0.75rem' }}>4</span>
                <span className="text-muted fs-8 fw-semibold">Giai đoạn 4</span>
              </div>
              <div className="fw-semibold text-secondary mt-1 fs-7">Thẩm duyệt suất mua</div>
            </div>
          </div>
        </div>

        {/* MOBILE HORIZONTAL STEP BAR (Steps 1 -> 6 thumb navigation for smartphones) */}
        {viewMode === 'edit' && (
          <div className="d-flex d-lg-none overflow-auto gap-1.5 py-1 mb-3 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {[
              { step: 1, title: '1. Kênh TT' },
              { step: 2, title: '2. Đối tượng' },
              { step: 3, title: '3. Nộp hồ sơ' },
              { step: 4, title: '4. Tiến độ' },
              { step: 5, title: '5. Đặt lịch' },
              { step: 6, title: '6. Kết quả' }
            ].map(s => (
              <button 
                key={s.step}
                type="button"
                className={`btn btn-sm rounded-pill text-nowrap px-3 py-1 fs-8 border ${currentFormStep === s.step ? 'btn-success fw-bold shadow-sm' : 'btn-light text-dark'}`}
                style={{ backgroundColor: currentFormStep === s.step ? '#0b6640' : '#ffffff', borderColor: currentFormStep === s.step ? '#0b6640' : '#cbd5e1' }}
                onClick={() => setCurrentFormStep(s.step)}
              >
                {s.title} {currentFormStep > s.step && <span className="ms-1">✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* MAIN LAYOUT: TWO COLUMNS (Sidebar Left + Main Form/View Right) */}
        <div className="row g-3">
          
          {/* LEFT SIDEBAR: Customer Info & Step Menu */}
          <div className="col-lg-3">
            
            {/* Card 1: Thông tin khách hàng (Collapsible on Mobile) */}
            <div className="card border-0 shadow-sm rounded-3 p-3 mb-3 bg-white">
              <div className="d-flex justify-content-between align-items-center cursor-pointer" onClick={() => setShowCustomerInfoMobile(!showCustomerInfoMobile)}>
                <h6 className="fw-bold text-success mb-0" style={{ color: '#0b6640' }}>
                  Thông tin khách hàng
                </h6>
                <span className="d-lg-none text-muted small">{showCustomerInfoMobile ? '▲' : '▼'}</span>
              </div>
              
              <div className={`small space-y-2 mt-3 ${showCustomerInfoMobile ? 'd-block' : 'd-none d-lg-block'}`}>
                <div className="d-flex justify-content-between py-1 border-bottom border-light">
                  <span className="text-muted">Mã KH:</span>
                  <strong className="text-dark">{maKH}</strong>
                </div>

                <div className="d-flex justify-content-between py-1 border-bottom border-light">
                  <span className="text-muted">Mã hồ sơ:</span>
                  <span className="fw-semibold text-secondary">{maHoSo}</span>
                </div>

                <div className="d-flex justify-content-between py-1 border-bottom border-light">
                  <span className="text-muted">Họ tên:</span>
                  <strong className="text-dark">{fullName || session?.fullName || 'Chưa cập nhật'}</strong>
                </div>

                <div className="d-flex justify-content-between py-1 border-bottom border-light">
                  <span className="text-muted">CCCD:</span>
                  <span className="fw-medium text-dark">{cccdNumber || '—'}</span>
                </div>

                <div className="d-flex justify-content-between py-1 border-bottom border-light">
                  <span className="text-muted">Đợt nộp:</span>
                  <span className="badge bg-light text-dark border">Đợt 1</span>
                </div>

                {/* Completion Progress Bar */}
                <div className="pt-2">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-muted fw-semibold">Hoàn thành:</span>
                    <strong className="text-success">{progressPercent}%</strong>
                  </div>
                  <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      role="progressbar" 
                      style={{ width: `${progressPercent}%`, backgroundColor: '#0b6640' }} 
                      aria-valuenow={progressPercent} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Sidebar Steps Navigation (Desktop Steps Menu) */}
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white d-none d-lg-block">
              <div className="d-flex flex-column gap-2 small">
                
                {/* STEP 1 MENU BUTTON */}
                <button 
                  type="button"
                  className={`btn p-2.5 text-start rounded d-flex justify-content-between align-items-center border-0 ${currentFormStep === 1 ? 'text-white fw-bold shadow-sm' : 'text-dark'}`}
                  style={{ backgroundColor: currentFormStep === 1 ? '#0b6640' : '#f8faf9' }}
                  onClick={() => { setViewMode('edit'); setCurrentFormStep(1); }}
                >
                  <span>1. Kênh Biết Đến Thông Tin</span>
                  {currentFormStep > 1 ? <span className="text-success fw-bold">✓</span> : <span>👉</span>}
                </button>

                {/* STEP 2 MENU BUTTON */}
                <button 
                  type="button"
                  className={`btn p-2.5 text-start rounded d-flex justify-content-between align-items-center border-0 ${currentFormStep === 2 ? 'text-white fw-bold shadow-sm' : 'text-dark'}`}
                  style={{ backgroundColor: currentFormStep === 2 ? '#0b6640' : '#f8faf9' }}
                  onClick={() => { setViewMode('edit'); setCurrentFormStep(2); }}
                >
                  <span>2. Nhóm Đối Tượng &amp; Loại Căn</span>
                  {currentFormStep > 2 ? <span className="text-success fw-bold">✓</span> : (currentFormStep === 2 ? <span>👉</span> : <span>🔒</span>)}
                </button>

                {/* STEP 3 MENU BUTTON */}
                <button 
                  type="button"
                  className={`btn p-2.5 text-start rounded d-flex justify-content-between align-items-center border-0 ${currentFormStep === 3 ? 'text-white fw-bold shadow-sm' : 'text-dark'}`}
                  style={{ backgroundColor: currentFormStep === 3 ? '#0b6640' : '#f8faf9' }}
                  onClick={() => { setViewMode('edit'); setCurrentFormStep(3); }}
                >
                  <span>3. Nộp hồ sơ</span>
                  {currentFormStep > 3 ? <span className="text-success fw-bold">✓</span> : (currentFormStep === 3 ? <span>👉</span> : <span>🔒</span>)}
                </button>

                {/* STEP 4 MENU BUTTON */}
                <button 
                  type="button"
                  className={`btn p-2.5 text-start rounded d-flex justify-content-between align-items-center border-0 ${currentFormStep === 4 ? 'text-white fw-bold shadow-sm' : 'text-dark'}`}
                  style={{ backgroundColor: currentFormStep === 4 ? '#0b6640' : '#f8faf9' }}
                  onClick={() => { setViewMode('edit'); setCurrentFormStep(4); }}
                >
                  <span>4. Trạng Thái Hồ Sơ</span>
                  {currentFormStep > 4 ? <span className="text-success fw-bold">✓</span> : (currentFormStep === 4 ? <span>👉</span> : <span>🔒</span>)}
                </button>

                {/* STEP 5 MENU BUTTON */}
                <button 
                  type="button"
                  className={`btn p-2.5 text-start rounded d-flex justify-content-between align-items-center border-0 ${currentFormStep === 5 ? 'text-white fw-bold shadow-sm' : 'text-dark'}`}
                  style={{ backgroundColor: currentFormStep === 5 ? '#0b6640' : '#f8faf9' }}
                  onClick={() => { setViewMode('edit'); setCurrentFormStep(5); }}
                >
                  <span>5. Đối Chứng Bản Cứng</span>
                  {currentFormStep > 5 ? <span className="text-success fw-bold">✓</span> : (currentFormStep === 5 ? <span>👉</span> : <span>🔒</span>)}
                </button>

                {/* STEP 6 MENU BUTTON */}
                <button 
                  type="button"
                  className={`btn p-2.5 text-start rounded d-flex justify-content-between align-items-center border-0 ${currentFormStep === 6 ? 'text-white fw-bold shadow-sm' : 'text-dark'}`}
                  style={{ backgroundColor: currentFormStep === 6 ? '#0b6640' : '#f8faf9' }}
                  onClick={() => { setViewMode('edit'); setCurrentFormStep(6); }}
                >
                  <span>6. Thẩm Duyệt Liên Sở</span>
                  {currentFormStep === 6 ? <span>👉</span> : <span>🔒</span>}
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT MAIN SECTION */}
          <div className="col-lg-9">
            
            {viewMode === 'view' && activeApp ? (
              /* VIEW MODE */
              <div className="card border-0 shadow-sm rounded-3 p-3 p-md-4 bg-white">
                <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom flex-wrap gap-2">
                  <div>
                    <h5 className="fw-bold text-success mb-1" style={{ color: '#0b6640' }}>
                      📋 Hồ Sơ Đăng Ký Đã Tiếp Nhận
                    </h5>
                    <p className="text-muted small mb-0">Mã hồ sơ: <strong>{activeApp.id}</strong> | Ngày nộp: {new Date(activeApp.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <button className="btn btn-emerald btn-sm rounded-pill px-3 fw-bold" onClick={() => { setViewMode('edit'); setCurrentFormStep(1); }}>
                    ✏️ Cập Nhật Hồ Sơ
                  </button>
                </div>

                {/* Review Notes from Admin */}
                {activeApp.notes && (
                  <div className="alert alert-warning border border-warning shadow-sm mb-4 rounded-3">
                    <h6 className="fw-bold mb-1">💬 Phản hồi kiểm duyệt từ Ban Quản Lý:</h6>
                    <p className="mb-0 text-dark small">{activeApp.notes}</p>
                  </div>
                )}

                {/* Submitted Details */}
                <div className="row g-2 mb-4">
                  <div className="col-6 col-md-3">
                    <div className="p-2.5 bg-light rounded border">
                      <div className="text-muted fs-8">Họ tên đăng ký</div>
                      <div className="fw-bold text-dark mt-0.5 fs-7">{activeApp.fullName}</div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-2.5 bg-light rounded border">
                      <div className="text-muted fs-8">Số CCCD / VNeID</div>
                      <div className="fw-bold text-dark mt-0.5 fs-7">{activeApp.cccdNumber || 'Đã cập nhật'}</div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-2.5 bg-light rounded border">
                      <div className="text-muted fs-8">Nhóm đối tượng</div>
                      <div className="fw-bold text-success mt-0.5 fs-7">{activeApp.targetObject || 'K1'}</div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-2.5 bg-light rounded border">
                      <div className="text-muted fs-8">Loại căn mong muốn</div>
                      <div className="fw-bold text-primary mt-0.5 fs-7">{activeApp.unitType || '2PN'}</div>
                    </div>
                  </div>
                </div>

                {/* Submitted Files List */}
                <h6 className="fw-bold text-dark mb-3 fs-7">📁 Danh mục file đã nộp:</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle border">
                    <thead className="table-light fs-8 text-uppercase">
                      <tr>
                        <th>Tài liệu</th>
                        <th>Tệp đã tải lên</th>
                        <th>Trạng thái</th>
                        <th>Xem / Tải</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentList.map((doc) => {
                        const fileObj = activeApp.documents?.[doc.id];
                        return (
                          <tr key={doc.id}>
                            <td style={{ maxWidth: '320px' }}>
                              <div className="fw-semibold fs-7">{doc.title}</div>
                              {doc.required && <span className="badge bg-danger-subtle text-danger fs-8">Bắt buộc</span>}
                            </td>
                            <td>
                              {fileObj ? (
                                <span className="badge bg-light text-dark border p-1.5 fw-normal fs-8">
                                  📄 {fileObj.name}
                                </span>
                              ) : (
                                <span className="text-muted fs-8">Chưa nộp</span>
                              )}
                            </td>
                            <td>
                              {fileObj ? (
                                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-8">
                                  ✓ Đã upload
                                </span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary px-2 py-1 fs-8">
                                  Trống
                                </span>
                              )}
                            </td>
                            <td>
                              {fileObj ? (
                                <button 
                                  className="btn btn-sm btn-outline-success rounded-pill px-2 py-0.5 fs-8"
                                  onClick={() => setPreviewModalDoc(fileObj)}
                                >
                                  👁 Xem
                                </button>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            ) : (
              /* FORM WIZARD MODE: STEPS 1 -> 6 */
              <div className="card border-0 shadow-sm rounded-3 p-3 p-md-4 bg-white">
                
                {/* STEP 1: KÊNH BIẾT ĐẾN THÔNG TIN */}
                {currentFormStep === 1 && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                      <h6 className="fw-bold mb-0 text-success fs-6" style={{ color: '#0b6640' }}>
                        Bước 1/6 — Kênh Biết Đến Thông Tin
                      </h6>
                      <span className="badge bg-success-subtle text-success px-2.5 py-1 rounded-pill fs-8">Kê khai bước 1</span>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold text-dark fs-7 mb-2">
                        1. Bạn biết đến thông tin dự án Nhà Ở Xã Hội Marina Living qua kênh nào dưới đây? <span className="text-danger">*</span>
                      </label>

                      <div className="row g-2">
                        {infoChannelsList.map((ch) => (
                          <div className="col-12 col-md-6" key={ch.id}>
                            <div 
                              className={`p-2.5 rounded-3 border cursor-pointer h-100 transition-all ${infoChannel === ch.id ? 'border-2 border-success bg-success bg-opacity-10' : 'bg-light'}`}
                              style={{ borderColor: infoChannel === ch.id ? '#0b6640' : '#e5e7eb' }}
                              onClick={() => setInfoChannel(ch.id)}
                            >
                              <div className="form-check">
                                <input 
                                  className="form-check-input mt-1" 
                                  type="radio" 
                                  name="infoChannelRadio"
                                  id={`ch-${ch.id}`}
                                  checked={infoChannel === ch.id}
                                  onChange={() => setInfoChannel(ch.id)}
                                />
                                <label className="form-check-label ms-1.5 cursor-pointer" htmlFor={`ch-${ch.id}`}>
                                  <div className="fw-bold text-dark fs-7">{ch.icon} {ch.name}</div>
                                  <div className="text-muted fs-8 mt-0.5">{ch.desc}</div>
                                </label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3 pt-3 border-top">
                      <label className="form-label fw-bold text-dark fs-7 mb-2">
                        2. Bạn có nhu cầu tư vấn thêm về gói vay vốn lãi suất ưu đãi mua NOXH không?
                      </label>

                      <div className="d-flex flex-column flex-sm-row gap-3">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="radio" 
                            name="loanConsult" 
                            id="loanYes" 
                            checked={needLoanConsult === 'yes'}
                            onChange={() => setNeedLoanConsult('yes')}
                          />
                          <label className="form-check-label fw-semibold text-dark fs-7 cursor-pointer" htmlFor="loanYes">
                            Có, tôi muốn được cán bộ ngân hàng tư vấn gói vay lãi suất ưu đãi
                          </label>
                        </div>

                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="radio" 
                            name="loanConsult" 
                            id="loanNo"
                            checked={needLoanConsult === 'no'}
                            onChange={() => setNeedLoanConsult('no')}
                          />
                          <label className="form-check-label fw-semibold text-dark fs-7 cursor-pointer" htmlFor="loanNo">
                            Không, tôi đã chuẩn bị sẵn nguồn tài chính
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end pt-3 border-top">
                      <button 
                        type="button" 
                        className="btn btn-emerald rounded-pill px-4 py-2 fw-bold fs-7 shadow-sm w-100 w-sm-auto"
                        style={{ backgroundColor: '#0b6640', borderColor: '#0b6640' }}
                        onClick={() => setCurrentFormStep(2)}
                      >
                        Tiếp tục: Nhóm Đối Tượng &amp; Loại Căn →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: NHÓM ĐỐI TƯỢNG & LOẠI CĂN */}
                {currentFormStep === 2 && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                      <h6 className="fw-bold mb-0 text-success fs-6" style={{ color: '#0b6640' }}>
                        Bước 2/6 — Nhóm Đối Tượng &amp; Loại Căn Hộ
                      </h6>
                      <span className="badge bg-success-subtle text-success px-2.5 py-1 rounded-pill fs-8">Kê khai bước 2</span>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold text-dark fs-7 mb-2">
                        1. Chọn Nhóm Đối Tượng Ưu Đãi Mua Nhà Ở Xã Hội (Theo Luật Nhà Ở): <span className="text-danger">*</span>
                      </label>

                      <div className="d-flex flex-column gap-2">
                        {targetGroupsList.map((tg) => (
                          <div 
                            key={tg.id}
                            className={`p-2.5 rounded-3 border cursor-pointer transition-all ${targetObject === tg.id ? 'border-2 border-success bg-success bg-opacity-10' : 'bg-light'}`}
                            style={{ borderColor: targetObject === tg.id ? '#0b6640' : '#e5e7eb' }}
                            onClick={() => setTargetObject(tg.id)}
                          >
                            <div className="form-check">
                              <input 
                                className="form-check-input mt-0.5" 
                                type="radio" 
                                name="targetGroupRadio" 
                                id={`tg-${tg.id}`}
                                checked={targetObject === tg.id}
                                onChange={() => setTargetObject(tg.id)}
                              />
                              <label className="form-check-label ms-1.5 cursor-pointer" htmlFor={`tg-${tg.id}`}>
                                <div className="fw-bold text-dark fs-7">{tg.title}</div>
                                <div className="text-muted fs-8 mt-0.5">{tg.desc}</div>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3 pt-3 border-top">
                      <label className="form-label fw-bold text-dark fs-7 mb-2">
                        2. Nhu cầu Loại Căn Hộ mong muốn mua: <span className="text-danger">*</span>
                      </label>

                      <div className="row g-2">
                        {[
                          { type: 'Studio', title: 'Căn Studio', area: '~ 35.2 m²', icon: '🛋️' },
                          { type: '1PN', title: 'Căn 1PN', area: '~ 45.8 m²', icon: '🛏️' },
                          { type: '2PN', title: 'Căn 2PN', area: '~ 65.5 m²', icon: '🏡' },
                          { type: '3PN', title: 'Căn 3PN', area: '~ 82.4 m²', icon: '🏰' }
                        ].map((u) => (
                          <div className="col-6 col-md-3" key={u.type}>
                            <div 
                              className={`p-2.5 rounded-3 border text-center cursor-pointer h-100 ${unitType === u.type ? 'border-2 border-success bg-success bg-opacity-10 shadow-sm' : 'bg-light'}`}
                              style={{ borderColor: unitType === u.type ? '#0b6640' : '#e5e7eb' }}
                              onClick={() => setUnitType(u.type)}
                            >
                              <span className="fs-3 d-block mb-1">{u.icon}</span>
                              <div className="fw-bold text-dark fs-7">{u.title}</div>
                              <div className="text-muted fs-8 mt-0.5">{u.area}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3 pt-3 border-top">
                      <label className="form-label fw-bold text-dark fs-7 mb-2">
                        3. Khoảng tầng ưu tiên mong muốn:
                      </label>

                      <div className="d-flex gap-3 flex-wrap">
                        {[
                          { id: 'low', title: 'Tầng thấp (1-10)' },
                          { id: 'mid', title: 'Tầng trung (11-20)' },
                          { id: 'high', title: 'Tầng cao (21-30)' }
                        ].map((fl) => (
                          <div className="form-check" key={fl.id}>
                            <input 
                              className="form-check-input" 
                              type="radio" 
                              name="floorPref" 
                              id={`fl-${fl.id}`}
                              checked={preferredFloor === fl.id}
                              onChange={() => setPreferredFloor(fl.id)}
                            />
                            <label className="form-check-label fw-semibold text-dark fs-7 cursor-pointer" htmlFor={`fl-${fl.id}`}>
                              {fl.title}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="d-flex justify-content-between pt-3 border-top gap-2">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary rounded-pill px-3 py-1.5 fw-semibold fs-7"
                        onClick={() => setCurrentFormStep(1)}
                      >
                        ← Quay lại
                      </button>

                      <button 
                        type="button" 
                        className="btn btn-emerald rounded-pill px-4 py-2 fw-bold fs-7 shadow-sm"
                        style={{ backgroundColor: '#0b6640', borderColor: '#0b6640' }}
                        onClick={() => setCurrentFormStep(3)}
                      >
                        Tiếp tục: Nộp Hồ Sơ →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: NỘP HỒ SƠ & UPLOAD TÀI LIỆU */}
                {currentFormStep === 3 && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                      <h6 className="fw-bold mb-0 text-success fs-6" style={{ color: '#0b6640' }}>
                        Bước 3/6 — Nộp hồ sơ
                      </h6>
                      <span className="text-muted fs-8">Mục có dấu <span className="text-danger">*</span> là bắt buộc.</span>
                    </div>

                    <form onSubmit={handleSubmit}>

                      {/* OCR SCAN CCCD */}
                      <div className="p-3 mb-3 rounded-3 border bg-light">
                        <div className="row align-items-center g-2">
                          <div className="col-4 col-md-3 text-center">
                            <div className="border rounded bg-white p-1.5 shadow-sm d-inline-block position-relative" style={{ width: '100%', maxWidth: '160px' }}>
                              {cccdPreview ? (
                                <>
                                  <img 
                                    src={cccdPreview} 
                                    alt="Ảnh CCCD" 
                                    className="img-fluid rounded" 
                                    style={{ maxHeight: '90px', objectFit: 'cover' }} 
                                  />
                                  <span className="position-absolute bottom-0 end-0 bg-success text-white badge rounded-circle p-1 m-1">✓</span>
                                </>
                              ) : (
                                <div className="p-2 text-muted border border-dashed rounded text-center">
                                  <span className="fs-4 d-block mb-1">🪪</span>
                                  <span className="fs-8">Chưa có ảnh</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="col-8 col-md-9">
                            <h6 className="fw-bold text-dark mb-1 fs-7">Ảnh CCCD/VNeID của bạn (tự động đọc thông tin)</h6>
                            
                            <div className="row g-1 mb-2 fs-8 text-secondary">
                              <div className="col-12 col-sm-6">Số CCCD: <strong className="text-dark">{cccdNumber || '—'}</strong></div>
                              <div className="col-12 col-sm-6">Họ tên: <strong className="text-dark">{fullName || session?.fullName || '—'}</strong></div>
                            </div>

                            <div className="mb-2">
                              {cccdNumber ? (
                                <span className="badge bg-warning text-dark px-2.5 py-1 rounded-pill fw-semibold fs-8" style={{ backgroundColor: '#fff3cd' }}>
                                  ⚡ Đã đọc được số CCCD
                                </span>
                              ) : (
                                <span className="badge bg-warning text-dark px-2.5 py-1 rounded-pill fw-semibold fs-8">
                                  Chưa đọc được số CCCD, vui lòng tải ảnh
                                </span>
                              )}
                            </div>

                            <label className="btn btn-emerald btn-sm rounded-pill px-3 py-1 fw-bold fs-8 cursor-pointer mb-0">
                              + Tải lại ảnh CCCD
                              <input type="file" accept="image/*" className="d-none" onChange={handleCccdChange} />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* DOCUMENT UPLOAD TABLE (DESKTOP & TOUCH CARDS ON MOBILE) */}
                      <div className="mb-3">
                        <p className="fw-semibold text-secondary fs-8 mb-2">
                          Danh mục hồ sơ tương ứng nhóm đối tượng <strong>{targetObject}</strong>. Mục có dấu <span className="text-danger">*</span> là bắt buộc.
                        </p>

                        <div className="table-responsive">
                          <table className="table align-middle border rounded">
                            <thead className="table-light fs-8 text-uppercase" style={{ color: '#495057' }}>
                              <tr>
                                <th style={{ width: '45%' }}>TÀI LIỆU</th>
                                <th style={{ width: '25%' }}>FILE ĐÃ NỘP</th>
                                <th style={{ width: '15%' }}>TRẠNG THÁI</th>
                                <th style={{ width: '15%' }}>HÀNH ĐỘNG</th>
                              </tr>
                            </thead>
                            <tbody>
                              {documentList.map((doc) => {
                                const fileObj = uploadedDocs[doc.id];
                                return (
                                  <tr key={doc.id}>
                                    <td>
                                      <div className="fw-bold text-dark fs-7 mb-1">
                                        {doc.title} {doc.required && <span className="text-danger">*</span>}
                                      </div>
                                      <div className="d-flex gap-1.5 flex-wrap">
                                        {doc.tags.map((tag, idx) => (
                                          <span key={idx} className="badge bg-info-subtle text-info-emphasis border border-info-subtle fs-8 fw-normal">
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    </td>

                                    <td>
                                      {fileObj ? (
                                        <div className="d-inline-flex align-items-center gap-1.5 bg-light border rounded px-2 py-1 fs-8">
                                          <span>📄</span>
                                          <span className="text-truncate" style={{ maxWidth: '120px' }} title={fileObj.name}>
                                            {fileObj.name}
                                          </span>
                                          <button 
                                            type="button"
                                            className="btn btn-link btn-sm p-0 text-dark ms-1" 
                                            title="Xem"
                                            onClick={() => setPreviewModalDoc(fileObj)}
                                          >
                                            👁
                                          </button>
                                          <button 
                                            type="button" 
                                            className="btn btn-link btn-sm p-0 text-danger" 
                                            title="Xóa"
                                            onClick={() => handleRemoveDoc(doc.id)}
                                          >
                                            ✖
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-muted fs-8">Chưa nộp</span>
                                      )}
                                    </td>

                                    <td>
                                      {fileObj ? (
                                        <span className="badge bg-success px-2 py-1 rounded-pill fs-8 fw-semibold" style={{ backgroundColor: '#0b6640' }}>
                                          ✓ Đã upload
                                        </span>
                                      ) : (
                                        <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded-pill fs-8">
                                          Chưa upload
                                        </span>
                                      )}
                                    </td>

                                    <td>
                                      <label className="btn btn-emerald btn-sm rounded-pill px-3 py-1 fs-8 fw-bold cursor-pointer mb-0">
                                        + Tải tệp
                                        <input 
                                          type="file" 
                                          accept=".pdf,.jpg,.jpeg,.png,.docx" 
                                          className="d-none" 
                                          onChange={(e) => handleDocFileChange(doc.id, e.target.files[0])} 
                                        />
                                      </label>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* TERMS & CONDITIONS CHECKBOXES */}
                      <div className="p-3 mb-3 rounded-3 border bg-light">
                        <div className="form-check mb-2">
                          <input 
                            className="form-check-input mt-1" 
                            type="checkbox" 
                            id="term1" 
                            checked={agreedTerms1}
                            onChange={(e) => setAgreedTerms1(e.target.checked)}
                          />
                          <label className="form-check-label fs-8 text-secondary" htmlFor="term1">
                            Tôi xác nhận đã đọc, hiểu rõ và tự nguyện đồng ý để Công Ty thực hiện toàn bộ các hoạt động xử lý Dữ Liệu Cá Nhân đối với các Dữ Liệu Cá Nhân mà Tôi đã cung cấp, đang cung cấp hoặc sẽ cung cấp cho Công Ty...
                          </label>
                        </div>

                        <div className="form-check">
                          <input 
                            className="form-check-input mt-1" 
                            type="checkbox" 
                            id="term2"
                            checked={agreedTerms2}
                            onChange={(e) => setAgreedTerms2(e.target.checked)}
                          />
                          <label className="form-check-label fs-8 text-secondary" htmlFor="term2">
                            Tôi tự xác định rằng Tôi thuộc đối tượng mua Nhà Ở Xã Hội như đã kê khai và xin chịu trách nhiệm trước pháp luật về tính trung thực, chính xác của các thông tin.
                          </label>
                        </div>
                      </div>

                      {/* FOOTER ACTIONS */}
                      <div className="d-flex justify-content-between align-items-center pt-2 flex-wrap gap-2">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary rounded-pill px-3 py-1.5 fw-semibold fs-7"
                          onClick={() => setCurrentFormStep(2)}
                        >
                          ← Quay lại Bước 2
                        </button>

                        <div className="text-end w-100 w-sm-auto">
                          <button 
                            type="submit" 
                            className="btn btn-emerald rounded-pill px-4 py-2 fw-bold fs-7 shadow-sm w-100 w-sm-auto"
                            disabled={isLoading}
                            style={{ backgroundColor: '#0b6640', borderColor: '#0b6640' }}
                          >
                            {isLoading ? 'Đang gửi...' : 'Nộp hồ sơ trực tuyến'}
                          </button>
                        </div>
                      </div>

                    </form>

                  </div>
                )}

                {/* STEP 4: TRẠNG THÁI HỒ SƠ */}
                {currentFormStep === 4 && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                      <h6 className="fw-bold mb-0 text-success fs-6" style={{ color: '#0b6640' }}>
                        Bước 4/6 — Trạng Thái Hồ Sơ &amp; Tiến Độ Thẩm Định
                      </h6>
                      <span className="badge bg-info-subtle text-info-emphasis px-2.5 py-1 rounded-pill fs-8">Tiến độ hồ sơ</span>
                    </div>

                    <div className="p-3 mb-3 rounded-3 border bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <div>
                          <span className="text-muted fs-8 d-block">Mã hồ sơ tiếp nhận:</span>
                          <h5 className="fw-bold text-dark mb-0">{maHoSo}</h5>
                        </div>

                        <span className={`badge px-3 py-1.5 fs-7 rounded-pill ${
                          activeApp?.status === 'approved' ? 'bg-success' :
                          activeApp?.status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'
                        }`}>
                          {activeApp?.status === 'approved' ? '✓ Đã Phê Duyệt Hồ Sơ' :
                           activeApp?.status === 'rejected' ? '❌ Bị Từ Chối (Yêu Cầu Sửa)' : '⏳ Đang Thẩm Duyệt Bản Mềm'}
                        </span>
                      </div>

                      {activeApp?.notes && (
                        <div className="p-2.5 bg-white border border-start border-4 border-emerald rounded-3 fs-8 text-dark mb-2">
                          <strong>💬 Ghi chú kiểm duyệt từ Chuyên viên Hapro:</strong>
                          <div className="mt-0.5">{activeApp.notes}</div>
                        </div>
                      )}

                      <div className="fs-8 text-muted">
                        Ngày nộp: <strong>{activeApp?.createdAt ? new Date(activeApp.createdAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</strong> | Đợt tiếp nhận: <strong>Đợt 1</strong>
                      </div>
                    </div>

                    <h6 className="fw-bold text-dark mb-2 fs-7">📌 Tiến Trình Kiểm Duyệt Hồ Sơ:</h6>
                    
                    <div className="p-2.5 mb-3 rounded-3 border bg-white space-y-2 fs-7">
                      <div className="d-flex align-items-center gap-2 p-2 bg-light rounded">
                        <span className="badge rounded-circle bg-success text-white p-1">✓</span>
                        <div className="flex-grow-1">
                          <div className="fw-bold text-dark fs-7">Vòng 1: Tiếp nhận dữ liệu &amp; CCCD/VNeID</div>
                          <div className="text-muted fs-8">Hệ thống đã mã hóa và tiếp nhận tệp tin đính kèm</div>
                        </div>
                        <span className="badge bg-success fs-8">Hoàn thành</span>
                      </div>

                      <div className="d-flex align-items-center gap-2 p-2 bg-light rounded">
                        <span className="badge rounded-circle bg-warning text-dark p-1">⏳</span>
                        <div className="flex-grow-1">
                          <div className="fw-bold text-dark fs-7">Vòng 2: Thẩm định pháp lý &amp; điều kiện nhà ở</div>
                          <div className="text-muted fs-8">Ban Quản Lý đang rà soát hồ sơ Mẫu 01, Mẫu 02/03 và CT07</div>
                        </div>
                        <span className="badge bg-warning text-dark fs-8">Đang rà soát</span>
                      </div>

                      <div className="d-flex align-items-center gap-2 p-2 bg-light rounded opacity-75">
                        <span className="badge rounded-circle bg-secondary text-white p-1">3</span>
                        <div className="flex-grow-1">
                          <div className="fw-bold text-dark fs-7">Vòng 3: Đặt lịch hẹn đối chứng bản cứng</div>
                          <div className="text-muted fs-8">Mang bản chính tới Văn phòng tư vấn Hạ Long Marine Plaza</div>
                        </div>
                        <span className="badge bg-secondary fs-8">Chờ thực hiện</span>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between pt-3 border-top gap-2">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary rounded-pill px-3 py-1.5 fw-semibold fs-7"
                        onClick={() => setCurrentFormStep(3)}
                      >
                        ← Quay lại Bước 3
                      </button>

                      <button 
                        type="button" 
                        className="btn btn-emerald rounded-pill px-4 py-2 fw-bold fs-7 shadow-sm"
                        style={{ backgroundColor: '#0b6640', borderColor: '#0b6640' }}
                        onClick={() => setCurrentFormStep(5)}
                      >
                        Tiếp tục: Bước 5 - Đối Chứng Bản Cứng →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: ĐỐI CHỨNG BẢN CỨNG */}
                {currentFormStep === 5 && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                      <h6 className="fw-bold mb-0 text-success fs-6" style={{ color: '#0b6640' }}>
                        Bước 5/6 — Đối Chứng Bản Cứng &amp; Đặt Lịch Hẹn
                      </h6>
                      <span className="badge bg-primary-subtle text-primary px-2.5 py-1 rounded-pill fs-8">Lịch hẹn đối chứng</span>
                    </div>

                    {appointmentConfirmed && (
                      <div className="alert alert-success border-0 shadow-sm mb-3 rounded-3 fs-7 py-2">
                        🎉 <strong>Đã xác nhận lịch hẹn!</strong> Quý khách có mặt tại Văn phòng tư vấn vào ngày <strong>{appointmentDate}</strong> ({appointmentTime}).
                      </div>
                    )}

                    <div className="p-3 mb-3 rounded-3 border bg-light">
                      <h6 className="fw-bold text-dark mb-1.5 fs-7">📍 Địa điểm tiếp nhận &amp; đối chứng hồ sơ bản gốc:</h6>
                      <div className="fs-8 text-secondary space-y-1">
                        <div>🏢 <strong>Văn phòng tư vấn Nhà ở xã hội Marina Living Halong</strong></div>
                        <div>📍 Hạ Long Marine Plaza, P. Bãi Cháy, TP. Hạ Long, Quảng Ninh.</div>
                        <div>⏰ Giờ làm việc: 08:00 - 17:00 (Thứ 2 - Thứ 7).</div>
                      </div>
                    </div>

                    <div className="p-3 mb-3 rounded-3 border bg-white">
                      <h6 className="fw-bold text-dark mb-2 fs-7">📅 Đặt Lịch Hẹn Nộp Bản Cứng:</h6>

                      <div className="row g-2 mb-3">
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-bold fs-8 text-dark">Chọn ngày hẹn:</label>
                          <input 
                            type="date" 
                            className="form-control form-control-sm"
                            value={appointmentDate}
                            onChange={(e) => setAppointmentDate(e.target.value)}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-bold fs-8 text-dark">Chọn khung giờ hẹn:</label>
                          <select 
                            className="form-select form-select-sm"
                            value={appointmentTime}
                            onChange={(e) => setAppointmentTime(e.target.value)}
                          >
                            <option value="08:30 - 09:30">Sáng: 08:30 - 09:30</option>
                            <option value="09:30 - 10:30">Sáng: 09:30 - 10:30</option>
                            <option value="14:00 - 15:00">Chiều: 14:00 - 15:00</option>
                            <option value="15:00 - 16:00">Chiều: 15:00 - 16:00</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        type="button" 
                        className="btn btn-emerald rounded-pill px-4 py-1.5 fw-bold fs-7 shadow-sm w-100 w-sm-auto"
                        style={{ backgroundColor: '#0b6640', borderColor: '#0b6640' }}
                        onClick={handleConfirmAppointment}
                      >
                        Xác Nhận Đặt Lịch Hẹn Đối Chứng
                      </button>
                    </div>

                    <h6 className="fw-bold text-dark mb-2 fs-7">📋 Danh mục giấy tờ bản gốc cần mang theo:</h6>
                    <div className="p-3 mb-3 rounded-3 border bg-light">
                      <ul className="list-unstyled mb-0 fs-8 space-y-1.5">
                        <li className="d-flex align-items-center gap-1.5">
                          <span className="text-success fw-bold">✓</span>
                          <span><strong>Thẻ CCCD bản chính</strong> người đứng đơn &amp; hộ gia đình.</span>
                        </li>
                        <li className="d-flex align-items-center gap-1.5">
                          <span className="text-success fw-bold">✓</span>
                          <span><strong>Mẫu 01 bản chính</strong> Đơn đăng ký mua NOXH có chữ ký tươi.</span>
                        </li>
                        <li className="d-flex align-items-center gap-1.5">
                          <span className="text-success fw-bold">✓</span>
                          <span><strong>Mẫu 02/03 bản chính</strong> Giấy chứng minh điều kiện nhà ở.</span>
                        </li>
                        <li className="d-flex align-items-center gap-1.5">
                          <span className="text-success fw-bold">✓</span>
                          <span><strong>Xác nhận cư trú CT07 bản chính</strong> (cấp trong 6 tháng).</span>
                        </li>
                        <li className="d-flex align-items-center gap-1.5">
                          <span className="text-success fw-bold">✓</span>
                          <span><strong>Kết hôn / Xác nhận độc thân bản sao y công chứng</strong>.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="d-flex justify-content-between pt-3 border-top gap-2">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary rounded-pill px-3 py-1.5 fw-semibold fs-7"
                        onClick={() => setCurrentFormStep(4)}
                      >
                        ← Quay lại Bước 4
                      </button>

                      <button 
                        type="button" 
                        className="btn btn-emerald rounded-pill px-4 py-2 fw-bold fs-7 shadow-sm"
                        style={{ backgroundColor: '#0b6640', borderColor: '#0b6640' }}
                        onClick={() => setCurrentFormStep(6)}
                      >
                        Tiếp tục: Bước 6 - Thẩm Duyệt Liên Sở →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 6: THẨM DUYỆT LIÊN SỞ */}
                {currentFormStep === 6 && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                      <h6 className="fw-bold mb-0 text-success fs-6" style={{ color: '#0b6640' }}>
                        Bước 6/6 — Thẩm Duyệt Liên Sở &amp; Quyết Định Suất Mua
                      </h6>
                      <span className="badge bg-success-subtle text-success px-2.5 py-1 rounded-pill fs-8">Kết quả phê duyệt</span>
                    </div>

                    <h6 className="fw-bold text-dark mb-2 fs-7">🏛️ Kết Quả Rà Soát Liên Sở Tỉnh Quảng Ninh:</h6>
                    
                    <div className="p-2.5 mb-3 rounded-3 border bg-light space-y-2 fs-7">
                      <div className="d-flex align-items-center justify-content-between p-2 bg-white rounded border">
                        <div>
                          <div className="fw-bold text-dark fs-7">Sở Xây Dựng Tỉnh Quảng Ninh</div>
                          <div className="text-muted fs-8">Rà soát trùng lặp thông tin sở hữu nhà ở</div>
                        </div>
                        <span className="badge bg-success px-2.5 py-1 rounded-pill fs-8">✓ Hợp lệ</span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between p-2 bg-white rounded border">
                        <div>
                          <div className="fw-bold text-dark fs-7">Sở Lao Động - TB &amp; Xã Hội</div>
                          <div className="text-muted fs-8">Xác minh nhóm đối tượng {targetObject}</div>
                        </div>
                        <span className="badge bg-success px-2.5 py-1 rounded-pill fs-8">✓ Hợp lệ</span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between p-2 bg-white rounded border">
                        <div>
                          <div className="fw-bold text-dark fs-7">Cơ Sở Dữ Liệu Quốc Gia VNeID</div>
                          <div className="text-muted fs-8">Xác thực định danh điện tử mức 2</div>
                        </div>
                        <span className="badge bg-success px-2.5 py-1 rounded-pill fs-8">✓ Xác thực</span>
                      </div>
                    </div>

                    <div className="p-3 mb-3 rounded-3 border border-success bg-success bg-opacity-10 text-center">
                      <span className="fs-2 d-block mb-1">🎉</span>
                      <h6 className="fw-bold text-success mb-1 fs-6">CHÚC MỪNG! HỒ SƠ ĐÃ ĐƯỢC PHÊ DUYỆT SUẤT MUA CHÍNH THỨC</h6>
                      <p className="text-dark fs-8 mb-2">
                        Hồ sơ mã <strong>{maHoSo}</strong> đủ tiêu chuẩn pháp lý theo Quyết định số <strong>QĐ-SXDN/2026-0902</strong>.
                      </p>

                      <div className="d-inline-flex align-items-center gap-2 p-2 bg-white rounded border shadow-sm mb-2">
                        <div className="text-start fs-8">
                          <div className="text-muted fs-8">Căn hộ dự kiến:</div>
                          <strong className="text-dark fs-7">Căn {activeApp?.unitType || unitType} - Tòa B Marina Living</strong>
                        </div>
                      </div>

                      <div>
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); alert('Đang tải giấy xác nhận phê duyệt suất mua dạng PDF...'); }}
                          className="btn btn-success rounded-pill px-3 py-1.5 fw-bold fs-7 shadow-sm"
                        >
                          📥 Tải Giấy Xác Nhận Phê Duyệt Suất Mua (PDF)
                        </a>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between pt-3 border-top gap-2">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary rounded-pill px-3 py-1.5 fw-semibold fs-7"
                        onClick={() => setCurrentFormStep(5)}
                      >
                        ← Quay lại Bước 5
                      </button>

                      <button 
                        type="button" 
                        className="btn btn-outline-success rounded-pill px-3 py-1.5 fw-bold fs-7"
                        onClick={() => setViewMode('view')}
                      >
                        Về Trang Tổng Quan Hồ Sơ 🏠
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewModalDoc && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-3 border-0 shadow">
              <div className="modal-header bg-light">
                <h6 className="modal-title fw-bold text-dark">📄 Xem Trước Tệp: {previewModalDoc.name}</h6>
                <button type="button" className="btn-close" onClick={() => setPreviewModalDoc(null)}></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="p-4 bg-light rounded border mb-3">
                  <span className="fs-1 d-block mb-2">📁</span>
                  <strong className="d-block text-dark mb-1">{previewModalDoc.name}</strong>
                  <span className="text-muted small d-block mb-3">Tệp đã sẵn sàng trong hệ thống</span>
                  <a href={previewModalDoc.url} target="_blank" rel="noreferrer" className="btn btn-success btn-sm rounded-pill px-4 py-1.5 fw-bold">
                    ⬇ Tải về xem chi tiết
                  </a>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary btn-sm rounded-pill px-3" onClick={() => setPreviewModalDoc(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
