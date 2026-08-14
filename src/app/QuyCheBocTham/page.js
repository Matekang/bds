'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { renderAsync } from 'docx-preview';

export default function QuyCheBocThamPage() {
  const [activeTab, setActiveTab] = useState('phase1'); // 'phase1' | 'phase2' | 'eligibility'

  // Dynamic Calculator state for Phase 1
  const [totalUnits, setTotalUnits] = useState(300);
  const [priorityApplicants, setPriorityApplicants] = useState(60);
  const [totalApplicants, setTotalApplicants] = useState(400);

  // Derived calculations
  const priorityRatio = totalApplicants > 0 ? (priorityApplicants / totalApplicants) : 0;
  const calculatedPriorityUnits = Math.min(totalUnits, Math.round(priorityRatio * totalUnits));
  const calculatedNormalUnits = Math.max(0, totalUnits - calculatedPriorityUnits);
  const normalApplicants = Math.max(0, totalApplicants - priorityApplicants);

  // Document Checklist State for Phase 2
  const [checklist, setChecklist] = useState({
    cccd: false,
    receipt: false,
    resultForm: false,
    authorization: false,
  });

  const toggleChecklist = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;

  // Registration status for current citizen
  const [isJoined, setIsJoined] = useState(false);
  const [userOwnApp, setUserOwnApp] = useState(null);

  // Logged-in user session & Popup Notification state
  const [currentUser, setCurrentUser] = useState(null);
  const [userResultModal, setUserResultModal] = useState(null);
  const [dbApprovedApps, setDbApprovedApps] = useState([]);
  const [kFilter, setKFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Docx Viewer Modal State
  const [docxModal, setDocxModal] = useState(null); // { title: string, url: string }
  const [isDocLoading, setIsDocLoading] = useState(false);
  const docxContainerRef = useRef(null);

  useEffect(() => {
    if (docxModal && docxContainerRef.current) {
      setIsDocLoading(true);
      docxContainerRef.current.innerHTML = '';
      fetch(docxModal.url)
        .then(res => {
          if (!res.ok) throw new Error('Không thể tải file docx');
          return res.blob();
        })
        .then(blob => {
          renderAsync(blob, docxContainerRef.current, null, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: true,
            trimXmlDeclaration: true,
          })
            .then(() => setIsDocLoading(false))
            .catch(() => setIsDocLoading(false));
        })
        .catch(() => setIsDocLoading(false));
    }
  }, [docxModal]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          setCurrentUser(data.session);
          // Check if citizen joined
          const val = localStorage.getItem('lottery_joined_' + (data.session.phoneNumber || data.session.email || 'guest'));
          setIsJoined(val === 'true');
          
          // Fetch own application to check eligibility
          fetch('/api/applications')
            .then(r => r.json())
            .then(d => {
              if (d.success && d.applications && d.applications.length > 0) {
                setUserOwnApp(d.applications[0]);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    const loadApprovedData = () => {
      fetch('/api/applications/public-approved')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.applications) {
            setDbApprovedApps(data.applications);
          } else {
            fetch('/api/applications')
              .then(res => res.json())
              .then(d2 => {
                if (d2.success && d2.applications) {
                  const approved = d2.applications.filter(a => a.status === 'approved' || a.status === 'luu_tru' || a.stage === 4);
                  setDbApprovedApps(approved);
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    };

    loadApprovedData();
    const pollInterval = setInterval(loadApprovedData, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleJoinLottery = () => {
    if (currentUser) {
      localStorage.setItem('lottery_joined_' + (currentUser.phoneNumber || currentUser.email || 'guest'), 'true');
      setIsJoined(true);
    }
  };

  const handleCancelJoin = () => {
    if (currentUser) {
      localStorage.setItem('lottery_joined_' + (currentUser.phoneNumber || currentUser.email || 'guest'), 'false');
      setIsJoined(false);
    }
  };

  const displayApplicants = dbApprovedApps.map(a => ({
    id: a.id,
    name: a.fullName,
    cccd: a.cccdNumber || a.phoneNumber || 'Đã xác thực',
    phoneNumber: a.phoneNumber,
    email: a.email,
    category: `${a.targetObject || 'K1'} – Đối tượng NOXH`,
    priority: (a.targetObject === 'K1' || a.targetObject === 'K7' || a.targetObject === 'K10') ? 'Ưu tiên 1' : 'Thông thường',
    preference: a.unitType || '2PN'
  }));

  // Define citizen application mapping to check eligibility
  const userApp = currentUser ? displayApplicants.find(app => 
    (app.phoneNumber && app.phoneNumber === currentUser.phoneNumber) ||
    (app.email && currentUser.email && app.email.toLowerCase() === currentUser.email.toLowerCase()) ||
    (app.name && currentUser.fullName && app.name.toLowerCase().trim() === currentUser.fullName.toLowerCase().trim()) ||
    (app.cccd && currentUser.cccd && app.cccd === currentUser.cccd)
  ) : null;

  // Extend display list with currentUser if they joined and are not already in the seeded database approved list
  const displayApplicantsExtended = [...displayApplicants];
  if (currentUser && isJoined) {
    const userAlreadyInList = displayApplicants.some(app => 
      (app.phoneNumber && app.phoneNumber === currentUser.phoneNumber) ||
      (app.email && currentUser.email && app.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (app.cccd && currentUser.cccd && app.cccd === currentUser.cccd)
    );
    if (!userAlreadyInList) {
      displayApplicantsExtended.unshift({
        id: userOwnApp ? userOwnApp.id : `HS-${currentUser.phoneNumber ? currentUser.phoneNumber.slice(-4) : 'USER'}`,
        name: currentUser.fullName || 'Người Dùng Hiện Tại',
        cccd: currentUser.cccd || 'Đã xác thực',
        phoneNumber: currentUser.phoneNumber,
        email: currentUser.email,
        category: userOwnApp ? `${userOwnApp.targetObject || 'K1'} – Đối tượng NOXH` : 'K1 – Đối tượng NOXH',
        priority: userOwnApp && (userOwnApp.targetObject === 'K1' || userOwnApp.targetObject === 'K7' || userOwnApp.targetObject === 'K10') ? 'Ưu tiên 1' : 'Thông thường',
        preference: userOwnApp ? userOwnApp.unitType : '2PN'
      });
    }
  }

  const filteredDisplayApplicants = displayApplicantsExtended.filter(app => {
    if (kFilter === 'all') return true;
    return app.category.startsWith(kFilter);
  });

  const totalPages = Math.ceil(filteredDisplayApplicants.length / pageSize) || 1;
  const paginatedDisplayApplicants = filteredDisplayApplicants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-soft py-5">
      <div className="container" style={{ maxWidth: '1080px' }}>
        
        {/* Header Hero Section */}
        <div className="text-center mb-5">
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 bg-warning bg-opacity-10 text-dark rounded-2 fw-semibold small mb-3 border border-warning border-opacity-25">
            <span className="badge bg-gold text-dark rounded-circle p-1">📜</span>
            Văn bản chính thức | Dự án NOXH Marina Living Hạ Long
          </div>
          <h1 className="fw-extrabold text-emerald display-5 mb-3">
            QUY CHẾ BỐC THĂM NHÀ Ở XÃ HỘI
          </h1>
          <p className="text-muted fs-5 mx-auto" style={{ maxWidth: '780px', lineHeight: '1.6' }}>
            Hướng dẫn tra cứu toàn bộ quy định về <strong>Bốc thăm Quyền mua (Giai đoạn 1)</strong> và <strong>Bốc thăm Vị trí, Diện tích Căn hộ (Giai đoạn 2)</strong> theo đúng Nghị định và Luật Nhà ở.
          </p>
          <div className="d-flex justify-content-center gap-2 flex-wrap mt-3">
            <button 
              type="button"
              onClick={() => setDocxModal({
                title: 'Sổ tay Quy chế 1: Quyền ưu tiên & Quyền mua (.docx)',
                url: '/files/1_boc_tham_quyen_uu_tien_quyen_mua_can_ho.docx'
              })}
              className="btn btn-sm rounded-2 px-3 py-1.5 border shadow-sm cursor-pointer d-inline-flex align-items-center gap-1.5 text-decoration-none"
              style={{ backgroundColor: '#e0f7ff', color: '#0284c7', borderColor: '#b3f0ff', fontSize: '0.83rem', fontWeight: '500' }}
            >
              📖 Sổ tay Quy chế 1: Quyền ưu tiên &amp; Quyền mua (.docx)
            </button>
            <button 
              type="button"
              onClick={() => setDocxModal({
                title: 'Sổ tay Quy chế 2: Bốc thăm Vị trí căn hộ (.docx)',
                url: '/files/2_boc_tham_vi_tri.docx'
              })}
              className="btn btn-sm rounded-2 px-3 py-1.5 border shadow-sm cursor-pointer d-inline-flex align-items-center gap-1.5 text-decoration-none"
              style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0', fontSize: '0.83rem', fontWeight: '500' }}
            >
              📖 Sổ tay Quy chế 2: Bốc thăm Vị trí căn hộ (.docx)
            </button>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="d-flex justify-content-center gap-3 flex-wrap mb-5">
          <button
            onClick={() => setActiveTab('phase1')}
            className={`btn rounded-3 px-4 py-2.5 fw-bold transition-all shadow-sm ${
              activeTab === 'phase1' 
                ? 'btn-emerald border-0' 
                : 'btn-light bg-white border text-secondary'
            }`}
            style={{ minWidth: '240px' }}
          >
             Giai Đoạn 1: Quyền Ưu Tiên & Quyền Mua
          </button>
          <button
            onClick={() => setActiveTab('phase2')}
            className={`btn rounded-3 px-4 py-2.5 fw-bold transition-all shadow-sm ${
              activeTab === 'phase2' 
                ? 'btn-emerald border-0' 
                : 'btn-light bg-white border text-secondary'
            }`}
            style={{ minWidth: '240px' }}
          >
             Giai Đoạn 2: Vị Trí & Diện Tích Căn Hộ
          </button>
          <button
            onClick={() => setActiveTab('eligibility')}
            className={`btn rounded-3 px-4 py-2.5 fw-bold transition-all shadow-sm ${
              activeTab === 'eligibility' 
                ? 'btn-tab-gold border-0 text-dark' 
                : 'btn-light bg-white border text-secondary'
            }`}
            style={{ minWidth: '240px' }}
          >
             📋 Điều Kiện & Đăng Ký Tham Gia
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: GIAI ĐOẠN 1 - QUYỀN ƯU TIÊN VÀ QUYỀN MUA */}
        {/* ========================================================================= */}
        {activeTab === 'phase1' && (
          <div className="animate-fade-in">
            {/* Top Overview Alert */}
            <div className="alert alert-success border-0 shadow-sm rounded-4 p-4 mb-4 bg-white border-start border-4 border-success">
              <div className="d-flex align-items-start gap-3">
                <div className="bg-emerald text-white rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                  💡
                </div>
                <div>
                  <h5 className="fw-bold text-emerald mb-1">Mục đích Giai đoạn 1</h5>
                  <p className="text-secondary small mb-0">
                    Xác định danh sách <strong>KHÁCH HÀNG ĐƯỢC QUYỀN MUA CĂN HỘ NOXH</strong> tại dự án khi tổng số hồ sơ đủ điều kiện đăng ký mua vượt quá tổng số quỹ căn hộ mở bán.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 1: Công thức phân bổ quỹ căn */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
              <div className="card-header bg-emerald text-white py-3 px-4">
                <h5 className="fw-bold mb-0">🧮 1. Quy Định Tính Toán Quỹ Căn Cho Nhóm Ưu Tiên</h5>
              </div>
              <div className="card-body p-4">
                <p className="text-muted">
                  Theo Điều 9 Quy chế bốc thăm, số lượng căn hộ dành cho nhóm đối tượng ưu tiên được tính dựa trên tỷ lệ hồ sơ thuộc diện ưu tiên trên tổng số hồ sơ hợp lệ:
                </p>
                
                <div className="p-3 bg-light rounded-3 mb-4 text-center border">
                  <div className="fw-bold text-dark fs-6 mb-2">Công thức phân bổ Quỹ căn Ưu tiên:</div>
                  <div className="bg-white p-3 rounded border text-emerald fw-bold d-inline-block shadow-sm">
                    Quỹ căn ưu tiên = 
                    <span className="text-primary px-2">
                      (Tổng hồ sơ Ưu tiên ÷ Tổng hồ sơ đủ điều kiện)
                    </span> 
                    × Tổng quỹ căn NOXH
                  </div>
                  <div className="small text-muted mt-2">
                    Quỹ căn bốc thăm thông thường = Tổng quỹ căn NOXH − Quỹ căn ưu tiên
                  </div>
                </div>

                {/* Interactive Formula Calculator Widget */}
                <div className="p-4 bg-cream rounded-4 border border-warning border-opacity-25">
                  <h6 className="fw-bold text-dark mb-3">⚡ Trải nghiệm tính toán thử số lượng căn phân bổ:</h6>
                  <div className="row g-3 align-items-center">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Tổng quỹ căn NOXH mở bán</label>
                      <input 
                        type="number" 
                        className="form-control fw-bold" 
                        value={totalUnits}
                        onChange={(e) => setTotalUnits(Number(e.target.value))}
                        min="1"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Số hồ sơ thuộc nhóm Ưu tiên</label>
                      <input 
                        type="number" 
                        className="form-control fw-bold text-primary" 
                        value={priorityApplicants}
                        onChange={(e) => setPriorityApplicants(Number(e.target.value))}
                        min="0"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Tổng số hồ sơ đủ điều kiện</label>
                      <input 
                        type="number" 
                        className="form-control fw-bold text-dark" 
                        value={totalApplicants}
                        onChange={(e) => setTotalApplicants(Number(e.target.value))}
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="row g-3 mt-2 pt-3 border-top">
                    <div className="col-md-6">
                      <div className="p-3 bg-white rounded-3 border text-center">
                        <span className="d-block text-muted small fw-semibold">Quỹ căn bố trí cho Nhóm Ưu Tiên</span>
                        <span className="fs-3 fw-extrabold text-success">{calculatedPriorityUnits} căn</span>
                        <span className="d-block text-muted fs-7">({(priorityRatio * 100).toFixed(1)}% tổng quỹ căn)</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-white rounded-3 border text-center">
                        <span className="d-block text-muted small fw-semibold">Quỹ căn Bốc thăm Thông thường</span>
                        <span className="fs-3 fw-extrabold text-emerald">{calculatedNormalUnits} căn</span>
                        <span className="d-block text-muted fs-7">(Dành cho {normalApplicants} hồ sơ thông thường)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Thứ tự 6 nhóm đối tượng ưu tiên */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
              <div className="card-header bg-emerald text-white py-3 px-4">
                <h5 className="fw-bold mb-0">⭐ 2. Danh Sách 06 Nhóm Đối Tượng Ưu Tiên</h5>
              </div>
              <div className="card-body p-4">
                <p className="text-muted small mb-3">
                  Theo quy định tại Điều 9, số lượng căn hộ dành cho nhóm ưu tiên được xét lần lượt theo thứ tự ưu tiên sau:
                </p>
                <div className="row g-3">
                  {[
                    { num: '01', title: 'Người có công với cách mạng', desc: 'Được hỗ trợ theo quy định pháp luật về ưu đãi người có công.' },
                    { num: '02', title: 'Thân nhân liệt sĩ', desc: 'Thuộc diện ưu tiên theo chính sách người có công.' },
                    { num: '03', title: 'Người khuyết tật', desc: 'Người khuyết tật nặng hoặc đặc biệt nặng.' },
                    { num: '04', title: 'Đối tượng tái định cư', desc: 'Người được bố trí tái định cư theo hình thức mua, thuê mua NOXH.' },
                    { num: '05', title: 'Gia đình có từ 02 con đẻ trở lên', desc: 'Các hộ gia đình đông con thuộc diện ưu tiên.' },
                    { num: '06', title: 'Nữ giới', desc: 'Đứng tên trên hồ sơ đăng ký mua nhà ở xã hội.' },
                  ].map((group, idx) => (
                    <div className="col-md-6" key={idx}>
                      <div className="p-3 bg-white border rounded-3 d-flex align-items-center gap-3 h-100 shadow-sm hover-lift">
                        <div className="badge bg-gold text-dark fs-6 rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                          {group.num}
                        </div>
                        <div>
                          <h6 className="fw-bold text-emerald mb-1">{group.title}</h6>
                          <p className="text-muted small mb-0">{group.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="alert alert-warning border-0 bg-warning bg-opacity-10 text-dark mt-4 mb-0 rounded-3 small">
                  <strong>⚠️ Lưu ý bốc thăm nhóm ưu tiên:</strong> Nếu số lượng đối tượng trong 01 nhóm ưu tiên vượt quá số căn hộ ưu tiên còn lại, Hội đồng sẽ tổ chức bốc thăm trong nội bộ nhóm ưu tiên đó. Các khách hàng không trúng ưu tiên sẽ tiếp tục xuống bốc thăm quyền mua cùng với nhóm đối tượng không ưu tiên.
                </div>
              </div>
            </div>

            {/* Section 3: Phân loại lá phiếu & Xử lý dự khuyết */}
            <div className="row g-4">
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white py-3 px-4 border-bottom">
                    <h5 className="fw-bold text-emerald mb-0">🎟️ Phân Loại Lá Phiếu Thăm (GĐ1)</h5>
                  </div>
                  <div className="card-body p-4">
                    <div className="mb-3">
                      <h6 className="fw-bold text-primary mb-2">1. Phiếu bốc thăm Nhóm Ưu Tiên:</h6>
                      <ul className="list-unstyled ps-2 fs-7 text-muted">
                        <li className="mb-1">🟢 <strong>“Trúng quyền ƯU TIÊN”</strong>: Được xác nhận quyền mua NOXH.</li>
                        <li className="mb-1">🟡 <strong>“Dự khuyết quyền ưu tiên”</strong>: Có ghi số thứ tự từ thấp đến cao.</li>
                      </ul>
                    </div>
                    <div className="mb-3">
                      <h6 className="fw-bold text-success mb-2">2. Phiếu bốc thăm Nhóm Thông Thường:</h6>
                      <ul className="list-unstyled ps-2 fs-7 text-muted">
                        <li className="mb-1">🟢 <strong>“Trúng quyền mua căn hộ”</strong>: Được xác nhận quyền mua NOXH.</li>
                        <li className="mb-1">⚪ <strong>“Dự khuyết quyền mua căn hộ”</strong>: Có ghi số thứ tự từ thấp đến cao.</li>
                      </ul>
                    </div>
                    <div className="p-2 bg-light rounded text-center small text-muted border">
                      🔒 Tất cả phiếu thăm đều được Chủ đầu tư ký kiểm soát và đóng dấu đỏ Công ty.
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white py-3 px-4 border-bottom">
                    <h5 className="fw-bold text-emerald mb-0">⏳ Quy Trình Xử Lý Dự Khuyết (Hạn 3 Ngày)</h5>
                  </div>
                  <div className="card-body p-4">
                    <p className="text-muted small">
                      Nếu khách hàng trúng quyền mua từ bỏ quyền mua, bị Sở Xây dựng bác hồ sơ hoặc không đến ký HĐMB đúng hạn, quyền mua được chuyển cho danh sách dự khuyết:
                    </p>
                    <ol className="small text-secondary ps-3 mb-3">
                      <li className="mb-2">
                        <strong>Ưu tiên 1:</strong> Chuyển cho khách hàng thuộc nhóm ưu tiên đã bốc trúng <em>“Dự khuyết quyền ưu tiên”</em> theo thứ tự số phiếu.
                      </li>
                      <li className="mb-2">
                        <strong>Ưu tiên 2:</strong> Chuyển tiếp cho khách hàng nhóm thường giữ phiếu <em>“Dự khuyết quyền mua”</em> theo STT.
                      </li>
                      <li className="mb-2">
                        <strong>Thời hạn phản hồi:</strong> Trong vòng <strong>03 ngày</strong> kể từ khi CĐT thông báo (qua điện thoại / SMS / Email). Nếu quá 3 ngày khách không tới ký HĐMB, quyền mua sẽ chuyển sang khách dự khuyết kế tiếp.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GIAI ĐOẠN 2 - VỊ TRÍ VÀ DIỆN TÍCH CĂN HỘ */}
        {/* ========================================================================= */}
        {activeTab === 'phase2' && (
          <div className="animate-fade-in">
            {/* Top Alert */}
            <div className="alert alert-primary border-0 shadow-sm rounded-4 p-4 mb-4 bg-white border-start border-4 border-primary">
              <div className="d-flex align-items-start gap-3">
                <div className="bg-primary text-white rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                  🏢
                </div>
                <div>
                  <h5 className="fw-bold text-primary mb-1">Mục đích Giai đoạn 2</h5>
                  <p className="text-secondary small mb-0">
                    Bốc thăm xác định <strong>TÒA, TẦNG, SỐ CĂN HỘ, MÃ CĂN HỘ VÀ DIỆN TÍCH</strong> cụ thể dành cho các khách hàng đã có quyền mua tại Dự án NOXH Marina Living.
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline Lịch trình bốc thăm */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
              <div className="card-header bg-emerald text-white py-3 px-4">
                <h5 className="fw-bold mb-0">⏰ 1. Khung Thời Gian & Ca Bốc Thăm (Điều 6)</h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-4">
                  {/* Ca Sáng */}
                  <div className="col-md-6">
                    <div className="p-4 bg-cream rounded-4 border border-warning border-opacity-25 h-100">
                      <span className="badge bg-gold text-dark fw-bold px-3 py-1.5 rounded-2 mb-3">
                        ☀️ BUỔI SÁNG (07h00’ - 10h45’)
                      </span>
                      <h6 className="fw-bold text-emerald">Bốc thăm Nhóm diện tích NV1 Ca Sáng</h6>
                      <ul className="list-unstyled ps-0 mt-3 small">
                        <li className="mb-2 d-flex justify-content-between border-bottom pb-1">
                          <span className="text-muted">07h00’ - 08h30’:</span>
                          <span className="fw-semibold text-dark">Làm thủ tục đăng ký &amp; nhận Phiếu kiểm soát</span>
                        </li>
                        <li className="mb-2 d-flex justify-content-between border-bottom pb-1">
                          <span className="text-muted">08h30’ - 08h45’:</span>
                          <span className="fw-bold text-danger">Tuyên bố ĐÓNG DANH SÁCH có mặt</span>
                        </li>
                        <li className="mb-1 d-flex justify-content-between">
                          <span className="text-muted">08h45’ - 10h45’:</span>
                          <span className="fw-semibold text-success">Tổ chức bốc thăm vị trí căn hộ</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Ca Chiều */}
                  <div className="col-md-6">
                    <div className="p-4 bg-light rounded-4 border h-100">
                      <span className="badge bg-emerald text-white fw-bold px-3 py-1.5 rounded-2 mb-3">
                        🌙 BUỔI CHIỀU (13h00’ - 17h30’)
                      </span>
                      <h6 className="fw-bold text-emerald">Bốc thăm Nhóm diện tích NV1 Ca Chiều</h6>
                      <ul className="list-unstyled ps-0 mt-3 small">
                        <li className="mb-2 d-flex justify-content-between border-bottom pb-1">
                          <span className="text-muted">13h00’ - 14h30’:</span>
                          <span className="fw-semibold text-dark">Làm thủ tục đăng ký &amp; nhận Phiếu kiểm soát</span>
                        </li>
                        <li className="mb-2 d-flex justify-content-between border-bottom pb-1">
                          <span className="text-muted">14h30’ - 14h45’:</span>
                          <span className="fw-bold text-danger">Tuyên bố ĐÓNG DANH SÁCH có mặt</span>
                        </li>
                        <li className="mb-1 d-flex justify-content-between">
                          <span className="text-muted">14h45’ - 17h30’:</span>
                          <span className="fw-semibold text-success">Tổ chức bốc thăm vị trí căn hộ</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="alert alert-danger bg-danger bg-opacity-10 text-danger border-0 rounded-3 mt-4 mb-0 small">
                  ❌ <strong>Cảnh báo quan trọng:</strong> Khách hàng không đến đúng khung thời gian đăng ký sẽ được xem là không tham dự buổi bốc thăm theo nguyện vọng đó.
                </div>
              </div>
            </div>

            {/* Checklist Giấy tờ cần mang theo */}
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="fw-bold text-emerald mb-0">📄 2. Checklist Giấy Tờ Cần Mang Theo (Điều 7)</h5>
                <span className="badge bg-emerald rounded-2 px-3 py-1.5 fs-7">
                  Đã chuẩn bị: {completedChecklistCount} / 4
                </span>
              </div>
              <div className="card-body p-4">
                <p className="text-muted small mb-3">
                  Tích chọn vào các ô bên dưới để tự kiểm tra danh sách giấy tờ trước khi đi tham dự Lễ bốc thăm:
                </p>
                <div className="row g-3">
                  {[
                    { key: 'cccd', title: '1. Căn cước công dân / Căn cước (Bản gốc)', desc: 'Áp dụng cho người đứng tên trên hồ sơ hoặc người được ủy quyền.' },
                    { key: 'receipt', title: '2. Phiếu tiếp nhận hồ sơ đăng ký mua NOXH (Bản gốc)', desc: 'Đối với các khách hàng thuộc nhóm ưu tiên không phải bốc thăm quyền mua.' },
                    { key: 'resultForm', title: '3. Biên bản kết quả bốc thăm quyền mua (Bản gốc)', desc: 'Đối với khách hàng đã trúng quyền mua căn hộ thông qua bốc thăm ở Giai đoạn 1.' },
                    { key: 'authorization', title: '4. Giấy ủy quyền hợp lệ (Bản gốc)', desc: 'Công chứng / chứng thực theo quy định nếu người đứng tên không trực tiếp đi bốc.' },
                  ].map((doc) => (
                    <div className="col-md-6" key={doc.key}>
                      <div 
                        onClick={() => toggleChecklist(doc.key)}
                        className={`p-3 rounded-3 border transition-all cursor-pointer d-flex align-items-start gap-3 ${
                          checklist[doc.key] ? 'bg-success bg-opacity-10 border-success' : 'bg-white'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <input 
                          type="checkbox" 
                          className="form-check-input mt-1" 
                          checked={checklist[doc.key]}
                          onChange={() => {}}
                        />
                        <div>
                          <h6 className={`fw-bold mb-1 ${checklist[doc.key] ? 'text-success text-decoration-line-through' : 'text-dark'}`}>
                            {doc.title}
                          </h6>
                          <p className="text-muted fs-7 mb-0">{doc.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cơ chế Phiếu trắng & Vi phạm quy chế */}
            <div className="row g-4">
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white py-3 px-4 border-bottom">
                    <h5 className="fw-bold text-emerald mb-0">🏳️ Quy Định Phiếu Trắng &amp; Chuyển NV2</h5>
                  </div>
                  <div className="card-body p-4">
                    <p className="text-muted small">
                      Trường hợp số lượng khách hàng đăng ký một nhóm diện tích lớn hơn số lượng căn hộ của nhóm đó, Chủ đầu tư bổ sung <strong>Phiếu trắng</strong>:
                    </p>
                    <div className="p-3 bg-light rounded-3 border mb-3">
                      <div className="fw-bold text-dark fs-7 mb-1">Cơ chế xử lý khi bốc trúng Phiếu Trắng:</div>
                      <p className="text-secondary fs-7 mb-0">
                        Khách hàng bốc vào Phiếu trắng ở Nguyện vọng 1 sẽ được quyền tiếp tục tham gia bốc thăm ở các Nhóm diện tích theo thứ tự **Nguyện vọng 2** (nếu còn quỹ căn).
                      </p>
                    </div>
                    <div className="small text-muted">
                      📝 Biên bản kết quả bốc thăm vị trí căn hộ được lập thành 02 bản chính, thay cho thông báo mời ký Thỏa thuận đặt cọc &amp; HĐMB.
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 border-start border-4 border-danger h-100">
                  <div className="card-header bg-white py-3 px-4 border-bottom">
                    <h5 className="fw-bold text-danger mb-0">🚫 7 Hành Vi Vi Phạm Quy Chế (Điều 11)</h5>
                  </div>
                  <div className="card-body p-4">
                    <ul className="fs-7 text-secondary ps-3 mb-0">
                      <li className="mb-1.5">Đến sau thời điểm tuyên bố bắt đầu Lễ bốc thăm.</li>
                      <li className="mb-1.5">Sử dụng phiếu thăm không do CĐT phát hành / phiếu không hợp lệ.</li>
                      <li className="mb-1.5">Thực hiện bốc thăm quá 01 phiếu thăm.</li>
                      <li className="mb-1.5">Hủy hoại, cất giấu phiếu, tự ý ghi thêm, tẩy xóa nội dung phiếu.</li>
                      <li className="mb-1.5">Không ký nhận Biên bản kết quả bốc thăm.</li>
                      <li className="mb-1.5">Không tuân thủ điều phối của ban tổ chức.</li>
                      <li className="mb-1.5">Gây rối trật tự, mang vật dụng nguy hiểm/cháy nổ.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ĐIỀU KIỆN VÀ ĐĂNG KÝ THAM GIA BỐC THĂM */}
        {/* ========================================================================= */}
        {activeTab === 'eligibility' && (
          <div className="animate-fade-in">
            {/* Top Alert / Banner */}
            <div className="alert alert-warning border-0 shadow-sm rounded-4 p-4 mb-4 bg-white border-start border-4 border-warning">
              <div className="d-flex align-items-start gap-3">
                <div className="bg-warning text-dark rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                  📋
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-1">Cổng Đăng Ký Tham Gia Bốc Thăm NOXH</h5>
                  <p className="text-secondary small mb-0">
                    Tra cứu điều kiện tham gia bốc thăm chính thức và thực hiện đăng ký tham gia ca bốc thăm quyền mua &amp; vị trí căn hộ tại dự án Marina Living.
                  </p>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-4">
              {/* Left Column: Eligibility Conditions Checklist */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-emerald text-white py-3 px-4">
                    <h5 className="fw-bold mb-0">📝 Điều Kiện Đăng Ký Tham Gia (Quy định)</h5>
                  </div>
                  <div className="card-body p-4">
                    <p className="text-muted small">
                      Theo quy chế bốc thăm của dự án Marina Living Hạ Long, để được tham gia bốc thăm, khách hàng cần đáp ứng đủ các điều kiện sau:
                    </p>
                    
                    <div className="d-flex flex-column gap-3 mt-3">
                      <div className="d-flex align-items-start gap-2.5">
                        <span className="text-success fw-bold fs-5">✓</span>
                        <div>
                          <strong className="text-dark fs-7">1. Hồ sơ đã được thẩm định &amp; Phê duyệt (Approved)</strong>
                          <p className="text-muted fs-8 mb-0">Hồ sơ đăng ký mua nhà ở xã hội phải được tổ tiếp nhận và tổ kiểm soát chấm đạt yêu cầu, có tên trong danh sách công bố.</p>
                        </div>
                      </div>
                      
                      <div className="d-flex align-items-start gap-2.5">
                        <span className="text-success fw-bold fs-5">✓</span>
                        <div>
                          <strong className="text-dark fs-7">2. Hoàn thành đối chiếu Bản gốc hồ sơ giấy</strong>
                          <p className="text-muted fs-8 mb-0">Đã nộp và đối chiếu đầy đủ các giấy tờ chứng minh đối tượng, điều kiện thu nhập và cư trú bản gốc tại bộ phận lưu trữ.</p>
                        </div>
                      </div>

                      <div className="d-flex align-items-start gap-2.5">
                        <span className="text-success fw-bold fs-5">✓</span>
                        <div>
                          <strong className="text-dark fs-7">3. Đăng ký tham gia trước hạn chót ca bốc thăm</strong>
                          <p className="text-muted fs-8 mb-0">Khách hàng cần đăng ký tham gia trực tuyến hoặc trực tiếp tại văn phòng CĐT để Ban tổ chức chốt danh sách in phiếu bốc thăm.</p>
                        </div>
                      </div>

                      <div className="d-flex align-items-start gap-2.5">
                        <span className="text-success fw-bold fs-5">✓</span>
                        <div>
                          <strong className="text-dark fs-7">4. Mang đầy đủ giấy tờ tùy thân (CCCD gốc) khi tham dự</strong>
                          <p className="text-muted fs-8 mb-0">Người đứng tên hoặc người được ủy quyền hợp pháp phải mang theo Căn cước công dân bản gốc để đối chiếu tại bàn check-in.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Citizen Login & Enrollment Status */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-emerald text-white py-3 px-4">
                    <h5 className="fw-bold mb-0">👤 Trạng Tư Cách Đăng Ký Của Bạn</h5>
                  </div>
                  <div className="card-body p-4 d-flex flex-column justify-content-between">
                    {!currentUser ? (
                      <div className="text-center py-4 my-auto">
                        <span className="fs-1 d-block mb-3">🔒</span>
                        <h6 className="fw-bold text-dark mb-2">Chưa Đăng Nhập Tài Khoản</h6>
                        <p className="text-muted small mb-4">
                          Vui lòng đăng nhập bằng tài khoản công dân (Số điện thoại) để kiểm tra điều kiện hồ sơ và đăng ký bốc thăm trực tuyến.
                        </p>
                        <Link href="/?auth=login" className="btn btn-emerald px-4 rounded-2 fw-bold shadow-sm">
                          🔑 Đăng Nhập Ngay
                        </Link>
                      </div>
                    ) : (
                      <div className="h-100 d-flex flex-column justify-content-between">
                        {currentUser && (currentUser.role === 'admin' || currentUser.role?.startsWith('officer_')) ? (
                          <div className="text-center py-4 my-auto animate-scale-up">
                            <span className="fs-1 d-block mb-3">👑</span>
                            <h6 className="fw-bold text-emerald mb-2">Tài Khoản Ban Tổ Chức (Cán Bộ)</h6>
                            <p className="text-muted small mb-4">
                              Họ tên: <strong>{currentUser.fullName}</strong><br />
                              Số điện thoại: <strong>{currentUser.phoneNumber}</strong><br />
                              Vai trò: <span className="badge bg-gold text-dark fs-8">Cán bộ bốc thăm</span>
                            </p>
                            <Link href="/admin" className="btn btn-emerald w-100 py-2.5 rounded-2 fw-bold shadow hover-scale d-inline-flex align-items-center justify-content-center gap-2 text-decoration-none">
                              🎮 Đi Đến Trang Bốc Thăm (Quản Trị)
                            </Link>
                          </div>
                        ) : (
                          <>
                            <div>
                              {/* User info card */}
                              <div className="p-3 bg-light rounded-3 border mb-3">
                                <div className="fw-bold text-dark fs-7 mb-1">👤 Thông tin tài khoản:</div>
                                <div className="text-secondary small">
                                  Họ &amp; Tên: <strong>{currentUser.fullName || 'Công dân'}</strong><br />
                                  Số điện thoại: <strong>{currentUser.phoneNumber}</strong><br />
                                  Email: <strong>{currentUser.email || 'Chưa cập nhật'}</strong>
                                </div>
                              </div>

                              {/* Verification status card */}
                              {userApp ? (
                                <div className="p-3 rounded-3 border border-success bg-success bg-opacity-10 mb-3 animate-fade-in">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="badge bg-success text-white">🟢 ĐỦ ĐIỀU KIỆN</span>
                                    <span className="small text-muted fw-bold">Mã HS: {userApp.id}</span>
                                  </div>
                                  <p className="text-success-emphasis small mb-0">
                                    Hồ sơ của bạn đã được kiểm soát đạt yêu cầu (Stage 4) và sẵn sàng tham gia bốc thăm.
                                  </p>
                                </div>
                              ) : (
                                <div className="p-3 rounded-3 border border-warning bg-warning bg-opacity-10 mb-3 animate-fade-in">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="badge bg-warning text-dark">⏳ CHƯA ĐỦ ĐIỀU KIỆN BỐC THĂM</span>
                                  </div>
                                  <p className="text-warning-emphasis small mb-0">
                                    Hệ thống chưa tìm thấy hồ sơ được duyệt (Stage 4) ứng với tài khoản này. Vui lòng liên hệ Tổ tiếp nhận để kiểm tra tiến trình phê duyệt hồ sơ của bạn.
                                  </p>
                                  <Link href="/portal" className="btn btn-outline-secondary btn-sm rounded-2 py-1.5 fw-bold text-decoration-none d-block text-center mt-3 fs-8">
                                    🏛️ Đi đến Cổng cá nhân (Portal) kiểm tra hồ sơ
                                  </Link>
                                </div>
                              )}
                            </div>

                            {/* Actions block */}
                            {userApp && (
                              <div className="mt-3 text-center border-top pt-3">
                                {isJoined ? (
                                  <div className="animate-scale-up">
                                    <div className="p-3 bg-white border border-success rounded-3 shadow-sm mb-3">
                                      <div className="text-success fw-bold fs-6 mb-1">🎉 ĐÃ ĐĂNG KÝ THAM GIA THÀNH CÔNG</div>
                                      <div className="text-muted small">
                                        Mã đăng ký: <code className="fw-bold text-primary">REG-{userApp.id}</code> | Ca bốc thăm: <strong>{userApp.preference === '3PN' ? 'Buổi chiều' : 'Buổi sáng'}</strong>
                                      </div>
                                    </div>
                                    <div className="d-flex flex-column gap-2">
                                      <Link 
                                        href="/portal" 
                                        className="btn btn-emerald rounded-2 py-2.5 fw-bold text-decoration-none shadow hover-scale d-inline-flex align-items-center justify-content-center gap-2"
                                      >
                                        🏛️ Đi Đến Trang Bốc Thăm (Cổng Cá Nhân)
                                      </Link>
                                      <button 
                                        onClick={handleCancelJoin}
                                        className="btn btn-outline-danger btn-sm rounded-2 py-1.5 fw-bold"
                                      >
                                        ❌ Hủy đăng ký bốc thăm
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="animate-scale-up">
                                    <p className="small text-muted mb-3">
                                      Vui lòng nhấn nút bên dưới để xác nhận đăng ký tham gia ca bốc thăm căn hộ Marina Living Hạ Long:
                                    </p>
                                    <button 
                                      onClick={handleJoinLottery}
                                      className="btn btn-emerald btn-lg px-4 py-2.5 rounded-2 fw-bold shadow hover-scale w-100 animate-pulse"
                                    >
                                      🟢 Đăng Ký Tham Gia Bốc Thăm
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>


          </div>
        )}

        {/* Footer Support Callout */}
        <div className="mt-5 text-center p-4 bg-white rounded-4 shadow-sm border border-success border-opacity-10">
          <h5 className="fw-bold text-emerald mb-2">Ban Quản Lý &amp; Hội Đồng Bốc Thăm Dự Án NOXH Marina Living</h5>
          <p className="text-muted small mb-3">
            Mọi câu hỏi liên quan đến thủ tục đăng ký và danh sách hồ sơ đủ điều kiện bốc thăm, xin vui lòng liên hệ hotline hỗ trợ.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link href="/cungbanmuanha" className="btn btn-emerald rounded-2 px-4">
              📘 Xem Cẩm Nang Mua Nhà
            </Link>
            <a href="tel:19006666" className="btn btn-outline-success rounded-2 px-4 fw-bold">
              📞 Hotline: 1900 6666
            </a>
          </div>
        </div>

        {/* POPUP NOTIFICATION MODAL FOR MATCHED / SELECTED ACCOUNT */}
        {userResultModal && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '640px', width: '95%' }}>
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden animate-scale-up">
                
                {/* Modal Header */}
                <div className={`modal-header py-3 px-4 text-white d-flex align-items-center justify-content-between ${
                  userResultModal.type === 'SUCCESS' 
                    ? 'bg-success' 
                    : userResultModal.type === 'WHITE_TICKET' 
                    ? 'bg-warning text-dark' 
                    : 'bg-secondary'
                }`}>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-4">
                      {userResultModal.type === 'SUCCESS' ? '🎉' : userResultModal.type === 'WHITE_TICKET' ? '⚪' : '📋'}
                    </span>
                    <div>
                      <span className={`badge rounded-2 fs-8 ${userResultModal.type === 'WHITE_TICKET' ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
                        THÔNG BÁO KẾT QUẢ BỐC THĂM KẾT QUẢ
                      </span>
                      <h6 className="modal-title fw-bold mb-0 text-truncate" style={{ maxWidth: '420px' }}>
                        {userResultModal.name} ({userResultModal.id})
                      </h6>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className={`btn-close ${userResultModal.type === 'WHITE_TICKET' ? '' : 'btn-close-white'}`}
                    onClick={() => setUserResultModal(null)}
                    aria-label="Close"
                  ></button>
                </div>

                {/* Modal Body */}
                <div className="modal-body p-4 bg-light">
                  {/* Applicant Banner */}
                  <div className="p-3 bg-white rounded-3 border mb-3 shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold text-dark fs-7">👤 Hồ Sơ: {userResultModal.name}</span>
                      <span className="badge bg-primary text-white fs-8">{userResultModal.priority}</span>
                    </div>
                    <div className="text-muted fs-8">
                      🪪 Số CCCD: <strong>{userResultModal.cccd}</strong> | 📋 Nhóm: {userResultModal.category}
                    </div>
                  </div>

                  {/* Result Type Banner & Details */}
                  {userResultModal.type === 'SUCCESS' && (
                    <div className="p-4 rounded-3 text-center bg-success bg-opacity-10 border border-success">
                      <div className="badge bg-success text-white px-3.5 py-1.5 rounded-2 mb-2 fw-bold fs-7 shadow-sm">
                        🏆 CHÚC MỪNG BẠN ĐÃ BỐC TRÚNG CĂN HỘ!
                      </div>
                      <p className="text-dark small mb-3">
                        Hệ thống xác nhận bạn đã bốc trúng quyền mua vị trí căn hộ chính thức tại Dự án NOXH Marina Living Hạ Long:
                      </p>
                      <div className="row g-2 justify-content-center mb-2">
                        <div className="col-6 col-sm-3">
                          <div className="p-2 bg-white rounded-3 border text-center shadow-sm">
                            <span className="d-block text-muted fs-8">Tòa nhà</span>
                            <span className="fs-5 fw-bold text-emerald">{userResultModal.tower}</span>
                          </div>
                        </div>
                        <div className="col-6 col-sm-3">
                          <div className="p-2 bg-white rounded-3 border text-center shadow-sm">
                            <span className="d-block text-muted fs-8">Tầng</span>
                            <span className="fs-5 fw-bold text-emerald">{userResultModal.floor}</span>
                          </div>
                        </div>
                        <div className="col-6 col-sm-3">
                          <div className="p-2 bg-white rounded-3 border text-center shadow-sm">
                            <span className="d-block text-muted fs-8">Mã Căn</span>
                            <span className="fs-5 fw-bold text-gold">{userResultModal.code}</span>
                          </div>
                        </div>
                        <div className="col-6 col-sm-3">
                          <div className="p-2 bg-white rounded-3 border text-center shadow-sm">
                            <span className="d-block text-muted fs-8">Diện Tích</span>
                            <span className="fs-5 fw-bold text-dark">{userResultModal.area}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-success fs-8 fw-semibold mt-2">
                        📝 Biên bản kết quả bốc thăm đã được tự động lập và gửi đến Tổ tiếp nhận hồ sơ.
                      </div>
                    </div>
                  )}

                  {userResultModal.type === 'WHITE_TICKET' && (
                    <div className="p-4 rounded-3 text-center bg-warning bg-opacity-15 border border-warning">
                      <div className="badge bg-warning text-dark px-3 py-1.5 rounded-2 mb-2 fw-bold fs-7 shadow-sm">
                        ⚪ PHIẾU TRẮNG - CHUYỂN NGUYỆN VỌNG 2
                      </div>
                      <p className="text-dark small mb-2">
                        Rất tiếc! Ở đợt bốc thăm Nguyện vọng 1, lá phiếu của bạn là <strong>Phiếu trắng</strong>.
                      </p>
                      <div className="p-2.5 bg-white rounded-3 border text-secondary fs-8 text-start mb-2">
                        📌 <strong>Quyền lợi theo Điều 9 Quy chế:</strong> Bạn được tiếp tục giữ nguyên quyền ưu tiên và chuyển sang bốc thăm quỹ căn còn lại ở đợt <strong>Nguyện vọng 2</strong> tại Ca bốc tiếp theo.
                      </div>
                    </div>
                  )}

                  {userResultModal.type === 'RESERVE' && (
                    <div className="p-4 rounded-3 text-center bg-secondary bg-opacity-10 border border-secondary">
                      <div className="badge bg-secondary text-white px-3 py-1.5 rounded-2 mb-2 fw-bold fs-7 shadow-sm">
                        📋 PHIẾU DỰ KHUYẾT SỐ THỨ TỰ #{userResultModal.reserveNum}
                      </div>
                      <p className="text-dark small mb-2">
                        Lá phiếu của bạn thuộc danh sách <strong>Dự khuyết Quyền mua căn hộ</strong> (Thứ tự #{userResultModal.reserveNum}).
                      </p>
                      <div className="p-2.5 bg-white rounded-3 border text-secondary fs-8 text-start mb-2">
                        📌 <strong>Chính sách dự khuyết:</strong> Khi có khách hàng từ bỏ quyền mua hoặc hồ sơ bị hủy do vi phạm quy chế thẩm định, Ban Quản Lý sẽ tự động thông báo cho bạn theo thứ tự ưu tiên trong 03 ngày làm việc.
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="modal-footer bg-white py-2.5 px-4 border-top d-flex justify-content-between align-items-center">
                  <span className="text-muted fs-8">Hội đồng bốc thăm NOXH Marina Living</span>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm rounded-2 px-4 fw-semibold fs-8"
                    onClick={() => setUserResultModal(null)}
                  >
                    Đóng Thông Báo
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Docx Viewer Modal */}
        {docxModal && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '92vw', height: '92vh' }}>
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden h-100">
                {/* Modal Header */}
                <div className="modal-header py-3 px-4 d-flex justify-content-between align-items-center border-bottom bg-white">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-5">📄</span>
                    <h5 className="modal-title fw-extrabold m-0 fs-6" style={{ color: '#065f46' }}>
                      {docxModal.title}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <a 
                      href={docxModal.url} 
                      download 
                      className="btn btn-sm rounded-2 px-3 py-1 d-inline-flex align-items-center gap-1 text-decoration-none fw-semibold shadow-sm"
                      style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.8rem' }}
                    >
                      📥 Tải xuống (.docx)
                    </a>
                    <button 
                      type="button" 
                      className="btn-close" 
                      style={{ opacity: 0.8 }}
                      onClick={() => setDocxModal(null)}
                    ></button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="modal-body p-4 bg-light overflow-auto position-relative" style={{ height: 'calc(92vh - 120px)' }}>
                  {isDocLoading && (
                    <div className="d-flex flex-column align-items-center justify-content-center py-5">
                      <div className="spinner-border text-emerald mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                      <p className="text-muted fw-semibold">Đang đọc và hiển thị văn bản quy chế (.docx)...</p>
                    </div>
                  )}
                  <div 
                    ref={docxContainerRef} 
                    className="docx-viewer-content bg-white p-4 rounded-3 shadow-sm mx-auto"
                    style={{ maxWidth: '950px', minHeight: '500px' }}
                  />
                </div>

                {/* Modal Footer */}
                <div className="modal-footer bg-white py-2 px-4 border-top d-flex justify-content-between align-items-center">
                  <span className="text-muted fs-8">Dự án NOXH Marina Living Hạ Long</span>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm rounded-2 px-4 fw-semibold fs-8"
                    onClick={() => setDocxModal(null)}
                  >
                    Đóng Xem Văn Bản
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
