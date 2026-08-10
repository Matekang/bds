'use client';

import React, { useState } from 'react';

export default function AdminClient({ session, initialApplications, initialUnits, initialDeadline }) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('applications'); // 'overview' | 'applications' | 'units' | 'settings'

  // Application Data States
  const [apps, setApps] = useState(initialApplications || []);
  const [selectedApp, setSelectedApp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form states cho Duyệt Hồ Sơ
  const [appStatus, setAppStatus] = useState('');
  const [appStage, setAppStage] = useState(1);
  const [appNotes, setAppNotes] = useState('');
  const [appMessage, setAppMessage] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

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

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
              A
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{session?.fullName || 'Admin Hapro'}</div>
              <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold' }}>● SYSTEM ADMIN</div>
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

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['all', 'submitted', 'reviewing', 'approved', 'rejected'].map(st => (
                      <button 
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        style={{
                          padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                          backgroundColor: statusFilter === st ? '#059669' : '#f1f5f9', color: statusFilter === st ? '#fff' : '#475569'
                        }}
                      >
                        {st === 'all' ? 'Tất cả' :
                         st === 'submitted' ? 'Mới nộp' :
                         st === 'reviewing' ? 'Đang duyệt' :
                         st === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                      </button>
                    ))}
                  </div>
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
                      {filteredApps.map(app => (
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
                              app.status === 'approved' ? 'bg-success' :
                              app.status === 'rejected' ? 'bg-danger' :
                              app.status === 'reviewing' ? 'bg-info text-dark' : 'bg-warning text-dark'
                            }`}>
                              {app.status === 'approved' ? 'Đã duyệt' :
                               app.status === 'rejected' ? 'Từ chối' :
                               app.status === 'reviewing' ? 'Đang duyệt' : 'Mới nộp'}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-emerald btn-sm rounded-pill px-3 py-1 fs-7 fw-bold" onClick={() => handleSelectApp(app)}>
                              🔍 Xem tệp
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                      <span style={{ color: '#64748b' }}>Mã KH:</span>
                      <span>{selectedApp.maKH || 'KH-0902'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>CCCD:</span>
                      <strong>{selectedApp.cccdNumber || '—'}</strong>
                    </div>
                  </div>

                  {/* Documents Checklist */}
                  <div style={{ marginBottom: '20px' }}>
                    <h6 style={{ fontWeight: '700', fontSize: '13px', color: '#334155', marginBottom: '8px' }}>📄 Danh mục tệp minh chứng:</h6>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                      {selectedApp.cccdImage && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#ecfdf5', borderRadius: '8px', fontSize: '12px' }}>
                          <span style={{ fontWeight: 'bold', color: '#047857' }}>🪪 Ảnh CCCD / VNeID</span>
                          <a href={selectedApp.cccdImage} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success py-0 px-2 fs-8">Xem 👁</a>
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

                  {/* Approval Form */}
                  <form onSubmit={handleUpdateApp}>
                    <div className="mb-3">
                      <label className="form-label fw-bold small text-dark">Giai đoạn thẩm định</label>
                      <select 
                        className="form-select form-select-sm" 
                        value={appStage}
                        onChange={(e) => setAppStage(parseInt(e.target.value, 10))}
                      >
                        <option value={1}>Giai đoạn 1: Nộp hồ sơ</option>
                        <option value={2}>Giai đoạn 2: Thẩm duyệt bản mềm</option>
                        <option value={3}>Giai đoạn 3: Thẩm duyệt bản cứng</option>
                        <option value={4}>Giai đoạn 4: Thẩm duyệt suất mua</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold small text-dark">Trạng thái phê duyệt</label>
                      <select 
                        className="form-select form-select-sm" 
                        value={appStatus}
                        onChange={(e) => setAppStatus(e.target.value)}
                      >
                        <option value="submitted">Đã tiếp nhận (Mới nộp)</option>
                        <option value="reviewing">Đang thẩm định kiểm duyệt</option>
                        <option value="approved">Đã phê duyệt (Đủ điều kiện)</option>
                        <option value="rejected">Bị từ chối (Yêu cầu bổ sung)</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold small text-dark">Ghi chú phản hồi khách hàng</label>
                      <textarea 
                        className="form-control form-control-sm" 
                        rows="3"
                        placeholder="VD: Hồ sơ bản mềm hợp lệ. Mời khách hàng mang bản chính đến văn phòng..."
                        value={appNotes}
                        onChange={(e) => setAppNotes(e.target.value)}
                      ></textarea>
                    </div>

                    <button type="submit" className="btn btn-emerald w-100 rounded-pill py-2 fw-bold shadow-sm" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                      💾 Lưu kết quả thẩm định
                    </button>
                  </form>

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
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
              <h5 style={{ fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>⚙️ Cài Đặt Hạn Chót Nộp Hồ Sơ Đợt 1</h5>

              {settingsMessage && (
                <div className="alert alert-success py-2 small mb-3">{settingsMessage}</div>
              )}

              <form onSubmit={handleUpdateSettings}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-dark">Hạn chót đếm ngược (ISO Date Format)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={deadlineVal}
                    onChange={(e) => setDeadlineVal(e.target.value)}
                  />
                  <div className="form-text small text-muted">VD: 2026-08-21T17:00:00.000Z</div>
                </div>

                <button type="submit" className="btn btn-emerald rounded-pill px-4 py-2 fw-bold">
                  💾 Lưu cài đặt thời gian
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
