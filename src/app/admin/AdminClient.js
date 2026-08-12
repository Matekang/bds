'use client';

import React, { useState, useEffect } from 'react';

const getRoleInfo = (role) => {
  switch (role) {
    case 'officer_intake':
      return { title: 'Tổ Tiếp Nhận', stage: 1, badge: '🔵 TỔ TIẾP NHẬN (GĐ 1)', allowedTabs: ['overview', 'applications'] };
    case 'officer_control':
      return { title: 'Tổ Kiểm Soát', stage: 2, badge: '🟣 TỔ KIỂM SOÁT (GĐ 2)', allowedTabs: ['overview', 'applications'] };
    case 'officer_hardcopy':
      return { title: 'Bộ Phận Bản Gốc', stage: 3, badge: '🟠 BỘ PHẬN BẢN GỐC (GĐ 3)', allowedTabs: ['overview', 'applications'] };
    case 'officer_archive':
      return { title: 'Bộ Phận Lưu Trữ', stage: 4, badge: '🟢 BỘ PHẬN LƯU TRỮ (GĐ 4)', allowedTabs: ['overview', 'applications', 'units'] };
    case 'admin':
    default:
      return { title: 'Super Admin Hapro', stage: null, badge: '👑 SUPER ADMIN', allowedTabs: ['overview', 'applications', 'units', 'settings'] };
  }
};

const isStageAllowed = (userRole, appStage) => {
  if (!userRole || userRole === 'admin') return true;
  if (userRole === 'officer_intake' && (appStage === 1 || !appStage)) return true;
  if (userRole === 'officer_control' && appStage === 2) return true;
  if (userRole === 'officer_hardcopy' && appStage === 3) return true;
  if (userRole === 'officer_archive' && appStage === 4) return true;
  return false;
};

