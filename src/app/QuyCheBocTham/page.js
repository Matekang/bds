'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function QuyCheBocThamPage() {
  const [activeTab, setActiveTab] = useState('phase1'); // 'phase1' | 'phase2' | 'simulator'

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

  // 11 Sample Applicants for Lottery Simulation (Covering K1 to K11)
  const sampleApplicants = [
    { id: 'HS-2026-1001', name: 'Nguyễn Văn An', cccd: '001092001234', category: 'K1 – Người có công với cách mạng', priority: 'Ưu tiên 1', preference: '2PN' },
    { id: 'HS-2026-1002', name: 'Trần Thị Bình', cccd: '035185002345', category: 'K2 – Hộ nghèo, cận nghèo nông thôn', priority: 'Thông thường', preference: '2PN' },
    { id: 'HS-2026-1003', name: 'Lê Hoàng Cường', cccd: '014090003456', category: 'K3 – Hộ nông thôn bị ảnh hưởng thiên tai', priority: 'Thông thường', preference: '2PN' },
    { id: 'HS-2026-1004', name: 'Phạm Minh Đức', cccd: '022088004567', category: 'K4 – Hộ nghèo, cận nghèo đô thị', priority: 'Ưu tiên 2', preference: '2PN' },
    { id: 'HS-2026-1005', name: 'Hoàng Thị Em', cccd: '030193005678', category: 'K5 – Người thu nhập thấp đô thị', priority: 'Thông thường', preference: '2PN' },
    { id: 'HS-2026-1006', name: 'Đỗ Quảng Giang', cccd: '038084006789', category: 'K6 – Công nhân KCN', priority: 'Thông thường', preference: '2PN' },
    { id: 'HS-2026-1007', name: 'Vũ Thị Hoa', cccd: '017195007890', category: 'K7 – Sĩ quan lực lượng vũ trang', priority: 'Ưu tiên 1', preference: '3PN' },
    { id: 'HS-2026-1008', name: 'Bùi Văn Hải', cccd: '026091008901', category: 'K8 – Cán bộ, công chức, viên chức', priority: 'Ưu tiên 2', preference: '3PN' },
    { id: 'HS-2026-1009', name: 'Đặng Kim Khanh', cccd: '001196009012', category: 'K9 – Đã trả lại nhà ở công vụ', priority: 'Thông thường', preference: '3PN' },
    { id: 'HS-2026-1010', name: 'Ngô Quốc Lập', cccd: '031087010123', category: 'K10 – Thu hồi đất, giải tỏa nhà', priority: 'Ưu tiên 1', preference: '3PN' },
    { id: 'HS-2026-1011', name: 'Trịnh Hoài Nam', cccd: '031099011234', category: 'K11 – Học sinh, sinh viên', priority: 'Thông thường', preference: '2PN' },
  ];

  // Single & Batch Lottery Draw Simulator State
  const [simGroup, setSimGroup] = useState('2PN'); // '2PN' | '3PN'
  const [simNv, setSimNv] = useState('NV1');
  const [simResult, setSimResult] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [batchResults, setBatchResults] = useState(null);
  const [isBatchDrawing, setIsBatchDrawing] = useState(false);

  // Logged-in user session & Popup Notification state
  const [currentUser, setCurrentUser] = useState(null);
  const [userResultModal, setUserResultModal] = useState(null);
  const [dbApprovedApps, setDbApprovedApps] = useState([]);
  const [kFilter, setKFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          setCurrentUser(data.session);
        }
      })
      .catch(() => {});

    fetch('/api/applications')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.applications) {
          const approved = data.applications.filter(a => a.status === 'approved' || a.status === 'luu_tru' || a.stage === 4);
          setDbApprovedApps(approved);
        }
      })
      .catch(() => {});
  }, []);

  const displayApplicants = dbApprovedApps.length > 0
    ? dbApprovedApps.map(a => ({
        id: a.id,
        name: a.fullName,
        cccd: a.cccdNumber || a.phoneNumber || 'Đã xác thực',
        phoneNumber: a.phoneNumber,
        email: a.email,
        category: `${a.targetObject || 'K1'} – Đối tượng NOXH`,
        priority: (a.targetObject === 'K1' || a.targetObject === 'K7' || a.targetObject === 'K10') ? 'Ưu tiên 1' : 'Thông thường',
        preference: a.unitType || '2PN'
      }))
    : sampleApplicants;

  const filteredDisplayApplicants = displayApplicants.filter(app => {
    if (kFilter === 'all') return true;
    return app.category.startsWith(kFilter);
  });

  const totalPages = Math.ceil(filteredDisplayApplicants.length / pageSize) || 1;
  const paginatedDisplayApplicants = (batchResults || filteredDisplayApplicants).slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSimulateDraw = () => {
    setIsDrawing(true);
    setSimResult(null);

    setTimeout(() => {
      setIsDrawing(false);
      const rand = Math.random();
      if (rand > 0.3) {
        // Trúng căn
        const tower = Math.random() > 0.5 ? 'Tòa A' : 'Tòa B';
        const floor = Math.floor(Math.random() * 15) + 2;
        const unitNum = Math.floor(Math.random() * 12) + 1;
        const area = simGroup === '2PN' ? (54.5 + Math.random() * 10).toFixed(1) : (72.0 + Math.random() * 8).toFixed(1);
        const code = `${tower === 'Tòa A' ? 'A' : 'B'}${floor.toString().padStart(2, '0')}.${unitNum.toString().padStart(2, '0')}`;
        
        setSimResult({
          type: 'SUCCESS',
          title: 'CHÚC MỪNG! BẠN ĐÃ BỐC TRÚNG CĂN HỘ',
          tower,
          floor: `Tầng ${floor}`,
          code,
          area: `${area} m²`,
          group: simGroup === '2PN' ? 'Nhóm 1 (2 Phòng Ngủ)' : 'Nhóm 2 (3 Phòng Ngủ)',
          note: 'Biên bản kết quả bốc thăm sẽ được xác lập ngay tại Hội đồng bốc thăm.'
        });
      } else if (rand > 0.1) {
        // Phiếu trắng -> chuyển NV
        setSimResult({
          type: 'WHITE_TICKET',
          title: 'PHIẾU TRẮNG - CHUYỂN BỐC NGUYỆN VỌNG KẾ TIẾP',
          note: 'Bạn chưa bốc trúng căn hộ ở Nguyện vọng 1. Theo Điều 9 Quy chế, bạn được quyền tiếp tục tham gia bốc thăm ở Nhóm diện tích theo Nguyện vọng kế tiếp (nếu còn quỹ căn).',
          nextAction: 'Đến bàn bốc thăm Nhóm diện tích Nguyện vọng 2'
        });
      } else {
        // Phiếu dự khuyết
        const reserveNum = Math.floor(Math.random() * 20) + 1;
        setSimResult({
          type: 'RESERVE',
          title: `PHIẾU DỰ KHUYẾT QUYỀN MUA - SỐ THỨ TỰ #${reserveNum}`,
          note: 'Trong trường hợp có khách hàng từ bỏ quyền mua hoặc hồ sơ bị loại sau thẩm định, CĐT sẽ liên hệ với bạn theo thứ tự phiếu dự khuyết trong thời hạn 03 ngày.',
          reserveNum
        });
      }
    }, 1200);
  };

  const handleBatchDraw = () => {
    setIsBatchDrawing(true);
    setBatchResults(null);

    setTimeout(() => {
      setIsBatchDrawing(false);
      let reserveCounter = 1;

      const results = displayApplicants.map((app, idx) => {
        const rand = Math.random();
        const successThreshold = app.priority.includes('Ưu tiên') ? 0.2 : 0.35;
        const whiteTicketThreshold = 0.12;

        if (rand > successThreshold) {
          const tower = (idx % 2 === 0) ? 'Tòa A' : 'Tòa B';
          const floor = Math.floor(Math.random() * 18) + 2;
          const unitNum = Math.floor(Math.random() * 10) + 1;
          const area = app.preference === '2PN' ? (54.5 + (idx % 4) * 2.5).toFixed(1) : (71.5 + (idx % 3) * 2.8).toFixed(1);
          const code = `${tower === 'Tòa A' ? 'A' : 'B'}${floor.toString().padStart(2, '0')}.${unitNum.toString().padStart(2, '0')}`;

          return {
            ...app,
            type: 'SUCCESS',
            statusLabel: '🎯 Trúng căn hộ',
            badgeClass: 'bg-success text-white',
            tower,
            floor: `Tầng ${floor}`,
            code,
            area: `${area} m²`,
            details: `${tower} - Tầng ${floor} - Mã ${code} (${area} m²)`
          };
        } else if (rand > whiteTicketThreshold) {
          return {
            ...app,
            type: 'WHITE_TICKET',
            statusLabel: '⚪ Phiếu trắng',
            badgeClass: 'bg-warning text-dark',
            details: 'Phiếu trắng NV1 (Được chuyển bốc NV2)'
          };
        } else {
          const reserveNum = reserveCounter++;
          return {
            ...app,
            type: 'RESERVE',
            statusLabel: `📋 Dự khuyết #${reserveNum}`,
            badgeClass: 'bg-secondary text-white',
            reserveNum,
            details: `Phiếu dự khuyết thứ tự #${reserveNum}`
          };
        }
      });

      setBatchResults(results);

      // Auto trigger popup notification for logged-in user or first applicant
      if (currentUser) {
        const myResult = results.find(r => 
          (r.phoneNumber && r.phoneNumber === currentUser.phoneNumber) ||
          (r.email && currentUser.email && r.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (r.name && currentUser.fullName && r.name.toLowerCase().trim() === currentUser.fullName.toLowerCase().trim()) ||
          (r.cccd && currentUser.cccd && r.cccd === currentUser.cccd)
        );
        if (myResult) {
          setUserResultModal(myResult);
        } else {
          setUserResultModal(results[0]);
        }
      } else {
        setUserResultModal(results[0]);
      }
    }, 1500);
  };

  return (
    <div className="bg-soft py-5">
      <div className="container" style={{ maxWidth: '1080px' }}>
        
        {/* Header Hero Section */}
        <div className="text-center mb-5">
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 bg-warning bg-opacity-10 text-dark rounded-pill fw-semibold small mb-3 border border-warning border-opacity-25">
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
            <a 
              href="/files/1_boc_tham_quyen_uu_tien_quyen_mua_can_ho.docx" 
              download
              className="btn btn-sm rounded-pill px-3 py-1.5 border shadow-sm cursor-pointer d-inline-flex align-items-center gap-1.5 text-decoration-none"
              style={{ backgroundColor: '#e0f7ff', color: '#0284c7', borderColor: '#b3f0ff', fontSize: '0.83rem', fontWeight: '500' }}
            >
              📖 Sổ tay Quy chế 1: Quyền ưu tiên &amp; Quyền mua (.docx)
            </a>
            <a 
              href="/files/2_boc_tham_vi_tri.docx" 
              download
              className="btn btn-sm rounded-pill px-3 py-1.5 border shadow-sm cursor-pointer d-inline-flex align-items-center gap-1.5 text-decoration-none"
              style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0', fontSize: '0.83rem', fontWeight: '500' }}
            >
              📖 Sổ tay Quy chế 2: Bốc thăm Vị trí căn hộ (.docx)
            </a>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="d-flex justify-content-center mb-4">
          <div className="bg-white p-1.5 rounded-pill shadow-sm border d-inline-flex gap-1">
            <button
              onClick={() => setActiveTab('phase1')}
              className={`btn rounded-pill px-4 py-2.5 fw-bold transition-all ${
                activeTab === 'phase1' 
                  ? 'btn-emerald shadow-sm' 
                  : 'btn-light text-muted border-0'
              }`}
            >
               Giai Đoạn 1: Quyền Ưu Tiên & Quyền Mua
            </button>
            <button
              onClick={() => setActiveTab('phase2')}
              className={`btn rounded-pill px-4 py-2.5 fw-bold transition-all ${
                activeTab === 'phase2' 
                  ? 'btn-emerald shadow-sm' 
                  : 'btn-light text-muted border-0'
              }`}
            >
               Giai Đoạn 2: Vị Trí & Diện Tích Căn Hộ
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`btn rounded-pill px-4 py-2.5 fw-bold transition-all ${
                activeTab === 'simulator' 
                  ? 'btn-gold shadow-sm text-dark' 
                  : 'btn-light text-muted border-0'
              }`}
            >
              🎲 Giả Lập Bốc Thăm Thử
            </button>
          </div>
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
                      <span className="badge bg-gold text-dark fw-bold px-3 py-1.5 rounded-pill mb-3">
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
                      <span className="badge bg-emerald text-white fw-bold px-3 py-1.5 rounded-pill mb-3">
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
                <span className="badge bg-emerald rounded-pill px-3 py-1.5 fs-7">
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
        {/* TAB 3: TRẢI NGHIỆM GIẢ LẬP BỐC THĂM TRỰC TUYẾN (11 HỒ SƠ K1-K11) */}
        {/* ========================================================================= */}
        {activeTab === 'simulator' && (
          <div className="animate-fade-in">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden bg-white">
              <div className="card-header bg-emerald text-white py-4 px-4 text-center">
                <span className="badge bg-gold text-dark rounded-pill px-3 py-1 fw-bold mb-2">MÔ PHỎNG THỰC TẾ 11 NHÓM ĐỐI TƯỢNG (K1 ĐẾN K11)</span>
                <h3 className="fw-extrabold mb-1">🎲 BỘ GIẢ LẬP BỐC THĂM 11 HỒ SƠ (ĐỦ K1 ĐẾN K11)</h3>
                <p className="text-light opacity-75 small mb-0">
                  Thử nghiệm quy trình bốc thăm ngẫu nhiên cho 11 khách hàng đại diện đầy đủ 11 nhóm đối tượng K1 – K11 theo Luật Nhà ở.
                </p>
              </div>

              <div className="card-body p-4 p-md-5">
                {/* Control Panel */}
                <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap mb-4">
                  <button 
                    onClick={handleBatchDraw}
                    disabled={isBatchDrawing || isDrawing}
                    className="btn btn-gold btn-lg px-4 py-3 rounded-pill fw-extrabold shadow hover-scale d-inline-flex align-items-center gap-2"
                  >
                    {isBatchDrawing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Đang quay số bốc thăm cho 11 hồ sơ (K1-K11)...
                      </>
                    ) : (
                      <>🔥 BỐC THĂM HÀNG LOẠT CHO 11 HỒ SƠ (K1-K11)</>
                    )}
                  </button>

                  <button 
                    onClick={handleSimulateDraw}
                    disabled={isDrawing || isBatchDrawing}
                    className="btn btn-outline-success btn-lg px-4 py-3 rounded-pill fw-bold d-inline-flex align-items-center gap-2"
                  >
                    {isDrawing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Đang bốc 1 phiếu...
                      </>
                    ) : (
                      <>🎯 Bốc Thử 1 Cá Nhân</>
                    )}
                  </button>
                </div>

                {/* Single Simulator Output if triggered */}
                {simResult && (
                  <div className="mb-4 p-4 rounded-4 shadow-sm text-center animate-scale-up" style={{
                    backgroundColor: simResult.type === 'SUCCESS' ? '#e8f5ee' : simResult.type === 'WHITE_TICKET' ? '#fff9e6' : '#f8f9fa',
                    border: simResult.type === 'SUCCESS' ? '2px solid #0b3c26' : simResult.type === 'WHITE_TICKET' ? '2px solid #f5a623' : '2px solid #6c757d'
                  }}>
                    <h5 className={`fw-extrabold mb-2 ${
                      simResult.type === 'SUCCESS' ? 'text-success' : simResult.type === 'WHITE_TICKET' ? 'text-warning text-dark' : 'text-secondary'
                    }`}>
                      {simResult.title}
                    </h5>

                    {simResult.type === 'SUCCESS' && (
                      <div className="row g-2 justify-content-center my-2">
                        <div className="col-auto">
                          <div className="p-2 px-3 bg-white rounded-3 border text-center shadow-sm">
                            <span className="d-block text-muted fs-8">Tòa nhà</span>
                            <span className="fs-5 fw-bold text-emerald">{simResult.tower}</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="p-2 px-3 bg-white rounded-3 border text-center shadow-sm">
                            <span className="d-block text-muted fs-8">Tầng</span>
                            <span className="fs-5 fw-bold text-emerald">{simResult.floor}</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="p-2 px-3 bg-white rounded-3 border text-center shadow-sm">
                            <span className="d-block text-muted fs-8">Mã Căn</span>
                            <span className="fs-5 fw-bold text-gold">{simResult.code}</span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <div className="p-2 px-3 bg-white rounded-3 border text-center shadow-sm">
                            <span className="d-block text-muted fs-8">Diện Tích</span>
                            <span className="fs-5 fw-bold text-dark">{simResult.area}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-muted small mb-0">{simResult.note}</p>
                  </div>
                )}

                {/* Batch Statistics Cards (when batch drawn) */}
                {batchResults && (
                  <div className="row g-3 mb-4 text-center animate-fade-in">
                    <div className="col-md-4">
                      <div className="p-3 rounded-3 bg-success bg-opacity-10 border border-success border-opacity-25">
                        <span className="d-block fs-7 text-success fw-bold text-uppercase">🎯 Trúng Quyền Mua / Vị trí</span>
                        <span className="fs-2 fw-extrabold text-success">
                          {batchResults.filter(r => r.type === 'SUCCESS').length} / 11
                        </span>
                        <span className="d-block fs-8 text-muted">Hồ sơ đã bốc được căn hộ</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="p-3 rounded-3 bg-warning bg-opacity-10 border border-warning border-opacity-25">
                        <span className="d-block fs-7 text-warning text-dark fw-bold text-uppercase">⚪ Phiếu Trắng (Chuyển NV2)</span>
                        <span className="fs-2 fw-extrabold text-warning text-dark">
                          {batchResults.filter(r => r.type === 'WHITE_TICKET').length} / 11
                        </span>
                        <span className="d-block fs-8 text-muted">Được tiếp tục bốc đợt NV2</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="p-3 rounded-3 bg-secondary bg-opacity-10 border border-secondary border-opacity-25">
                        <span className="d-block fs-7 text-secondary fw-bold text-uppercase">📋 Phiếu Dự Khuyết</span>
                        <span className="fs-2 fw-extrabold text-secondary">
                          {batchResults.filter(r => r.type === 'RESERVE').length} / 11
                        </span>
                        <span className="d-block fs-8 text-muted">Hồ sơ nằm trong danh sách dự bị</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* K-Group Filter Pills */}
                <div className="d-flex align-items-center gap-1.5 flex-wrap mb-3 p-2 bg-light rounded-3 border">
                  <span className="fw-bold fs-8 text-dark me-1">📋 Lọc theo Nhóm Đối Tượng K:</span>
                  {['all', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10', 'K11'].map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => { setKFilter(k); setCurrentPage(1); }}
                      style={{
                        padding: '4px 10px', borderRadius: '14px', border: '1px solid ' + (kFilter === k ? '#0b6640' : '#cbd5e1'), fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                        backgroundColor: kFilter === k ? '#0b6640' : '#fff', color: kFilter === k ? '#fff' : '#334155'
                      }}
                    >
                      {k === 'all' ? '🌐 Tất cả K' : k}
                    </button>
                  ))}
                </div>

                {/* Applicants Table & Results */}
                <div className="table-responsive border rounded-3 overflow-hidden shadow-sm">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-dark fs-8 text-uppercase">
                      <tr>
                        <th style={{ width: '5%' }}>STT</th>
                        <th style={{ width: '12%' }}>Mã Hồ Sơ</th>
                        <th style={{ width: '18%' }}>Họ &amp; Tên Người Dân</th>
                        <th style={{ width: '13%' }}>Số CCCD</th>
                        <th style={{ width: '22%' }}>Nhóm Đối Tượng (NĐ100)</th>
                        <th style={{ width: '10%' }}>Ưu Tiên</th>
                        <th style={{ width: '20%' }}>Kết Quả Bốc Thăm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDisplayApplicants.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted fs-7">
                            Không tìm thấy hồ sơ nào thuộc nhóm K này.
                          </td>
                        </tr>
                      ) : (
                        paginatedDisplayApplicants.map((app, idx) => {
                          const globalIdx = (currentPage - 1) * pageSize + idx;
                          const isResultAvailable = !!batchResults;
                          return (
                            <tr key={app.id} className={app.type === 'SUCCESS' ? 'table-success bg-opacity-10' : ''}>
                              <td className="fw-bold text-secondary text-center">{globalIdx + 1}</td>
                              <td>
                                <span className="badge bg-light text-dark border font-monospace fs-8">{app.id}</span>
                              </td>
                              <td>
                                <div className="fw-bold text-dark fs-7">{app.name}</div>
                                <span className="badge bg-secondary bg-opacity-10 text-dark border fs-8">NV: {app.preference}</span>
                              </td>
                              <td className="font-monospace fs-8 text-muted">{app.cccd}</td>
                              <td className="fs-8 text-secondary">{app.category}</td>
                              <td>
                                <span className={`badge fs-8 ${app.priority.includes('Ưu tiên') ? 'bg-primary text-white' : 'bg-light text-dark border'}`}>
                                  {app.priority}
                                </span>
                              </td>
                              <td>
                                {isResultAvailable ? (
                                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
                                    <div>
                                      <span className={`badge px-2.5 py-1 rounded-pill mb-1 fs-8 ${app.badgeClass}`}>
                                        {app.statusLabel}
                                      </span>
                                      {app.type === 'SUCCESS' && (
                                        <div className="fs-8 fw-semibold text-success">
                                          🏠 {app.details}
                                        </div>
                                      )}
                                      {app.type === 'WHITE_TICKET' && (
                                        <div className="fs-8 text-muted">
                                          Chờ chuyển bốc NV2
                                        </div>
                                      )}
                                      {app.type === 'RESERVE' && (
                                        <div className="fs-8 text-secondary">
                                          {app.details}
                                        </div>
                                      )}
                                    </div>
                                    <button 
                                      type="button" 
                                      className="btn btn-sm btn-outline-primary rounded-pill px-2 py-0.5 fs-8"
                                      onClick={() => setUserResultModal(app)}
                                      title="Xem Thông báo Popup"
                                    >
                                      🔔 Xem Popup
                                    </button>
                                  </div>
                                ) : (
                                  <span className="badge bg-light text-muted border fs-8">Chờ mở bốc thăm...</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top flex-wrap gap-2">
                  <div className="text-muted fs-8">
                    Hiển thị <strong>{filteredDisplayApplicants.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> – <strong>{Math.min(currentPage * pageSize, filteredDisplayApplicants.length)}</strong> trên tổng số <strong>{filteredDisplayApplicants.length}</strong> hồ sơ bốc thăm
                  </div>

                  <div className="d-flex align-items-center gap-1.5">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 py-1 fs-8 fw-semibold"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      ◀ Trang trước
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        type="button"
                        className={`btn btn-sm rounded-circle fw-bold fs-8 ${currentPage === page ? 'btn-emerald text-white' : 'btn-light text-dark border'}`}
                        style={{ width: '32px', height: '32px', padding: 0 }}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 py-1 fs-8 fw-semibold"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      Trang sau ▶
                    </button>
                  </div>
                </div>

                {/* Section Tài khoản Đăng nhập Demo phục vụ Test các Tính năng & Giai đoạn */}
                <div className="mt-4 p-3 bg-light rounded-3 border">
                  <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <div className="fw-bold text-emerald fs-7 d-flex align-items-center gap-1.5">
                      <span>🔑 Danh Sách Tài Khoản Demo Test Đầy Đủ Các Nút Thao Tác &amp; Giai Đoạn Hồ Sơ</span>
                      <span className="badge bg-success text-white fs-8">Mật khẩu chung: 123456</span>
                    </div>
                    <span className="text-muted fs-8">Có thể đăng nhập bằng Số điện thoại, Email hoặc Số CCCD</span>
                  </div>

                  <div className="row g-2">
                    {/* Nút thao tác nhanh Demo Accounts */}
                    <div className="col-12">
                      <div className="p-2 bg-warning bg-opacity-10 border border-warning rounded-3 fs-8 mb-1 fw-semibold text-dark">
                        ⚡ Tài khoản công dân test 4 Nút Thao Tác Nhanh Admin:
                      </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                      <div className="p-2 bg-white rounded border fs-8 h-100 border-warning">
                        <div className="fw-bold text-dark">🔴 Vũ Đức Phong (HS-2026-5001)</div>
                        <div className="text-warning-emphasis fw-semibold fs-8">Trạng thái: Trả về bổ sung</div>
                        <div className="text-muted">📱 SĐT: <code className="text-primary">0985555001</code></div>
                        <div className="text-muted">🪪 CCCD: <code className="text-dark">026091005001</code></div>
                      </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                      <div className="p-2 bg-white rounded border fs-8 h-100 border-danger">
                        <div className="fw-bold text-dark">❌ Lý Thị Tú (HS-2026-4001)</div>
                        <div className="text-danger fw-semibold fs-8">Trạng thái: Từ chối (Sai nhóm K)</div>
                        <div className="text-muted">📱 SĐT: <code className="text-primary">0984444001</code></div>
                        <div className="text-muted">🪪 CCCD: <code className="text-dark">031087004001</code></div>
                      </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                      <div className="p-2 bg-white rounded border fs-8 h-100 border-purple" style={{ borderColor: '#7c3aed' }}>
                        <div className="fw-bold text-dark">🟣 Hoàng Thị Kim (HS-2026-7001)</div>
                        <div className="text-purple fw-semibold fs-8" style={{ color: '#7c3aed' }}>Trạng thái: GĐ 2 - Tổ kiểm soát</div>
                        <div className="text-muted">📱 SĐT: <code className="text-primary">0987777001</code></div>
                        <div className="text-muted">🪪 CCCD: <code className="text-dark">030193007001</code></div>
                      </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                      <div className="p-2 bg-white rounded border fs-8 h-100 border-primary">
                        <div className="fw-bold text-dark">🟠 Phạm Thị Nga (HS-2026-6001)</div>
                        <div className="text-primary fw-semibold fs-8">Trạng thái: GĐ 3 - Hẹn nộp bản gốc</div>
                        <div className="text-muted">📱 SĐT: <code className="text-primary">0986666001</code></div>
                        <div className="text-muted">🪪 CCCD: <code className="text-dark">017195006001</code></div>
                      </div>
                    </div>

                    {/* Danh sách 11 hồ sơ bốc thăm */}
                    <div className="col-12 mt-2">
                      <div className="p-2 bg-success bg-opacity-10 border border-success rounded-3 fs-8 mb-1 fw-semibold text-dark">
                        🟢 Danh sách tài khoản 11 Hồ sơ đủ điều kiện bốc thăm (K1 - K11):
                      </div>
                    </div>

                    {sampleApplicants.map((app, idx) => (
                      <div key={app.id} className="col-md-4 col-sm-6">
                        <div className="p-2 bg-white rounded border fs-8">
                          <div className="fw-bold text-dark">{idx + 1}. {app.name} ({app.id})</div>
                          <div className="text-muted">📱 SĐT: <code className="text-primary">{`09811110${(idx + 1).toString().padStart(2, '0')}`}</code></div>
                          <div className="text-muted">🪪 CCCD: <code className="text-dark">{app.cccd}</code></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 text-end text-muted fs-8">
                  * Danh sách 11 hồ sơ đã được thẩm định điều kiện nộp theo đúng Nghị định 100/2015/NĐ-CP &amp; NĐ 261/2025/NĐ-CP.
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
            <Link href="/cungbanmuanha" className="btn btn-emerald rounded-pill px-4">
              📘 Xem Cẩm Nang Mua Nhà
            </Link>
            <a href="tel:19006666" className="btn btn-outline-success rounded-pill px-4 fw-bold">
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
                      <span className={`badge rounded-pill fs-8 ${userResultModal.type === 'WHITE_TICKET' ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
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
                      <div className="badge bg-success text-white px-3.5 py-1.5 rounded-pill mb-2 fw-bold fs-7 shadow-sm">
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
                      <div className="badge bg-warning text-dark px-3 py-1.5 rounded-pill mb-2 fw-bold fs-7 shadow-sm">
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
                      <div className="badge bg-secondary text-white px-3 py-1.5 rounded-pill mb-2 fw-bold fs-7 shadow-sm">
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
                    className="btn btn-secondary btn-sm rounded-pill px-4 fw-semibold fs-8"
                    onClick={() => setUserResultModal(null)}
                  >
                    Đóng Thông Báo
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