export default function AdminClient({ session, initialApplications, initialUnits, initialDeadline }) {
  const roleInfo = getRoleInfo(session?.role);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('applications'); // 'overview' | 'applications' | 'units' | 'settings'

  // Application Data States
  const [apps, setApps] = useState(initialApplications || []);
  const [selectedApp, setSelectedApp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all'); // 'all' | 'intake' | 'control' | 'hardcopy' | 'archive' | 'returned' | 'wrong_k'
  const [kFilter, setKFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [officerFilter, setOfficerFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');

  // Reset trang về 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [stageFilter, statusFilter, kFilter, searchQuery, officerFilter, shiftFilter]);

  // Form states cho Duyệt Hồ Sơ
  const [appStatus, setAppStatus] = useState('');
  const [appStage, setAppStage] = useState(1);
  const [appNotes, setAppNotes] = useState('');
  const [assignedOfficer, setAssignedOfficer] = useState('Nguyễn Văn Tùng');
  const [shift, setShift] = useState('morning');
  const [appMessage, setAppMessage] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  // Quick Action Handler
  const handleExecuteAction = async (actionType, defaultNote = '') => {
    if (!selectedApp) return;
    setAppMessage('');

    try {
      const res = await fetch(`/api/applications/${selectedApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          notes: appNotes || defaultNote,
          assignedOfficer,
          shift
        })
      });
      const data = await res.json();

      if (data.success) {
        setAppMessage(`🎉 Xử lý thành công [${actionType.toUpperCase()}]!`);
        
        // Tự động chuyển danh sách lọc sang đúng vị trí giai đoạn mới của hồ sơ
        if (actionType === 'bypass_intake') {
          setStageFilter('control');
        } else if (actionType === 'approve_digital') {
          setStageFilter('hardcopy');
        } else if (actionType === 'archive') {
          setStageFilter('archive');
        } else if (actionType === 'return_to_citizen') {
          setStageFilter('returned');
        } else if (actionType === 'reject_wrong_k') {
          setStageFilter('wrong_k');
        }
        setStatusFilter('all');

        reloadApplications();
      } else {
        setAppMessage(`⚠️ Thất bại: ${data.message}`);
      }
    } catch (err) {
      setAppMessage('⚠️ Lỗi kết nối máy chủ.');
    }
  };

  // Units / Inventory States
  const [units, setUnits] = useState(initialUnits || []);
  const [unitFloor, setUnitFloor] = useState(1);
  const [unitTypeFilter, setUnitTypeFilter] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitStatus, setUnitStatus] = useState('');
  const [unitMessage, setUnitMessage] = useState('');

  // Settings States
  const [deadlineVal, setDeadlineVal] = useState(initialDeadline || '');
  const [settingsMessage, setSettingsMessage] = useState('');

  // Logout Handler
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  // --- Reload Helpers ---
  const reloadApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) {
        setApps(data.applications);
        if (selectedApp) {
          const updated = data.applications.find(a => a.id === selectedApp.id);
          setSelectedApp(updated || null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const reloadUnits = async () => {
    try {
      const res = await fetch('/api/units');
      const data = await res.json();
      if (data.success) {
        setUnits(data.units);
        if (selectedUnit) {
          const updated = data.units.find(u => u.id === selectedUnit.id);
          setSelectedUnit(updated || null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Actions ---
  const handleUpdateApp = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setAppMessage('');
    try {
      const res = await fetch(`/api/applications/${selectedApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: appStatus, notes: appNotes, stage: appStage })
      });
      const data = await res.json();

      if (data.success) {
        setAppMessage('🎉 Cập nhật trạng thái hồ sơ thành công!');
        reloadApplications();
      } else {
        setAppMessage(`⚠️ Thất bại: ${data.message}`);
      }
    } catch (err) {
      setAppMessage('⚠️ Lỗi kết nối máy chủ.');
    }
  };

  const handleUpdateUnit = async (e) => {
    e.preventDefault();
    if (!selectedUnit) return;

    setUnitMessage('');
    try {
      const updateRes = await fetch(`/api/units`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: selectedUnit.id, status: unitStatus })
      });
      const updateData = await updateRes.json();

      if (updateData.success) {
        setUnitMessage('🎉 Cập nhật trạng thái căn hộ thành công!');
        reloadUnits();
      } else {
        setUnitMessage(`⚠️ Lỗi: ${updateData.message}`);
      }
    } catch (err) {
      setUnitMessage('⚠️ Lỗi kết nối.');
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSettingsMessage('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countdownDeadline: deadlineVal })
      });
      const data = await res.json();

      if (data.success) {
        setSettingsMessage('🎉 Đã cập nhật hạn chót nộp hồ sơ!');
      } else {
        setSettingsMessage(`⚠️ Lỗi: ${data.message}`);
      }
    } catch (err) {
      setSettingsMessage('⚠️ Lỗi kết nối.');
    }
  };

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    setAppStatus(app.status || 'submitted');
    setAppStage(app.stage || 1);
    setAppNotes(app.notes || '');
    setAppMessage('');
  };

  const handleSelectUnit = (unit) => {
    setSelectedUnit(unit);
    setUnitStatus(unit.status);
    setUnitMessage('');
  };

  // Filtered lists
  const filteredApps = apps.filter(app => {
    const matchesSearch = 
      app.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phoneNumber?.includes(searchQuery) ||
      app.cccdNumber?.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter || (statusFilter === 'approved' && (app.status === 'approved' || app.status === 'luu_tru'));
    
    let matchesStage = true;
    if (stageFilter === 'intake') matchesStage = app.status === 'submitted' || (app.stage === 1 && app.status !== 'returned_for_supplement' && app.status !== 'rejected_wrong_k');
    else if (stageFilter === 'control') matchesStage = app.status === 'to_kiem_soat' || app.stage === 2;
    else if (stageFilter === 'hardcopy') matchesStage = app.status === 'bo_sung_ban_goc' || app.stage === 3;
    else if (stageFilter === 'archive') matchesStage = app.status === 'approved' || app.status === 'luu_tru' || app.stage === 4;
    else if (stageFilter === 'returned') matchesStage = app.status === 'returned_for_supplement';
    else if (stageFilter === 'wrong_k') matchesStage = app.status === 'rejected_wrong_k';

    const matchesK = kFilter === 'all' || app.targetObject === kFilter || app.targetObject?.startsWith(kFilter);

    const matchesOfficer = officerFilter === 'all' || app.assignedOfficer === officerFilter;
    const matchesShift = shiftFilter === 'all' || app.shift === shiftFilter;

    return matchesSearch && matchesStatus && matchesStage && matchesK && matchesOfficer && matchesShift;
  }).sort((a, b) => {
    const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '');
  });

  const totalPages = Math.ceil(filteredApps.length / pageSize) || 1;
  const paginatedApps = filteredApps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const filteredUnits = units.filter(u => {
    const matchesFloor = u.floor === parseInt(unitFloor, 10);
    const matchesType = unitTypeFilter === 'all' || u.type === unitTypeFilter;
    return matchesFloor && matchesType;
  });

  // Calculate Metrics
  const totalAppsCount = apps.length;
  const reviewingAppsCount = apps.filter(a => a.status === 'reviewing' || a.status === 'submitted').length;
  const approvedAppsCount = apps.filter(a => a.status === 'approved').length;
  const rejectedAppsCount = apps.filter(a => a.status === 'rejected').length;

  const totalUnits = units.length;
  const availableUnitsCount = units.filter(u => u.status === 'available').length;
  const reservedUnitsCount = units.filter(u => u.status === 'reserved').length;
  const soldUnitsCount = units.filter(u => u.status === 'sold').length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* 1. CORPORATE SIDEBAR (Dark Navy Bar #0f172a) */}
      <aside style={{ width: '270px', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '4px 0 24px rgba(0,0,0,0.12)' }}>
        
        {/* Brand Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontWeight: 'bold', fontSize: '20px' }}>
              🛡️
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '0.5px', color: '#ffffff' }}>
                HAPRO ADMIN
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quản lý Nhà Ở Xã Hội
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Menu Nav */}
        <div style={{ padding: '20px 12px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px 8px 12px' }}>
            Menu Quản Trị
          </div>

          <button 
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', borderRadius: '10px', border: 'none',
              backgroundColor: activeTab === 'overview' ? '#059669' : 'transparent', color: activeTab === 'overview' ? '#fff' : '#cbd5e1',
              fontWeight: activeTab === 'overview' ? '700' : '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>📊</span>
              <span>Tổng Quan Hệ Thống</span>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('applications')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', borderRadius: '10px', border: 'none',
              backgroundColor: activeTab === 'applications' ? '#059669' : 'transparent', color: activeTab === 'applications' ? '#fff' : '#cbd5e1',
              fontWeight: activeTab === 'applications' ? '700' : '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>📁</span>
              <span>Duyệt Hồ Sơ Đăng Ký</span>
            </div>
            {reviewingAppsCount > 0 && (
              <span style={{ backgroundColor: activeTab === 'applications' ? '#fff' : '#ef4444', color: activeTab === 'applications' ? '#059669' : '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                {reviewingAppsCount}
              </span>
            )}
          </button>

          {roleInfo.allowedTabs.includes('units') && (
            <button 
              onClick={() => setActiveTab('units')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', borderRadius: '10px', border: 'none',
                backgroundColor: activeTab === 'units' ? '#059669' : 'transparent', color: activeTab === 'units' ? '#fff' : '#cbd5e1',
                fontWeight: activeTab === 'units' ? '700' : '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px' }}>🏢</span>
                <span>Bảng Hàng Căn Hộ</span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{availableUnitsCount}/{totalUnits}</span>
            </button>
          )}

          {roleInfo.allowedTabs.includes('settings') && (
            <button 
              onClick={() => setActiveTab('settings')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', borderRadius: '10px', border: 'none',
                backgroundColor: activeTab === 'settings' ? '#059669' : 'transparent', color: activeTab === 'settings' ? '#fff' : '#cbd5e1',
                fontWeight: activeTab === 'settings' ? '700' : '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px' }}>⚙️</span>
                <span>Cài Đặt Đợt Nhận</span>
              </div>
            </button>
          )}

          <a 
            href="/"
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '10px',
              color: '#94a3b8', textDecoration: 'none', marginTop: 'auto', fontSize: '14px'
            }}
          >
            <span>🌐</span>
            <span>Trở về Website Dân Dụng</span>
          </a>
        </div>

        {/* Admin Profile Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
              {(session?.fullName || 'A').charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{session?.fullName || 'Cán bộ Hapro'}</div>
              <div style={{ fontSize: '10px', color: '#34d399', fontWeight: 'bold' }}>{roleInfo.badge}</div>
            </div>
          </div>

          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            Thoát
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        
        {/* Top Console Bar */}
        <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Hệ thống Quản trị Hapro / {activeTab.toUpperCase()}
            </div>
            <h4 style={{ margin: 0, fontWeight: '800', color: '#0f172a' }}>
              {activeTab === 'overview' && '📊 Thống Kê Tổng Quan & Báo Cáo'}
              {activeTab === 'applications' && '📁 Quản Lý & Duyệt Hồ Sơ Đăng Ký'}
              {activeTab === 'units' && '🏢 Quản Lý Bảng Hàng & Đặt Chỗ Căn Hộ'}
              {activeTab === 'settings' && '⚙️ Cài Đặt Hệ Thống & Thời Hạn Nộp'}
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold' }}>
              🟢 Máy chủ: Hoạt động bình thường
            </span>

            <button 
              onClick={() => { reloadApplications(); reloadUnits(); }}
              style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
            >
              🔄 Tải lại dữ liệu
            </button>
          </div>
        </header>

        {/* Dashboard Body Area */}
        <main style={{ padding: '32px', flexGrow: 1 }}>

          {/* TAB 1: OVERVIEW ANALYTICS */}
          {activeTab === 'overview' && (
            <div>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <span>TỔNG HỒ SƠ</span>
                    <span>📁</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '8px' }}>{totalAppsCount}</div>
                  <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold', marginTop: '4px' }}>Đợt 1 - NOXH Marina Living</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <span>ĐANG THẨM ĐỊNH</span>
                    <span>⏳</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#d97706', marginTop: '8px' }}>{reviewingAppsCount}</div>
                  <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 'bold', marginTop: '4px' }}>Cần xử lý bản mềm/cứng</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <span>ĐÃ DỰỆT SUẤT MUA</span>
                    <span>✅</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#059669', marginTop: '8px' }}>{approvedAppsCount}</div>
                  <div style={{ fontSize: '12px', color: '#059669', fontWeight: 'bold', marginTop: '4px' }}>Đủ điều kiện mua nhà</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <span>CĂN HỘ ĐÃ ĐẶT/BÁN</span>
                    <span>🏢</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#2563eb', marginTop: '8px' }}>{reservedUnitsCount + soldUnitsCount} / {totalUnits}</div>
                  <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold', marginTop: '4px' }}>Tỷ lệ lấp đầy: {Math.round(((reservedUnitsCount + soldUnitsCount) / (totalUnits || 1)) * 100)}%</div>
                </div>

              </div>

              {/* Status Breakdown Charts Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                  <h5 style={{ fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>Phân Loại Trạng Thái Hồ Sơ</h5>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>
                        <span>Đã phê duyệt ({approvedAppsCount})</span>
                        <span style={{ color: '#059669' }}>{totalAppsCount ? Math.round((approvedAppsCount/totalAppsCount)*100) : 0}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${totalAppsCount ? (approvedAppsCount/totalAppsCount)*100 : 0}%`, backgroundColor: '#059669' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>
                        <span>Đang thẩm định ({reviewingAppsCount})</span>
                        <span style={{ color: '#d97706' }}>{totalAppsCount ? Math.round((reviewingAppsCount/totalAppsCount)*100) : 0}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${totalAppsCount ? (reviewingAppsCount/totalAppsCount)*100 : 0}%`, backgroundColor: '#d97706' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>
                        <span>Từ chối / Yêu cầu sửa ({rejectedAppsCount})</span>
                        <span style={{ color: '#ef4444' }}>{totalAppsCount ? Math.round((rejectedAppsCount/totalAppsCount)*100) : 0}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${totalAppsCount ? (rejectedAppsCount/totalAppsCount)*100 : 0}%`, backgroundColor: '#ef4444' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                  <h5 style={{ fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>Trạng Thái Giỏ Hàng Căn Hộ</h5>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>
                        <span>Còn trống ({availableUnitsCount})</span>
                        <span style={{ color: '#10b981' }}>{Math.round((availableUnitsCount/totalUnits)*100)}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(availableUnitsCount/totalUnits)*100}%`, backgroundColor: '#10b981' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>
                        <span>Đã giữ chỗ ({reservedUnitsCount})</span>
                        <span style={{ color: '#f59e0b' }}>{Math.round((reservedUnitsCount/totalUnits)*100)}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(reservedUnitsCount/totalUnits)*100}%`, backgroundColor: '#f59e0b' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>
                        <span>Đã bán ({soldUnitsCount})</span>
                        <span style={{ color: '#64748b' }}>{Math.round((soldUnitsCount/totalUnits)*100)}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(soldUnitsCount/totalUnits)*100}%`, backgroundColor: '#64748b' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPLICATIONS MANAGER */}
          {activeTab === 'applications' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedApp ? '1fr 420px' : '1fr', gap: '24px' }}>
              
              {/* Left Column: Applications List */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                
                {/* Search & Filter bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    placeholder="🔍 Tìm theo Họ tên, SĐT, CCCD, Mã HS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', width: '280px', fontSize: '14px' }}
                  />

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: '🌐 Tất cả' },
                      { id: 'intake', label: '🔵 GĐ 1: Mới nộp' },
                      { id: 'control', label: '🟣 GĐ 2: Tổ kiểm soát' },
                      { id: 'hardcopy', label: '🟠 GĐ 3: Nộp bản gốc' },
                      { id: 'archive', label: '🟢 GĐ 4: Đã duyệt' },
                      { id: 'returned', label: '🔴 Trả về bổ sung' },
                      { id: 'wrong_k', label: '❌ Sai nhóm K' }
                    ].map(st => (
                      <button 
                        key={st.id}
                        onClick={() => {
                          setStageFilter(st.id);
                          setStatusFilter('all');
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: '16px', border: '1px solid ' + (stageFilter === st.id ? '#059669' : '#cbd5e1'), fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                          backgroundColor: stageFilter === st.id ? '#059669' : '#f8fafc', color: stageFilter === st.id ? '#fff' : '#475569'
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* K-Group Filter Pills */}
                <div className="d-flex align-items-center gap-1.5 flex-wrap mb-3 p-2 bg-light rounded-3 border">
                  <span className="fw-bold fs-8 text-dark me-1">📋 Lọc theo Nhóm K (NĐ 100):</span>
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

                {/* Applications Table */}
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light fs-7 text-uppercase" style={{ color: '#475569' }}>
                      <tr>
                        <th>Mã HS</th>
                        <th>Khách hàng</th>
                        <th>Số điện thoại</th>
                        <th>Đối tượng</th>
                        <th>Tiến độ</th>
                        <th>Trạng thái</th>
                        <th>Thẩm định</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedApps.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted fs-7">
                            Không tìm thấy hồ sơ nào phù hợp với bộ lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        paginatedApps.map(app => (
                          <tr key={app.id} style={{ backgroundColor: selectedApp?.id === app.id ? '#f0fdf4' : 'transparent', cursor: 'pointer' }} onClick={() => handleSelectApp(app)}>
                            <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{app.id}</td>
                            <td>
                              <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{app.fullName}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>CCCD: {app.cccdNumber || 'Chưa cập nhật'}</div>
                            </td>
                            <td style={{ fontSize: '13px', fontWeight: '600' }}>{app.phoneNumber}</td>
                            <td><span className="badge bg-light text-dark border">{app.targetObject || 'K1'}</span></td>
                            <td>
                              <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '13px' }}>{app.progressPercent || 50}%</span>
                            </td>
                            <td>
                              <span className={`badge px-2.5 py-1.5 fs-8 rounded-pill ${
                                (app.status === 'approved' || app.status === 'luu_tru') ? 'bg-success text-white' :
                                app.status === 'to_kiem_soat' ? 'bg-primary text-white' :
                                app.status === 'bo_sung_ban_goc' ? 'bg-info text-dark' :
                                app.status === 'returned_for_supplement' ? 'bg-warning text-dark border border-warning' :
                                app.status === 'rejected_wrong_k' ? 'bg-danger text-white' :
                                app.status === 'rejected' ? 'bg-danger text-white' : 'bg-warning text-dark border border-warning'
                              }`}>
                                {app.status === 'approved' || app.status === 'luu_tru' ? '🟢 Đã duyệt / Lưu trữ' :
                                 app.status === 'to_kiem_soat' ? '🟣 Tổ kiểm soát' :
                                 app.status === 'bo_sung_ban_goc' ? '🟠 Chờ nộp bản gốc' :
                                 app.status === 'returned_for_supplement' ? '🔴 Trả về bổ sung' :
                                 app.status === 'rejected_wrong_k' ? '❌ Sai nhóm K' :
                                 app.status === 'rejected' ? '❌ Từ chối' : '🟡 Mới nộp'}
                              </span>
                            </td>
                            <td>
                              <button className="btn btn-emerald btn-sm rounded-pill px-3 py-1 fs-7 fw-bold" onClick={() => handleSelectApp(app)}>
                                🔍 Xem tệp
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top flex-wrap gap-2">
                  <div className="text-muted fs-8">
                    Hiển thị <strong>{filteredApps.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> – <strong>{Math.min(currentPage * pageSize, filteredApps.length)}</strong> trên tổng số <strong>{filteredApps.length}</strong> hồ sơ
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

              </div>

              {/* Right Column: Detailed Application Inspector & Review Drawer */}
              {selectedApp && (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', position: 'sticky', top: '24px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <h5 style={{ fontWeight: '800', color: '#0f172a', margin: 0 }}>Thẩm Định Hồ Sơ</h5>
                    <button onClick={() => setSelectedApp(null)} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer' }}>✖</button>
                  </div>

                  {appMessage && (
                    <div className="alert alert-success py-2 small mb-3">{appMessage}</div>
                  )}

                  {/* Customer info card */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: '#64748b' }}>Khách hàng:</span>
                        <strong style={{ color: '#0f172a' }}>{selectedApp.fullName}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: '#64748b' }}>SĐT:</span>
                        <strong>{selectedApp.phoneNumber}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: '#64748b' }}>Số CCCD (12 số):</span>
                        <strong style={{ color: '#059669' }}>{selectedApp.cccdNumber || '—'}</strong>
                      </div>
                      {selectedApp.oldCmnd && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748b' }}>Số CMND cũ:</span>
                          <span>{selectedApp.oldCmnd}</span>
                        </div>
                      )}
                      {selectedApp.dob && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748b' }}>Ngày sinh / Giới tính:</span>
                          <span>{selectedApp.dob} ({selectedApp.gender || 'Nam'})</span>
                        </div>
                      )}
                      {selectedApp.issueDate && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748b' }}>Ngày cấp CCCD:</span>
                          <span>{selectedApp.issueDate}</span>
                        </div>
                      )}
                      {selectedApp.address && (
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ color: '#64748b', display: 'block' }}>Thường trú:</span>
                          <strong>{selectedApp.address}</strong>
                        </div>
                      )}
                      {selectedApp.qrParsedData && (
                        <div className="mt-2 pt-2 border-top">
                          <span className="badge bg-success text-white px-2 py-1 fs-8">
                            ✅ Mã QR CCCD hợp lệ (Trích xuất tự động)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Documents Checklist */}
                    <div style={{ marginBottom: '20px' }}>
                      <h6 style={{ fontWeight: '700', fontSize: '13px', color: '#334155', marginBottom: '8px' }}>📄 Danh mục tệp minh chứng &amp; Thẻ CCCD 2 Mặt:</h6>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                        {(selectedApp.cccdFrontImage || selectedApp.cccdImage) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#ecfdf5', borderRadius: '8px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 'bold', color: '#047857' }}>🪪 Ảnh Mặt Trước CCCD</span>
                            <a href={selectedApp.cccdFrontImage || selectedApp.cccdImage} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success py-0 px-2 fs-8">Xem 👁</a>
                          </div>
                        )}

                        {selectedApp.cccdBackImage && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#ecfdf5', borderRadius: '8px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 'bold', color: '#047857' }}>💳 Ảnh Mặt Sau CCCD</span>
                            <a href={selectedApp.cccdBackImage} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success py-0 px-2 fs-8">Xem 👁</a>
                          </div>
                        )}

                      {selectedApp.documents && typeof selectedApp.documents === 'object' && Object.entries(selectedApp.documents).map(([k, docObj]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: docObj ? '#f1f5f9' : '#fff1f2', borderRadius: '8px', fontSize: '12px' }}>
                          <span style={{ fontWeight: docObj ? '600' : 'normal', color: docObj ? '#334155' : '#e11d48' }}>
                            {docObj ? `📄 ${docObj.name || k}` : `❌ Thiếu: ${k.toUpperCase()}`}
                          </span>
                          {docObj && (
                            <button 
                              type="button"
                              className="btn btn-sm btn-outline-primary py-0 px-2 fs-8" 
                              onClick={() => setPreviewDoc(docObj)}
                            >
                              Xem 👁
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Staff & Shift Assignment Section */}
                  <div className="p-3 mb-3 bg-white border rounded-3">
                    <h6 className="fw-bold text-dark fs-7 mb-2">👷 Phân công Cán bộ &amp; Ca làm việc:</h6>
                    
                    <div className="row g-2 mb-2">
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold fs-8 text-secondary">Cán bộ thụ lý:</label>
                        <select 
                          className="form-select form-select-sm"
                          value={assignedOfficer}
                          onChange={(e) => setAssignedOfficer(e.target.value)}
                        >
                        <option value="Nguyễn Văn Tùng">Nguyễn Văn Tùng (Chuyên viên 1)</option>
                          <option value="Trần Thị Mai">Trần Thị Mai (Chuyên viên 2)</option>
                          <option value="Lê Hoàng Nam">Lê Hoàng Nam (Tổ Kiểm Soát)</option>
                          <option value="Phạm Đức Anh">Phạm Đức Anh (Tổ Tiếp Nhận)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Stage Action Buttons Panel */}
                  <div className="mb-3">
                    <h6 className="fw-bold text-dark fs-7 mb-2">⚡ Hành Động Xử Lý Hồ Sơ Nhanh:</h6>

                    {!isStageAllowed(session?.role, selectedApp.stage) ? (
                      <div className="alert alert-warning py-2 px-3 small border-warning mb-3">
                        🔒 <strong>Giới hạn phân quyền:</strong> Tài khoản của bạn thuộc <strong>{roleInfo.title}</strong> (chỉ xử lý Giai đoạn {roleInfo.stage}). Hồ sơ này đang ở <strong>Giai đoạn {selectedApp.stage || 1}</strong> nên bạn không thể thực hiện thao tác.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2 mb-3">
                        {/* QUYỀN TỔ TIẾP NHẬN (GĐ 1) HOẶC ADMIN */}
                        {(session?.role === 'admin' || session?.role === 'officer_intake') && (selectedApp.stage === 1 || !selectedApp.stage) && (
                          <>
                            <button 
                              type="button" 
                              className="btn btn-emerald btn-sm rounded-pill fw-bold text-start p-2 shadow-sm"
                              style={{ backgroundColor: '#059669', color: '#fff' }}
                              onClick={() => handleExecuteAction('bypass_intake', '⚡ Hồ sơ đạt chuẩn, Bypass Tổ Tiếp Nhận và chuyển thẳng lên Tổ Kiểm Soát.')}
                            >
                              ⚡ Bypass Tổ Tiếp Nhận ➔ Đẩy lên Tổ Kiểm Soát
                            </button>

                            <button 
                              type="button" 
                              className="btn btn-danger btn-sm rounded-pill fw-bold text-start p-2 shadow-sm"
                              onClick={() => handleExecuteAction('reject_wrong_k', '❌ Từ chối do chọn sai nhóm đối tượng K. Yêu cầu nộp lại từ đầu.')}
                            >
                              ❌ Từ chối do chọn sai nhóm K (Bắt nộp lại từ đầu)
                            </button>
                          </>
                        )}

                        {/* QUYỀN TỔ KIỂM SOÁT (GĐ 2) HOẶC ADMIN */}
                        {(session?.role === 'admin' || session?.role === 'officer_control') && selectedApp.stage === 2 && (
                          <button 
                            type="button" 
                            className="btn btn-primary btn-sm rounded-pill fw-bold text-start p-2 shadow-sm"
                            onClick={() => handleExecuteAction('approve_digital', '✅ Duyệt bản số. Người dân có 3-5 ngày để nộp bản gốc.')}
                          >
                            🔵 Duyệt bản số ➔ Chờ nộp bản gốc (Hạn 3-5 ngày)
                          </button>
                        )}

                        {/* QUYỀN TIẾP NHẬN BẢN GỐC (GĐ 3) HOẶC ADMIN */}
                        {(session?.role === 'admin' || session?.role === 'officer_hardcopy') && selectedApp.stage === 3 && (
                          <button 
                            type="button" 
                            className="btn btn-dark btn-sm rounded-pill fw-bold text-start p-2 shadow-sm"
                            onClick={() => handleExecuteAction('archive', '🟢 Hồ sơ đã đối chứng bản gốc và đưa vào Lưu Trữ.')}
                          >
                            🟢 Hoàn thành đối soát ➔ Chuyển vào Lưu Trữ
                          </button>
                        )}

                        {/* YÊU CẦU BỔ SUNG (Bản mềm/bản cứng tùy giai đoạn) */}
                        {selectedApp.stage < 4 && (
                          <button 
                            type="button" 
                            className="btn btn-warning btn-sm rounded-pill fw-bold text-start p-2 shadow-sm text-dark"
                            onClick={() => handleExecuteAction('return_to_citizen', '🟠 Yêu cầu người dân cập nhật và bổ sung tài liệu.')}
                          >
                            🟠 Trả hồ sơ về cho người dân (Yêu cầu bổ sung)
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                    <div className="mb-2">
                      <label className="form-label fw-bold fs-8 text-dark mb-1">Ghi chú chi tiết gửi người dân:</label>
                      <textarea 
                        className="form-control form-control-sm" 
                        rows="2"
                        placeholder="Nhập ghi chú phản hồi lý do bổ sung / chọn sai K..."
                        value={appNotes}
                        onChange={(e) => setAppNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}

            </div>
          )}

          {/* TAB 3: APARTMENT INVENTORY MAP */}
          {activeTab === 'units' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
              
              <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h5 style={{ fontWeight: '800', color: '#0f172a', margin: 0 }}>Quản Lý Bảng Hàng &amp; Đặt Chỗ</h5>

                {/* Floor selector & Type filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Tầng:</label>
                    <select 
                      value={unitFloor} 
                      onChange={(e) => setUnitFloor(parseInt(e.target.value, 10))}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 'bold' }}
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30].map(f => (
                        <option key={f} value={f}>Tầng {f}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Loại căn:</label>
                    <select 
                      value={unitTypeFilter} 
                      onChange={(e) => setUnitTypeFilter(e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    >
                      <option value="all">Tất cả loại căn</option>
                      <option value="Studio">Studio</option>
                      <option value="1PN">1 Phòng Ngủ</option>
                      <option value="2PN">2 Phòng Ngủ</option>
                      <option value="3PN">3 Phòng Ngủ</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Units Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {filteredUnits.map(unit => (
                  <div 
                    key={unit.id}
                    onClick={() => handleSelectUnit(unit)}
                    style={{
                      padding: '16px', borderRadius: '12px', border: '2px solid', cursor: 'pointer', transition: 'all 0.15s',
                      borderColor: selectedUnit?.id === unit.id ? '#2563eb' : (unit.status === 'sold' ? '#cbd5e1' : unit.status === 'reserved' ? '#fde047' : '#86efac'),
                      backgroundColor: unit.status === 'sold' ? '#f8fafc' : unit.status === 'reserved' ? '#fefce8' : '#f0fdf4'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '16px', color: '#0f172a' }}>{unit.roomNumber}</strong>
                      <span className="badge bg-secondary-subtle text-dark fs-8">{unit.type}</span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Diện tích: {unit.area} m²</div>

                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: unit.status === 'sold' ? '#64748b' : unit.status === 'reserved' ? '#d97706' : '#059669' }}>
                      {unit.status === 'available' ? '🟢 Còn trống' : unit.status === 'reserved' ? '🟡 Đã giữ chỗ' : '🔴 Đã bán'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Unit Modal / Panel */}
              {selectedUnit && (
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <h6 style={{ fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>✏️ Cập Nhật Trạng Thái Căn Hộ: {selectedUnit.roomNumber}</h6>

                  {unitMessage && (
                    <div className="alert alert-info py-2 small mb-3">{unitMessage}</div>
                  )}

                  <form onSubmit={handleUpdateUnit} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '200px' }}>
                      <select 
                        className="form-select form-select-sm"
                        value={unitStatus}
                        onChange={(e) => setUnitStatus(e.target.value)}
                      >
                        <option value="available">🟢 Còn trống (Cho phép đặt)</option>
                        <option value="reserved">🟡 Đã đặt giữ chỗ (Khóa căn)</option>
                        <option value="sold">🔴 Đã hoàn tất bán (Sold)</option>
                      </select>
                    </div>

                    <button type="submit" className="btn btn-emerald btn-sm rounded-pill px-4 fw-bold">
                      💾 Lưu thay đổi căn {selectedUnit.roomNumber}
                    </button>
                  </form>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', maxWidth: '680px' }}>
              <h5 style={{ fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>⚙️ Cài Đặt Hệ Thống &amp; Khung Giờ Hoạt Động (Handico CT3-CT4)</h5>

              {settingsMessage && (
                <div className="alert alert-success py-2 small mb-3">{settingsMessage}</div>
              )}

              <form onSubmit={handleUpdateSettings}>
                <div className="p-3 mb-3 bg-light rounded-3 border">
                  <h6 className="fw-bold text-dark fs-7 mb-2">🕒 Khung Giờ Mở Cổng Hệ Thống (Mở 08:00 ➔ 17:30):</h6>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label fw-bold fs-8 text-secondary">Giờ mở cổng:</label>
                      <input type="time" className="form-control form-control-sm" defaultValue="08:00" />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold fs-8 text-secondary">Giờ đóng cổng:</label>
                      <input type="time" className="form-control form-control-sm" defaultValue="17:30" />
                    </div>
                  </div>
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="enableHoursCheck" defaultChecked />
                    <label className="form-check-label fs-8 text-dark" htmlFor="enableHoursCheck">
                      Khóa nút nộp/sửa hồ sơ tự động khi ngoài khung giờ 08:00 - 17:30.
                    </label>
                  </div>
                </div>

                <div className="p-3 mb-3 bg-light rounded-3 border">
                  <h6 className="fw-bold text-dark fs-7 mb-2">⏱️ Cấu Hình Thời Gian Thụ Lý Hồ Sơ (SLA):</h6>
                  <div className="row g-2">
                    <div className="col-6 col-md-3">
                      <label className="form-label fw-bold fs-8 text-secondary">Tổng SLA:</label>
                      <input type="number" className="form-control form-control-sm" defaultValue={30} />
                      <div className="fs-8 text-muted">30 Ngày</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label fw-bold fs-8 text-secondary">Tổ Tiếp nhận:</label>
                      <input type="number" className="form-control form-control-sm" defaultValue={5} />
                      <div className="fs-8 text-muted">5 Ngày</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label fw-bold fs-8 text-secondary">Tổ Kiểm soát:</label>
                      <input type="number" className="form-control form-control-sm" defaultValue={10} />
                      <div className="fs-8 text-muted">10 Ngày</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label fw-bold fs-8 text-secondary">Nộp bản gốc:</label>
                      <input type="number" className="form-control form-control-sm" defaultValue={5} />
                      <div className="fs-8 text-muted">3-5 Ngày</div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-dark">Hạn chót nộp hồ sơ Đợt 1 (ISO Date Format)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={deadlineVal}
                    onChange={(e) => setDeadlineVal(e.target.value)}
                  />
                  <div className="form-text small text-muted">VD: 2026-08-30T17:00:00.000Z</div>
                </div>

                <button type="submit" className="btn btn-emerald rounded-pill px-4 py-2 fw-bold shadow-sm" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                  💾 Lưu cài đặt hệ thống &amp; SLA
                </button>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-3 border-0 shadow">
              <div className="modal-header bg-dark text-white">
                <h6 className="modal-title fw-bold">📄 Xem Tệp Thẩm Định: {previewDoc.name || 'Tài liệu'}</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setPreviewDoc(null)}></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="p-4 bg-light rounded border mb-3">
                  <span className="fs-1 d-block mb-2">📁</span>
                  <strong className="d-block text-dark mb-1">{previewDoc.name}</strong>
                  <a href={previewDoc.url} target="_blank" rel="noreferrer" className="btn btn-success btn-sm rounded-pill px-4 py-2 fw-bold mt-2">
                    ⬇ Mở / Tải tệp về máy
                  </a>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary btn-sm rounded-pill px-3" onClick={() => setPreviewDoc(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
