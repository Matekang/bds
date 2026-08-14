'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { renderAsync } from 'docx-preview';
import Link from 'next/link';

const getRoleInfo = (role) => {
  switch (role) {
    case 'officer_intake':
      return { title: 'Tổ Tiếp Nhận', stage: 1, badge: '🔵 TỔ TIẾP NHẬN (GĐ 1)', allowedTabs: ['applications', 'lottery'] };
    case 'officer_control':
      return { title: 'Tổ Kiểm Soát', stage: 2, badge: '🟣 TỔ KIỂM SOÁT (GĐ 2)', allowedTabs: ['applications', 'lottery'] };
    case 'officer_hardcopy':
      return { title: 'Bộ Phận Bản Gốc', stage: 3, badge: '🟠 BỘ PHẬN BẢN GỐC (GĐ 3)', allowedTabs: ['applications', 'lottery'] };
    case 'officer_archive':
      return { title: 'Bộ Phận Lưu Trữ', stage: 4, badge: '🟢 BỘ PHẬN LƯU TRỮ (GĐ 4)', allowedTabs: ['applications', 'overview', 'lottery'] };
    case 'admin':
      return { title: 'Super Admin Hapro', stage: null, badge: '👑 SUPER ADMIN', allowedTabs: ['overview', 'applications', 'units', 'lottery', 'accounts', 'settings'] };
    default:
      return { title: 'Cán Bộ Phê Duyệt', stage: null, badge: '👤 CÁN BỘ PHÊ DUYỆT', allowedTabs: ['applications', 'lottery'] };
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

const isOfficerAssigned = (sessionUser, app) => {
  if (!sessionUser || !app) return true;
  if (sessionUser.role === 'admin') return true;
  if (!app.assignedOfficer) return true;
  const currentUser = (sessionUser.fullName || sessionUser.phoneNumber || '').toLowerCase().trim();
  const assigned = (app.assignedOfficer || '').toLowerCase().trim();
  return currentUser === assigned || assigned.includes(currentUser) || currentUser.includes(assigned);
};

export default function AdminClient({ session, initialApplications, initialUnits, initialDeadline }) {
  const roleInfo = getRoleInfo(session?.role);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('applications'); // 'overview' | 'applications' | 'lottery' | 'settings'

  // Safety guard: ensure activeTab is allowed for current role
  useEffect(() => {
    if (!roleInfo.allowedTabs.includes(activeTab)) {
      setActiveTab('applications');
    }
  }, [activeTab, roleInfo]);

  // Application Data States
  const [apps, setApps] = useState(initialApplications || []);
  const [selectedApp, setSelectedApp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [kFilter, setKFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [officerFilter, setOfficerFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [appointmentDateFilter, setAppointmentDateFilter] = useState('');

  // Batch Processing States
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchMessage, setBatchMessage] = useState('');

  // Session Progress Tracking
  const [sessionProcessed, setSessionProcessed] = useState(0);
  const sessionStartRef = useRef(Date.now());
  const filteredAppsRef = useRef([]);

  // Load dữ liệu hồ sơ & bảng hàng từ server khi mount
  useEffect(() => {
    reloadApplications();
    reloadUnits();
  }, []);

  // Reset trang về 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [stageFilter, statusFilter, kFilter, searchQuery, officerFilter, shiftFilter, pageSize]);

  // Form states cho Duyệt Hồ Sơ
  const [appStatus, setAppStatus] = useState('');
  const [appStage, setAppStage] = useState(1);
  const [appNotes, setAppNotes] = useState('');
  const [assignedOfficer, setAssignedOfficer] = useState('Nguyễn Văn Tùng');
  const [shift, setShift] = useState('morning');
  const [appMessage, setAppMessage] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  // Quick Action Handler — with auto-advance to next application
  const handleExecuteAction = async (actionType, defaultNote = '') => {
    if (!selectedApp) return;
    setAppMessage('');

    const currentId = selectedApp.id;
    const currentList = filteredAppsRef.current;
    const currentIdx = currentList.findIndex(a => a.id === currentId);

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
        setSessionProcessed(prev => prev + 1);
        setAppMessage(`🎉 Xử lý thành công! Tự động chuyển hồ sơ kế tiếp...`);
        setAppNotes('');

        // Auto-advance: chọn hồ sơ kế tiếp trong danh sách (không thay đổi filter)
        await reloadApplications();

        // Tìm hồ sơ kế tiếp sau khi reload
        setTimeout(() => {
          const freshList = filteredAppsRef.current;
          if (freshList.length > 0) {
            // Tìm vị trí hồ sơ tiếp theo (hồ sơ cũ đã chuyển giai đoạn nên sẽ biến mất khỏi list)
            const nextIdx = Math.min(currentIdx, freshList.length - 1);
            const nextApp = freshList[Math.max(0, nextIdx)];
            if (nextApp) {
              handleSelectApp(nextApp);
            }
          }
        }, 100);
      } else {
        setAppMessage(`⚠️ Thất bại: ${data.message}`);
      }
    } catch (err) {
      setAppMessage('⚠️ Lỗi kết nối máy chủ.');
    }
  };

  // Batch Action Handler — xử lý hàng loạt
  const handleBatchAction = async (actionType, defaultNote = '') => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    setBatchMessage('');

    try {
      const res = await fetch('/api/applications/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: actionType,
          notes: defaultNote,
          assignedOfficer,
          shift
        })
      });
      const data = await res.json();

      if (data.success) {
        setSessionProcessed(prev => prev + (data.processedCount || selectedIds.size));
        setBatchMessage(`🎉 Đã xử lý thành công ${data.processedCount || selectedIds.size} hồ sơ!`);
        setSelectedIds(new Set());
        reloadApplications();
      } else {
        setBatchMessage(`⚠️ Thất bại: ${data.message}`);
      }
    } catch (err) {
      setBatchMessage('⚠️ Lỗi kết nối máy chủ.');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Toggle checkbox for batch selection
  const toggleSelectApp = (appId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    const pageIds = paginatedApps.map(a => a.id);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Units / Inventory States
  const [units, setUnits] = useState(initialUnits || []);
  const [unitFloor, setUnitFloor] = useState(1);
  const [unitTypeFilter, setUnitTypeFilter] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitStatus, setUnitStatus] = useState('');
  const [unitMessage, setUnitMessage] = useState('');

  // Dynamic Room Types List State
  const [roomTypes, setRoomTypes] = useState(['Studio', '1PN', '2PN', '3PN', 'Dual Key', 'Duplex', 'Penthouse']);
  const [newRoomTypeName, setNewRoomTypeName] = useState('');
  const [showAddTypeInput, setShowAddTypeInput] = useState(false);

  // Unit Edit & Create Form States
  const [editUnitType, setEditUnitType] = useState('2PN');
  const [editUnitArea, setEditUnitArea] = useState(65.5);
  const [editUnitFloorNum, setEditUnitFloorNum] = useState(1);

  const [showCreateUnitModal, setShowCreateUnitModal] = useState(false);
  const [newUnitForm, setNewUnitForm] = useState({
    roomNumber: '',
    floor: 1,
    type: '2PN',
    area: 65.5
  });

  // Batch Floor & Room Creation Modal States
  const [showBatchFloorModal, setShowBatchFloorModal] = useState(false);
  const [batchFromFloor, setBatchFromFloor] = useState(1);
  const [batchToFloor, setBatchToFloor] = useState(5);
  const [batchTower, setBatchTower] = useState('B');
  const [roomsTemplate, setRoomsTemplate] = useState([
    { roomIndex: 1, type: 'Studio', area: 35.2 },
    { roomIndex: 2, type: '1PN', area: 45.8 },
    { roomIndex: 3, type: '2PN', area: 65.5 },
    { roomIndex: 4, type: '2PN', area: 65.5 },
    { roomIndex: 5, type: '2PN', area: 65.5 },
    { roomIndex: 6, type: '2PN', area: 65.5 },
    { roomIndex: 7, type: '1PN', area: 45.8 },
    { roomIndex: 8, type: 'Studio', area: 35.2 }
  ]);

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
  const [releasePercentage, setReleasePercentage] = useState(70); // % Quỹ căn mở bán đợt này (e.g. 70%)
  const [lotteryResults, setLotteryResults] = useState(null);
  const [isRunningLottery, setIsRunningLottery] = useState(false);
  const [lotterySearch, setLotterySearch] = useState('');
  const [lotteryFilterType, setLotteryFilterType] = useState('all');
  const [lotteryPage, setLotteryPage] = useState(1);
  const [lotteryPageSize, setLotteryPageSize] = useState(15);

  // Settings States
  const [deadlineVal, setDeadlineVal] = useState(initialDeadline ? new Date(initialDeadline).toISOString().slice(0, 16) : '2026-08-30T17:00');
  const [hardCopyDeadlineVal, setHardCopyDeadlineVal] = useState('2026-09-10T17:00');
  const [settingsMessage, setSettingsMessage] = useState('');

  // Default Officers Fallback List
  const DEFAULT_OFFICERS_LIST = [
    { id: 'officer-intake-1', fullName: 'Nguyễn Văn Tùng (Tổ 1)', phoneNumber: '0911111111', email: 'tung.nv@hapro.vn', role: 'officer_intake', createdAt: '2026-08-12' },
    { id: 'officer-intake-2', fullName: 'Hoàng Thị Cúc (Tổ 1)', phoneNumber: '0911111112', email: 'cuc.ht@hapro.vn', role: 'officer_intake', createdAt: '2026-08-12' },
    { id: 'officer-control-1', fullName: 'Lê Hoàng Nam (Tổ 2)', phoneNumber: '0922222222', email: 'nam.lh@hapro.vn', role: 'officer_control', createdAt: '2026-08-12' },
    { id: 'officer-control-2', fullName: 'Đặng Minh Đức (Tổ 2)', phoneNumber: '0922222223', email: 'duc.dm@hapro.vn', role: 'officer_control', createdAt: '2026-08-12' },
    { id: 'officer-hardcopy-1', fullName: 'Trần Thị Mai (Tổ 3)', phoneNumber: '0933333333', email: 'mai.tt@hapro.vn', role: 'officer_hardcopy', createdAt: '2026-08-12' },
    { id: 'officer-hardcopy-2', fullName: 'Vũ Anh Tuấn (Tổ 3)', phoneNumber: '0933333334', email: 'tuan.va@hapro.vn', role: 'officer_hardcopy', createdAt: '2026-08-12' },
    { id: 'officer-archive-1', fullName: 'Phạm Quốc Bảo (Tổ 4)', phoneNumber: '0944444444', email: 'bao.pq@hapro.vn', role: 'officer_archive', createdAt: '2026-08-12' },
    { id: 'officer-archive-2', fullName: 'Ngô Bích Ngọc (Tổ 4)', phoneNumber: '0944444445', email: 'ngoc.nb@hapro.vn', role: 'officer_archive', createdAt: '2026-08-12' }
  ];

  const [usersList, setUsersList] = useState(DEFAULT_OFFICERS_LIST);
  const [accountForm, setAccountForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '123456',
    role: 'officer_intake'
  });
  const [accountMessage, setAccountMessage] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState('staff'); // 'staff' | 'customer' | 'all'
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [accountPage, setAccountPage] = useState(1);
  const [accountPageSize, setAccountPageSize] = useState(10);

  const reloadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success && data.users && data.users.length > 0) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load danh sách cán bộ khi mount (cho dropdown phân công ở tab applications)
  useEffect(() => {
    if (session?.role === 'admin' || session?.role?.startsWith('officer_')) {
      reloadUsers();
    }
  }, []);

  // Reload lại khi chuyển sang tab accounts
  useEffect(() => {
    if (activeTab === 'accounts' && session?.role === 'admin') {
      reloadUsers();
    }
  }, [activeTab]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setAccountMessage('');
    setIsSubmittingAccount(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm)
      });
      const data = await res.json();
      if (data.success) {
        setAccountMessage(`✅ ${data.message}`);
        setAccountForm({
          fullName: '',
          phoneNumber: '',
          email: '',
          password: '123456',
          role: 'officer_intake'
        });
        reloadUsers();
      } else {
        setAccountMessage(`⚠️ ${data.message}`);
      }
    } catch (err) {
      setAccountMessage('⚠️ Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleDeleteUser = async (userId, userFullName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userFullName}" không?`)) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAccountMessage(`🗑️ ${data.message}`);
        reloadUsers();
      } else {
        setAccountMessage(`⚠️ ${data.message}`);
      }
    } catch (err) {
      setAccountMessage('⚠️ Lỗi kết nối khi xóa tài khoản.');
    }
  };

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
    setAssignedOfficer(app.assignedOfficer || '');
    setAppMessage('');
  };

  const handleSelectUnit = (unit) => {
    setSelectedUnit(unit);
    setUnitStatus(unit.status);
    setEditUnitType(unit.type || '2PN');
    setEditUnitArea(unit.area || 65.5);
    setEditUnitFloorNum(unit.floor || 1);
    setUnitMessage('');
  };

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    setUnitMessage('');
    try {
      const res = await fetch('/api/units/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUnitForm)
      });
      const data = await res.json();
      if (data.success) {
        setUnitMessage(`🎉 ${data.message}`);
        setShowCreateUnitModal(false);
        setNewUnitForm({ roomNumber: '', floor: newUnitForm.floor, type: '2PN', area: 65.5 });
        reloadUnits();
      } else {
        setUnitMessage(`⚠️ Lỗi: ${data.message}`);
      }
    } catch (err) {
      setUnitMessage('⚠️ Lỗi kết nối máy chủ.');
    }
  };

  const handleUpdateUnitDetail = async (e) => {
    e.preventDefault();
    if (!selectedUnit) return;
    setUnitMessage('');
    try {
      const res = await fetch('/api/units/detail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: selectedUnit.id,
          status: unitStatus,
          type: editUnitType,
          area: Number(editUnitArea),
          floor: Number(editUnitFloorNum)
        })
      });
      const data = await res.json();
      if (data.success) {
        setUnitMessage('🎉 Đã cập nhật chi tiết căn hộ thành công!');
        reloadUnits();
      } else {
        setUnitMessage(`⚠️ Lỗi: ${data.message}`);
      }
    } catch (err) {
      setUnitMessage('⚠️ Lỗi kết nối.');
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa căn hộ ${unitId}?`)) return;
    setUnitMessage('');
    try {
      const res = await fetch(`/api/units/${unitId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUnitMessage('🗑️ ' + data.message);
        setSelectedUnit(null);
        reloadUnits();
      } else {
        setUnitMessage('⚠️ ' + data.message);
      }
    } catch (err) {
      setUnitMessage('⚠️ Lỗi kết nối máy chủ.');
    }
  };

  const handleBatchCreateFloors = async (e) => {
    e.preventDefault();
    setUnitMessage('');
    try {
      const res = await fetch('/api/units/batch-floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromFloor: Number(batchFromFloor),
          toFloor: Number(batchToFloor),
          tower: batchTower,
          roomsTemplate
        })
      });
      const data = await res.json();
      if (data.success) {
        setUnitMessage(`🎉 ${data.message}`);
        setShowBatchFloorModal(false);
        setUnitFloor(Number(batchFromFloor));
        reloadUnits();
      } else {
        setUnitMessage(`⚠️ Lỗi: ${data.message}`);
      }
    } catch (err) {
      setUnitMessage('⚠️ Lỗi kết nối máy chủ.');
    }
  };

  const handleDeleteFloor = async (floorNum) => {
    if (!window.confirm(`⚠️ Bạn có CHẮC CHẮN muốn XÓA TOÀN BỘ PHÒNG ở TẦNG ${floorNum}? Thao tác này không thể hoàn tác.`)) return;
    setUnitMessage('');
    try {
      const res = await fetch(`/api/units/floor/${floorNum}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUnitMessage('🗑️ ' + data.message);
        setSelectedUnit(null);
        reloadUnits();
      } else {
        setUnitMessage('⚠️ ' + data.message);
      }
    } catch (err) {
      setUnitMessage('⚠️ Lỗi kết nối máy chủ.');
    }
  };

  const handleAddRoomToTemplate = () => {
    const nextIdx = roomsTemplate.length + 1;
    setRoomsTemplate([...roomsTemplate, { roomIndex: nextIdx, type: '2PN', area: 65.5 }]);
  };

  const handleRemoveRoomFromTemplate = (index) => {
    if (roomsTemplate.length <= 1) return;
    const updated = roomsTemplate.filter((_, i) => i !== index).map((r, i) => ({ ...r, roomIndex: i + 1 }));
    setRoomsTemplate(updated);
  };

  const handleUpdateTemplateRoom = (index, field, value) => {
    const updated = [...roomsTemplate];
    updated[index] = { ...updated[index], [field]: value };
    setRoomsTemplate(updated);
  };

  const handleAddNewRoomType = (newType) => {
    if (!newType || !newType.trim()) return;
    const trimmed = newType.trim();
    if (!roomTypes.includes(trimmed)) {
      setRoomTypes([...roomTypes, trimmed]);
    }
    setNewRoomTypeName('');
    setShowAddTypeInput(false);
  };

  const handleRunOfficialLottery = (phase) => {
    setIsRunningLottery(true);
    setTimeout(() => {
      setIsRunningLottery(false);
      const approvedApps = apps.filter(a => a.status === 'approved' || a.status === 'luu_tru' || a.stage === 4);
      const targetApps = approvedApps.length > 0 ? approvedApps : apps;

      // Tính tổng quỹ căn mở bán dựa trên % đã chọn (VD: 232 căn * 70% = 162 căn)
      const totalInventory = units.length || 232;
      const targetUnitsQuota = Math.max(1, Math.round((totalInventory * releasePercentage) / 100));

      let winCount = 0;
      let reserveCount = 1;

      // Trộn ngẫu nhiên danh sách khách hàng để đảm bảo tính công bằng khách quan
      const shuffledApps = [...targetApps].sort(() => Math.random() - 0.5);

      const results = shuffledApps.map((app, idx) => {
        const isPriority = app.targetObject === 'K1' || app.targetObject === 'K7' || app.targetObject === 'K10';

        if (phase === 'phase1') {
          // Phase 1: Bốc thăm Quyền Mua (Hạn ngạch = Quỹ căn mở bán đợt này)
          if (winCount < targetUnitsQuota) {
            winCount++;
            return {
              ...app,
              lotteryStatus: 'WIN_BUY_RIGHT',
              statusText: '🎯 TRÚNG QUYỀN MUA',
              badgeColor: '#059669',
              bgColor: '#ecfdf5',
              note: `Trúng suất Quyền Mua chính thức (Đợt mở bán ${releasePercentage}% quỹ căn)`
            };
          } else {
            const rNum = reserveCount++;
            return {
              ...app,
              lotteryStatus: 'RESERVE_BUY_RIGHT',
              statusText: `📋 DỰ KHUYẾT SỐ #${rNum}`,
              badgeColor: '#d97706',
              bgColor: '#fffbeb',
              reserveNum: rNum,
              note: `Phiếu dự khuyết thứ tự #${rNum}. Chờ chuyển quyền nếu suất chính thức bị hủy.`
            };
          }
        } else {
          // Phase 2: Bốc thăm Vị trí & Căn hộ cụ thể
          if (winCount < targetUnitsQuota) {
            winCount++;
            const tower = idx % 2 === 0 ? 'Tòa B' : 'Tòa A';
            const floor = Math.floor(Math.random() * 20) + 2;
            const roomIdx = Math.floor(Math.random() * 10) + 1;
            const roomCode = `${tower === 'Tòa B' ? 'B' : 'A'}-${floor.toString().padStart(2, '0')}${roomIdx.toString().padStart(2, '0')}`;
            const area = app.unitType === '1PN' ? 45.8 : app.unitType === '3PN' ? 82.5 : 65.5;

            return {
              ...app,
              lotteryStatus: 'WIN_UNIT_LOCATION',
              statusText: '🎯 BỐC TRÚNG CĂN HỘ',
              badgeColor: '#059669',
              bgColor: '#ecfdf5',
              allocatedTower: tower,
              allocatedFloor: `Tầng ${floor}`,
              allocatedRoomCode: roomCode,
              allocatedArea: `${area} m²`,
              note: `Căn ${roomCode} - ${tower} - Tầng ${floor} (${area} m²)`
            };
          } else {
            return {
              ...app,
              lotteryStatus: 'WHITE_TICKET',
              statusText: '⚪ PHIẾU TRẮNG',
              badgeColor: '#64748b',
              bgColor: '#f8fafc',
              note: 'Phiếu trắng NV1 đợt này. Được tiếp tục chuyển sang bốc thăm NV2.'
            };
          }
        }
      });

      setLotteryResults(results);
    }, 1200);
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

    // Phân quyền chỉ xem hồ sơ được gán cho cán bộ đang đăng nhập (Trừ Super Admin xem được toàn bộ)
    let matchesOfficerAssignment = true;
    if (session?.role !== 'admin' && session?.role?.startsWith('officer_')) {
      const currentUser = (session.fullName || session.phoneNumber || '').toLowerCase().trim();
      const assigned = (app.assignedOfficer || '').toLowerCase().trim();
      matchesOfficerAssignment = !app.assignedOfficer || currentUser === assigned || assigned.includes(currentUser) || currentUser.includes(assigned);
    }

    const matchesOfficer = officerFilter === 'all' || app.assignedOfficer === officerFilter;
    const matchesShift = shiftFilter === 'all' || app.shift === shiftFilter;

    let matchesAppointmentDate = true;
    if (appointmentDateFilter) {
      const appDateStr = app.appointmentTicket?.date || (app.hardCopyDeadline ? app.hardCopyDeadline.substring(0, 10) : '');
      matchesAppointmentDate = appDateStr.startsWith(appointmentDateFilter);
    }

    return matchesSearch && matchesStatus && matchesStage && matchesK && matchesOfficer && matchesShift && matchesAppointmentDate && matchesOfficerAssignment;
  }).sort((a, b) => {
    const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '');
  });

  // Sync ref for auto-advance
  filteredAppsRef.current = filteredApps;

  const totalPages = Math.ceil(filteredApps.length / pageSize) || 1;
  const paginatedApps = filteredApps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Luôn tự động chọn hồ sơ đầu tiên khi tải danh sách
  useEffect(() => {
    if (activeTab === 'applications' && filteredApps && filteredApps.length > 0) {
      if (!selectedApp || !filteredApps.some(a => a.id === selectedApp.id)) {
        handleSelectApp(filteredApps[0]);
      }
    }
  }, [filteredApps, activeTab]);

  // Stage Counts for Quick-Glance Summary Cards
  const stageIntakeCount = apps.filter(a => a.status === 'submitted' || (a.stage === 1 && a.status !== 'returned_for_supplement' && a.status !== 'rejected_wrong_k')).length;
  const stageControlCount = apps.filter(a => a.status === 'to_kiem_soat' || a.stage === 2).length;
  const stageHardcopyCount = apps.filter(a => a.status === 'bo_sung_ban_goc' || a.stage === 3).length;
  const stageArchiveCount = apps.filter(a => a.status === 'approved' || a.status === 'luu_tru' || a.stage === 4).length;
  const stageReturnedCount = apps.filter(a => a.status === 'returned_for_supplement').length;
  const stageWrongKCount = apps.filter(a => a.status === 'rejected_wrong_k').length;

  // Session Progress Calculations
  const sessionElapsedMs = Date.now() - sessionStartRef.current;
  const sessionMinutes = Math.max(1, Math.floor(sessionElapsedMs / 60000));
  const sessionSpeed = sessionProcessed > 0 ? (sessionProcessed / sessionMinutes).toFixed(1) : '0';

  // Keyboard Shortcuts
  useEffect(() => {
    if (activeTab !== 'applications' || previewDoc) return;

    const handleKeyDown = (e) => {
      // Ignore when user is typing in input/textarea/select
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const currentList = filteredAppsRef.current;
      const currentIdx = selectedApp ? currentList.findIndex(a => a.id === selectedApp.id) : -1;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        if (currentIdx < currentList.length - 1) {
          handleSelectApp(currentList[currentIdx + 1]);
          // Auto-scroll to correct page
          const newPage = Math.floor((currentIdx + 1) / pageSize) + 1;
          if (newPage !== currentPage) setCurrentPage(newPage);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        if (currentIdx > 0) {
          handleSelectApp(currentList[currentIdx - 1]);
          const newPage = Math.floor((currentIdx - 1) / pageSize) + 1;
          if (newPage !== currentPage) setCurrentPage(newPage);
        }
      } else if (e.key === '1' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (selectedApp && (selectedApp.stage === 1 || !selectedApp.stage)) {
          handleExecuteAction('bypass_intake', '⚡ Bypass Tổ Tiếp Nhận.');
        }
      } else if (e.key === '2' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (selectedApp && selectedApp.stage === 2) {
          handleExecuteAction('approve_digital', '✅ Duyệt bản số.');
        }
      } else if (e.key === '3' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (selectedApp && selectedApp.stage === 3) {
          handleExecuteAction('archive', '🟢 Chuyển vào Lưu Trữ.');
        }
      } else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (selectedApp && selectedApp.stage < 4) {
          handleExecuteAction('return_to_citizen', '🟠 Trả về bổ sung.');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedApp(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedApp, previewDoc, currentPage, pageSize]);

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

          {roleInfo.allowedTabs.includes('overview') && (
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
                <span>Tổng Quan &amp; Bảng Hàng</span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{availableUnitsCount}/{totalUnits}</span>
            </button>
          )}

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
            onClick={() => setActiveTab('lottery')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', borderRadius: '10px', border: 'none',
              backgroundColor: activeTab === 'lottery' ? '#059669' : 'transparent', color: activeTab === 'lottery' ? '#fff' : '#cbd5e1',
              fontWeight: activeTab === 'lottery' ? '700' : '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>🎲</span>
              <span>Quản Lý Bốc Thăm</span>
            </div>
            <span style={{ backgroundColor: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 7px', borderRadius: '10px' }}>
              HOT
            </span>
          </button>


          {roleInfo.allowedTabs.includes('accounts') && (
            <button 
              onClick={() => setActiveTab('accounts')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', borderRadius: '10px', border: 'none',
                backgroundColor: activeTab === 'accounts' ? '#059669' : 'transparent', color: activeTab === 'accounts' ? '#fff' : '#cbd5e1',
                fontWeight: activeTab === 'accounts' ? '700' : '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px' }}>👥</span>
                <span>Quản Lý Nhân Sự</span>
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
              {activeTab === 'accounts' && '👥 Quản Lý Nhân Sự & Phân Quyền Cán Bộ'}
              {activeTab === 'settings' && '⚙️ Cài Đặt Hệ Thống & Thời Hạn Nộp'}
            </h4>
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

              {/* UNITS INVENTORY GRID SECTION (Merged directly into Overview) */}
              <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h5 style={{ fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🏢 Bảng Hàng &amp; Quản Lý Tầng / Phòng
                      <span className="badge bg-emerald-subtle text-emerald fs-8 border ms-2" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                        {units.length} Căn hộ tổng
                      </span>
                    </h5>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Chọn tầng, thêm phòng mới, chỉnh sửa loại phòng, diện tích và cập nhật trạng thái bán
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select 
                      value={unitTypeFilter}
                      onChange={(e) => setUnitTypeFilter(e.target.value)}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    >
                      <option value="all">Tất cả loại căn</option>
                      {roomTypes.map(rt => (
                        <option key={rt} value={rt}>{rt}</option>
                      ))}
                    </select>

                    <button 
                      type="button" 
                      onClick={() => setShowBatchFloorModal(true)}
                      className="btn btn-sm text-white rounded-2 px-3 fw-bold shadow-sm"
                      style={{ backgroundColor: '#2563eb', border: 'none' }}
                    >
                      🏗️ Tạo Hàng Loạt Tầng
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setShowCreateUnitModal(true)}
                      className="btn btn-sm btn-emerald text-white rounded-2 px-3 fw-bold shadow-sm"
                      style={{ backgroundColor: '#059669', border: 'none' }}
                    >
                      ➕ Thêm Lẻ 1 Phòng
                    </button>
                  </div>
                </div>

                {unitMessage && (
                  <div className={`alert ${unitMessage.includes('🎉') || unitMessage.includes('🗑️') ? 'alert-success' : 'alert-danger'} py-2 px-3 small rounded-3 mb-3 shadow-sm`}>
                    {unitMessage}
                  </div>
                )}

                {/* Quick Floor Tabs & Delete Floor Button */}
                <div className="d-flex align-items-center justify-content-between gap-2 pb-2 mb-3 border-bottom">
                  <div className="d-flex gap-1 overflow-x-auto">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(fl => (
                      <button 
                        key={fl}
                        type="button"
                        onClick={() => setUnitFloor(fl)}
                        style={{
                          padding: '3px 10px', borderRadius: '6px', border: '1px solid ' + (unitFloor === fl ? '#059669' : '#e2e8f0'),
                          backgroundColor: unitFloor === fl ? '#059669' : '#f8fafc', color: unitFloor === fl ? '#fff' : '#475569',
                          fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                      >
                        T{fl}
                      </button>
                    ))}
                  </div>

                  <button 
                    type="button" 
                    onClick={() => handleDeleteFloor(unitFloor)}
                    className="btn btn-sm btn-outline-danger py-1 px-3 fw-bold rounded-2 fs-8 text-nowrap ms-2"
                  >
                    🗑️ Xóa Tầng {unitFloor}
                  </button>
                </div>

                {/* Units Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  {filteredUnits.length === 0 ? (
                    <div className="col-12 text-center py-4 text-muted fs-8">
                      Chưa có phòng nào tại Tầng {unitFloor}. Nhấn <strong>"➕ Thêm Phòng Mới"</strong> để tạo phòng cho tầng này.
                    </div>
                  ) : (
                    filteredUnits.map(unit => (
                      <div 
                        key={unit.id}
                        onClick={() => handleSelectUnit(unit)}
                        style={{
                          padding: '12px', borderRadius: '10px', border: '2px solid', cursor: 'pointer', transition: 'all 0.15s',
                          borderColor: selectedUnit?.id === unit.id ? '#2563eb' : (unit.status === 'sold' ? '#cbd5e1' : unit.status === 'reserved' ? '#fde047' : '#86efac'),
                          backgroundColor: unit.status === 'sold' ? '#f8fafc' : unit.status === 'reserved' ? '#fefce8' : '#f0fdf4'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>{unit.roomNumber}</strong>
                          <span className="badge bg-secondary-subtle text-dark fs-8">{unit.type}</span>
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Diện tích: {unit.area} m²</div>

                        <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: unit.status === 'sold' ? '#64748b' : unit.status === 'reserved' ? '#d97706' : '#059669' }}>
                          {unit.status === 'available' ? '🟢 Còn trống' : unit.status === 'reserved' ? '🟡 Đã giữ chỗ' : '🔴 Đã bán'}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Detailed Room Management & Edit Panel */}
                {selectedUnit && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }} className="shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                      <h6 style={{ fontWeight: '800', color: '#0f172a', margin: 0, fontSize: '14px' }}>
                        ⚙️ Quản Lý &amp; Sửa Chi Tiết Căn Hộ: <span className="text-primary fw-bold">{selectedUnit.roomNumber}</span>
                      </h6>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteUnit(selectedUnit.id)}
                        className="btn btn-sm btn-outline-danger py-1 px-3 fw-bold rounded-2 fs-8"
                      >
                        🗑️ Xóa Căn Hộ Này
                      </button>
                    </div>

                    <form onSubmit={handleUpdateUnitDetail}>
                      <div className="row g-3 mb-3">
                        <div className="col-12 col-sm-3">
                          <label className="form-label fw-bold fs-8 text-secondary mb-1">Tầng ở:</label>
                          <input 
                            type="number" 
                            className="form-control form-control-sm fw-semibold"
                            min="1" max="50"
                            value={editUnitFloorNum}
                            onChange={(e) => setEditUnitFloorNum(e.target.value)}
                          />
                        </div>
                        <div className="col-12 col-sm-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <label className="form-label fw-bold fs-8 text-secondary m-0">Loại căn hộ:</label>
                            <button 
                              type="button" 
                              className="btn btn-link p-0 text-primary fs-8 text-decoration-none fw-bold"
                              onClick={() => {
                                const newType = prompt('Nhập tên loại phòng mới (VD: Dual Key, Duplex, 4PN):');
                                if (newType) handleAddNewRoomType(newType);
                              }}
                            >
                              ➕ Thêm mới
                            </button>
                          </div>
                          <select 
                            className="form-select form-select-sm fw-semibold"
                            value={editUnitType}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                const newType = prompt('Nhập tên loại phòng mới (VD: Dual Key, Duplex, 4PN):');
                                if (newType) {
                                  handleAddNewRoomType(newType);
                                  setEditUnitType(newType.trim());
                                }
                              } else {
                                setEditUnitType(e.target.value);
                              }
                            }}
                          >
                            {roomTypes.map(rt => (
                              <option key={rt} value={rt}>{rt}</option>
                            ))}
                            <option value="__add_new__">➕ Thêm loại phòng mới...</option>
                          </select>
                        </div>
                        <div className="col-12 col-sm-3">
                          <label className="form-label fw-bold fs-8 text-secondary mb-1">Diện tích (m²):</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            className="form-control form-control-sm fw-semibold"
                            value={editUnitArea}
                            onChange={(e) => setEditUnitArea(e.target.value)}
                          />
                        </div>
                        <div className="col-12 col-sm-3">
                          <label className="form-label fw-bold fs-8 text-secondary mb-1">Trạng thái bán:</label>
                          <select 
                            className="form-select form-select-sm fw-semibold"
                            value={unitStatus}
                            onChange={(e) => setUnitStatus(e.target.value)}
                          >
                            <option value="available">🟢 Còn trống (Cho phép đặt)</option>
                            <option value="reserved">🟡 Đã đặt giữ chỗ (Khóa căn)</option>
                            <option value="sold">🔴 Đã hoàn tất bán (Sold)</option>
                          </select>
                        </div>
                      </div>

                      <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-sm btn-light border px-3" onClick={() => setSelectedUnit(null)}>
                          Hủy
                        </button>
                        <button type="submit" className="btn btn-emerald btn-sm rounded-2 px-4 fw-bold text-white" style={{ backgroundColor: '#059669' }}>
                          💾 Lưu Chi Tiết Căn {selectedUnit.roomNumber}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: APPLICATIONS MANAGER */}
          {activeTab === 'applications' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedApp ? '1fr 420px' : '1fr', gap: '24px' }}>
              
              {/* Left Column: Applications List */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>

                {/* SESSION PROGRESS BAR */}
                {sessionProcessed > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 16px', backgroundColor: '#f0fdf4', borderRadius: '12px', marginBottom: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>🚀</span>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: '#047857' }}>
                          Đã xử lý: <span style={{ fontSize: '18px' }}>{sessionProcessed}</span> hồ sơ phiên này
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          Tốc độ: ~{sessionSpeed} HS/phút · Đang lọc: {filteredApps.length} hồ sơ
                        </div>
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <span style={{ fontSize: '10px', color: '#6b7280', fontStyle: 'italic' }}>Phím tắt: ↑↓ chuyển · 1/2/3 duyệt · R trả về · Esc đóng</span>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE STAGE FILTER CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { id: 'all', label: 'Tất Cả', count: apps.length, color: '#0f172a', bg: '#f8fafc', emoji: '🌐' },
                    { id: 'intake', label: 'GĐ 1: Mới nộp', count: stageIntakeCount, color: '#3b82f6', bg: '#eff6ff', emoji: '🔵' },
                    { id: 'control', label: 'GĐ 2: Kiểm soát', count: stageControlCount, color: '#8b5cf6', bg: '#f5f3ff', emoji: '🟣' },
                    { id: 'hardcopy', label: 'GĐ 3: Bản gốc', count: stageHardcopyCount, color: '#f97316', bg: '#fff7ed', emoji: '🟠' },
                    { id: 'archive', label: 'GĐ 4: Đã duyệt', count: stageArchiveCount, color: '#059669', bg: '#ecfdf5', emoji: '🟢' },
                    { id: 'returned', label: 'Trả về', count: stageReturnedCount, color: '#ef4444', bg: '#fef2f2', emoji: '🔴' },
                    { id: 'wrong_k', label: 'Sai K', count: stageWrongKCount, color: '#dc2626', bg: '#fef2f2', emoji: '❌' }
                  ].map(card => (
                    <button
                      key={card.id}
                      onClick={() => { setStageFilter(card.id); setStatusFilter('all'); setCurrentPage(1); }}
                      style={{
                        padding: '10px 6px', borderRadius: '12px', border: stageFilter === card.id ? `2px solid ${card.color}` : '1px solid #e2e8f0',
                        backgroundColor: stageFilter === card.id ? card.bg : '#fff', cursor: 'pointer', textAlign: 'center',
                        transition: 'all 0.15s', boxShadow: stageFilter === card.id ? `0 4px 12px ${card.color}33` : '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ fontSize: '20px', fontWeight: '900', color: card.color, lineHeight: 1 }}>{card.count}</div>
                      <div style={{ fontSize: '9.5px', fontWeight: '700', color: stageFilter === card.id ? card.color : '#475569', marginTop: '3px' }}>{card.emoji} {card.label}</div>
                    </button>
                  ))}
                </div>

                {/* Search Bar & K-Group Filter (ON SAME ROW) */}
                <div className="d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
                  <input 
                    type="text" 
                    placeholder="🔍 Tìm theo Họ tên, SĐT, CCCD, Mã HS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '250px', fontSize: '12px' }}
                  />

                  <div className="d-flex align-items-center gap-1.5 flex-wrap justify-content-end">
                    <span className="fw-bold text-dark me-1" style={{ fontSize: '11px' }}>📋 Nhóm K:</span>
                    {['all', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10', 'K11'].map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => { setKFilter(k); setCurrentPage(1); }}
                        style={{
                          padding: '3px 8px', borderRadius: '12px', border: '1px solid ' + (kFilter === k ? '#0b6640' : '#e2e8f0'), fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
                          backgroundColor: kFilter === k ? '#0b6640' : '#f8fafc', color: kFilter === k ? '#fff' : '#475569'
                        }}
                      >
                        {k === 'all' ? '🌐 Tất cả' : k}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BATCH PROCESSING TOOLBAR */}
                {selectedIds.size > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#dbeafe', borderRadius: '10px', marginBottom: '8px', border: '1px solid #93c5fd', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '800', fontSize: '12px', color: '#1e40af' }}>
                      ✅ Đã chọn {selectedIds.size} hồ sơ
                    </span>
                    <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                      <button type="button" disabled={isBatchProcessing} onClick={() => handleBatchAction('bypass_intake', '⚡ Batch bypass → GĐ 2')}
                        style={{ padding: '3px 10px', borderRadius: '14px', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#059669', color: '#fff' }}>
                        ⚡ Bypass→GĐ2
                      </button>
                      <button type="button" disabled={isBatchProcessing} onClick={() => handleBatchAction('approve_digital', '✅ Batch duyệt → GĐ 3')}
                        style={{ padding: '3px 10px', borderRadius: '14px', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#3b82f6', color: '#fff' }}>
                        🔵 Duyệt→GĐ3
                      </button>
                      <button type="button" disabled={isBatchProcessing} onClick={() => handleBatchAction('archive', '🟢 Batch lưu trữ')}
                        style={{ padding: '3px 10px', borderRadius: '14px', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#0f172a', color: '#fff' }}>
                        🟢 Lưu trữ
                      </button>
                      <button type="button" disabled={isBatchProcessing} onClick={() => handleBatchAction('return_to_citizen', '🟠 Batch trả về')}
                        style={{ padding: '3px 10px', borderRadius: '14px', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#f59e0b', color: '#1e293b' }}>
                        🟠 Trả về
                      </button>
                      <button type="button" onClick={() => setSelectedIds(new Set())}
                        style={{ padding: '3px 10px', borderRadius: '14px', border: '1px solid #94a3b8', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#fff', color: '#475569' }}>
                        ✖ Bỏ chọn
                      </button>
                    </div>
                  </div>
                )}

                {batchMessage && (
                  <div className="alert alert-info py-2 small mb-2">{batchMessage}</div>
                )}

                {/* Applications Table — Compact for high-volume */}
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: '12px' }}>
                    <thead className="table-light text-uppercase" style={{ color: '#475569', fontSize: '10px' }}>
                      <tr>
                        <th style={{ width: '32px', padding: '6px' }}>
                          <input type="checkbox" checked={paginatedApps.length > 0 && paginatedApps.every(a => selectedIds.has(a.id))} onChange={toggleSelectAllPage} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                        </th>
                        <th style={{ padding: '6px' }}>Mã HS</th>
                        <th style={{ padding: '6px' }}>Khách hàng</th>
                        <th style={{ padding: '6px' }}>SĐT</th>
                        <th style={{ padding: '6px' }}>K</th>
                        <th style={{ padding: '6px' }}>%</th>
                        <th style={{ padding: '6px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedApps.length === 0 ? (
                        <tr><td colSpan="7" className="text-center py-4 text-muted">Không tìm thấy hồ sơ nào.</td></tr>
                      ) : (
                        paginatedApps.map(app => (
                          <tr 
                            key={app.id} 
                            style={{ 
                              backgroundColor: selectedApp?.id === app.id ? '#f0fdf4' : selectedIds.has(app.id) ? '#dbeafe' : 'transparent', 
                              cursor: 'pointer',
                              borderLeft: selectedApp?.id === app.id ? '3px solid #059669' : '3px solid transparent'
                            }} 
                            onClick={() => handleSelectApp(app)}
                          >
                            <td style={{ padding: '5px 6px' }} onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={selectedIds.has(app.id)} onChange={() => toggleSelectApp(app.id)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                            </td>
                            <td style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '11px', padding: '5px 6px' }}>{app.id?.substring(0, 8)}</td>
                            <td style={{ padding: '5px 6px' }}>
                              <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '12px', lineHeight: 1.2 }}>{app.fullName}</div>
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>{app.cccdNumber || '—'}</div>
                            </td>
                            <td style={{ fontSize: '11px', fontWeight: '600', padding: '5px 6px' }}>{app.phoneNumber}</td>
                            <td style={{ padding: '5px 6px' }}><span className="badge bg-light text-dark border" style={{ fontSize: '9px', padding: '2px 5px' }}>{app.targetObject || 'K1'}</span></td>
                            <td style={{ padding: '5px 6px' }}>
                              <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>{app.progressPercent || 50}%</span>
                            </td>
                            <td style={{ padding: '5px 6px' }}>
                              <span className={`badge px-2 py-1 rounded-2 ${
                                (app.status === 'approved' || app.status === 'luu_tru') ? 'bg-success text-white' :
                                app.status === 'to_kiem_soat' ? 'bg-primary text-white' :
                                app.status === 'bo_sung_ban_goc' ? 'bg-info text-dark' :
                                app.status === 'returned_for_supplement' ? 'bg-warning text-dark' :
                                app.status === 'rejected_wrong_k' ? 'bg-danger text-white' :
                                app.status === 'rejected' ? 'bg-danger text-white' : 'bg-warning text-dark'
                              }`} style={{ fontSize: '9px' }}>
                                {app.status === 'approved' || app.status === 'luu_tru' ? '🟢 Duyệt' :
                                 app.status === 'to_kiem_soat' ? '🟣 KS' :
                                 app.status === 'bo_sung_ban_goc' ? '🟠 BG' :
                                 app.status === 'returned_for_supplement' ? '🔴 BS' :
                                 app.status === 'rejected_wrong_k' ? '❌ K' :
                                 app.status === 'rejected' ? '❌' : '🟡 Mới'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* SMART PAGINATION */}
                <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: '11px' }}>
                      <strong>{filteredApps.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong>–<strong>{Math.min(currentPage * pageSize, filteredApps.length)}</strong> / <strong>{filteredApps.length}</strong>
                    </span>
                    <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                      style={{ padding: '2px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold' }}>
                      <option value={15}>15/trang</option>
                      <option value={25}>25/trang</option>
                      <option value={50}>50/trang</option>
                      <option value={100}>100/trang</option>
                    </select>
                  </div>

                  <div className="d-flex align-items-center gap-1">
                    <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      style={{ padding: '3px 8px', borderRadius: '14px', border: '1px solid ' + (currentPage === 1 ? '#e2e8f0' : '#475569'), fontSize: '11px', fontWeight: 'bold', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', backgroundColor: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#0f172a' }}>
                      ◀
                    </button>
                    {(() => {
                      const pages = [];
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (currentPage > 3) pages.push('...');
                        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
                        if (currentPage < totalPages - 2) pages.push('...');
                        pages.push(totalPages);
                      }
                      return pages.map((p, idx) => p === '...' ? (
                        <span key={`d${idx}`} style={{ padding: '0 3px', color: '#94a3b8', fontSize: '11px' }}>…</span>
                      ) : (
                        <button key={p} type="button" onClick={() => setCurrentPage(p)}
                          style={{ width: '26px', height: '26px', padding: 0, borderRadius: '50%', border: '1px solid ' + (currentPage === p ? '#059669' : '#cbd5e1'), fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: currentPage === p ? '#059669' : '#fff', color: currentPage === p ? '#fff' : '#0f172a', boxShadow: currentPage === p ? '0 2px 4px rgba(5,150,105,0.3)' : 'none' }}>
                          {p}
                        </button>
                      ));
                    })()}
                    <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      style={{ padding: '3px 8px', borderRadius: '14px', border: '1px solid ' + (currentPage >= totalPages ? '#e2e8f0' : '#475569'), fontSize: '11px', fontWeight: 'bold', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#fff', color: currentPage >= totalPages ? '#94a3b8' : '#0f172a' }}>
                      ▶
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
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-success py-0 px-2 fs-8 fw-semibold"
                              onClick={() => setPreviewDoc({
                                name: `Ảnh Mặt Trước CCCD (${selectedApp.fullName})`,
                                url: selectedApp.cccdFrontImage || selectedApp.cccdImage,
                                isImage: true
                              })}
                            >
                              Xem 👁
                            </button>
                          </div>
                        )}

                        {selectedApp.cccdBackImage && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#ecfdf5', borderRadius: '8px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 'bold', color: '#047857' }}>💳 Ảnh Mặt Sau CCCD</span>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-success py-0 px-2 fs-8 fw-semibold"
                              onClick={() => setPreviewDoc({
                                name: `Ảnh Mặt Sau CCCD (${selectedApp.fullName})`,
                                url: selectedApp.cccdBackImage,
                                isImage: true
                              })}
                            >
                              Xem 👁
                            </button>
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
                              onClick={() => setPreviewDoc({
                                name: docObj.name || k,
                                url: docObj.url,
                                isImage: docObj.url ? true : false
                              })}
                            >
                              Xem 👁
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>



                    <div className="mb-3 p-2.5 bg-light rounded-3 border">
                      <label className="form-label fw-bold fs-8 text-dark mb-1 d-flex align-items-center gap-1">
                        <span>💬</span> Ghi chú phản hồi gửi Khách hàng (Lý do trả về / bổ sung):
                      </label>
                      <textarea 
                        className="form-control form-control-sm border-secondary-subtle" 
                        rows="3"
                        placeholder="VD: Thiếu Giấy xác nhận chưa có nhà ở Mẫu 02 có dấu đỏ phường/xã. Vui lòng chụp bổ sung tệp..."
                        value={appNotes}
                        onChange={(e) => setAppNotes(e.target.value)}
                        style={{ fontSize: '12px' }}
                      />
                      <div className="form-text fs-8 text-muted mt-1">
                        💡 Nội dung ghi chú này sẽ hiển thị trực tiếp ở màn hình cá nhân (Portal) của người dân để họ biết lý do và chỉnh sửa bổ sung.
                      </div>
                    </div>

                  {/* Multi-Stage Action Buttons Panel */}
                  <div className="mb-3">
                    <h6 className="fw-bold text-dark fs-7 mb-2">⚡ Hành Động Xử Xý Hồ Sơ:</h6>

                    {!isStageAllowed(session?.role, selectedApp.stage) ? (
                      <div className="alert alert-warning py-2 px-3 small border-warning mb-3">
                        🔒 <strong>Giới hạn phân quyền giai đoạn:</strong> Tài khoản của bạn thuộc <strong>{roleInfo.title}</strong> (chỉ xử lý Giai đoạn {roleInfo.stage}). Hồ sơ này đang ở <strong>Giai đoạn {selectedApp.stage || 1}</strong> nên bạn không thể thực hiện thao tác.
                      </div>
                    ) : !isOfficerAssigned(session, selectedApp) ? (
                      <div className="alert alert-danger py-2 px-3 small border-danger mb-3 shadow-sm">
                        🔒 <strong>Giới hạn phân công cán bộ:</strong> Hồ sơ này đang được phân công riêng cho cán bộ <strong className="text-dark">{selectedApp.assignedOfficer}</strong> thụ lý. Chỉ cán bộ được phân công (hoặc Super Admin) mới có quyền thực hiện thao tác xử lý.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2 mb-3">
                        {/* QUYỀN TỔ TIẾP NHẬN (GĐ 1) HOẶC ADMIN */}
                        {(session?.role === 'admin' || session?.role === 'officer_intake') && (selectedApp.stage === 1 || !selectedApp.stage) && (
                          <>
                            <button 
                              type="button" 
                              className="btn btn-emerald btn-sm rounded-2 fw-bold text-start p-2 shadow-sm text-white"
                              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                              onClick={() => handleExecuteAction('bypass_intake', '')}
                            >
                              ⚡ Bypass Tổ Tiếp Nhận ➔ Đẩy lên Tổ Kiểm Soát
                            </button>

                            <button 
                              type="button" 
                              className="btn btn-danger btn-sm rounded-2 fw-bold text-start p-2 shadow-sm"
                              onClick={() => handleExecuteAction('reject_wrong_k', appNotes || 'Hồ sơ bị từ chối do chọn sai nhóm K. Yêu cầu nộp lại từ đầu.')}
                            >
                              ❌ Từ chối do chọn sai nhóm K (Bắt nộp lại từ đầu)
                            </button>
                          </>
                        )}

                        {/* QUYỀN TỔ KIỂM SOÁT (GĐ 2) HOẶC ADMIN */}
                        {(session?.role === 'admin' || session?.role === 'officer_control') && selectedApp.stage === 2 && (
                          <button 
                            type="button" 
                            className="btn btn-primary btn-sm rounded-2 fw-bold text-start p-2 shadow-sm"
                            onClick={() => handleExecuteAction('approve_digital', '')}
                          >
                            🔵 Duyệt bản số ➔ Chờ nộp bản gốc (Hạn 3-5 ngày)
                          </button>
                        )}

                        {/* QUYỀN TIẾP NHẬN BẢN GỐC (GĐ 3) HOẶC ADMIN */}
                        {(session?.role === 'admin' || session?.role === 'officer_hardcopy') && selectedApp.stage === 3 && (
                          <button 
                            type="button" 
                            className="btn btn-dark btn-sm rounded-2 fw-bold text-start p-2 shadow-sm"
                            onClick={() => handleExecuteAction('archive', '')}
                          >
                            🟢 Hoàn thành đối soát ➔ Chuyển vào Lưu Trữ
                          </button>
                        )}

                        {/* YÊU CẦU BỔ SUNG (Bản mềm/bản cứng tùy giai đoạn) */}
                        {selectedApp.stage < 4 && (
                          <button 
                            type="button" 
                            className="btn btn-warning btn-sm rounded-2 fw-bold text-start p-2 shadow-sm text-dark"
                            onClick={() => handleExecuteAction('return_to_citizen', appNotes || 'Yêu cầu người dân bổ sung thêm giấy tờ.')}
                          >
                            🟠 Trả hồ sơ về cho người dân (Yêu cầu bổ sung)
                          </button>
                        )}
                      </div>
                    )}
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

                    <button type="submit" className="btn btn-emerald btn-sm rounded-2 px-4 fw-bold">
                      💾 Lưu thay đổi căn {selectedUnit.roomNumber}
                    </button>
                  </form>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: ACCOUNTS MANAGEMENT */}
          {activeTab === 'accounts' && (
            <div className="d-flex flex-column gap-4 w-100">
              
              {accountMessage && (
                <div className={`alert ${accountMessage.includes('✅') || accountMessage.includes('🗑️') ? 'alert-success' : 'alert-danger'} py-2 px-3 small rounded-3 shadow-sm`}>
                  {accountMessage}
                </div>
              )}

              {/* Top Row: Create Account Form */}
              {/* UNIFIED MANAGEMENT CONSOLE HEADER */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                  <div>
                    <h4 style={{ fontWeight: '800', color: '#0f172a', margin: 0, fontSize: '18px' }}>
                      👥 Trung Tâm Quản Lý Nhân Sự &amp; Cài Đặt Đợt Nhận Hồ Sơ
                    </h4>
                    <div className="text-secondary fs-8 mt-1">
                      Cấu hình khung giờ nhận hồ sơ đợt 1, thiết lập hạn đối chiếu bản gốc và phân quyền tài khoản cán bộ thụ lý.
                    </div>
                  </div>
                  <span className="badge bg-emerald-subtle text-emerald px-3 py-2 rounded-2 fs-8 fw-bold" style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                    🟢 Đợt 1 Đang Hoạt Động
                  </span>
                </div>

                <div className="row g-4">
                  {/* LEFT COLUMN: SYSTEM & DEADLINE SETTINGS */}
                  <div className="col-12 col-xl-6">
                    <div className="p-3 bg-light rounded-3 border h-100 d-flex flex-column justify-content-between">
                      <div>
                        <h6 className="fw-bold text-dark fs-7 mb-3 d-flex align-items-center gap-2">
                          <span>⚙️</span> Cài Đặt Khung Giờ &amp; Hạn Nộp Hồ Sơ:
                        </h6>

                        {settingsMessage && (
                          <div className="alert alert-success py-1.5 px-3 small mb-2">{settingsMessage}</div>
                        )}

                        <form onSubmit={handleUpdateSettings}>
                          <div className="row g-3 mb-4">
                            <div className="col-12 col-md-6">
                              <div className="p-3 bg-white rounded-3 border shadow-sm h-100">
                                <label className="form-label fw-bold fs-8 text-secondary mb-2">🕒 Khung Giờ Mở Cổng Tự Động:</label>
                                <div className="row g-2 mb-2">
                                  <div className="col-6">
                                    <span className="fs-8 text-muted d-block mb-1">Mở cổng:</span>
                                    <input type="time" className="form-control form-control-sm fw-semibold" defaultValue="08:00" />
                                  </div>
                                  <div className="col-6">
                                    <span className="fs-8 text-muted d-block mb-1">Đóng cổng:</span>
                                    <input type="time" className="form-control form-control-sm fw-semibold" defaultValue="17:30" />
                                  </div>
                                </div>
                                <div className="form-check mt-2">
                                  <input type="checkbox" className="form-check-input" id="enableHoursCheck" defaultChecked />
                                  <label className="form-check-label fs-8 text-dark" htmlFor="enableHoursCheck">
                                    Tự động khóa nút nộp/sửa ngoài giờ 08:00 - 17:30.
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div className="col-12 col-md-6">
                              <div className="p-3 bg-white rounded-3 border shadow-sm h-100">
                                <label className="form-label fw-bold fs-8 text-secondary mb-2">⏱️ Hạn Chót Nộp &amp; Đối Chiếu Bản Gốc:</label>
                                <div className="mb-2">
                                  <span className="fs-8 text-muted d-block mb-1">Bản mềm (Đợt 1):</span>
                                  <input 
                                    type="datetime-local" 
                                    className="form-control form-control-sm rounded-2 fw-semibold"
                                    value={deadlineVal}
                                    onChange={(e) => setDeadlineVal(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <span className="fs-8 text-muted d-block mb-1">Đối chiếu bản gốc:</span>
                                  <input 
                                    type="datetime-local" 
                                    className="form-control form-control-sm rounded-2 fw-semibold"
                                    value={hardCopyDeadlineVal}
                                    onChange={(e) => setHardCopyDeadlineVal(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            className="btn text-white rounded-2 w-100 py-2 fw-bold fs-7 shadow-sm"
                            style={{ backgroundColor: '#059669', border: 'none' }}
                          >
                            💾 Lưu Cài Đặt Khung Giờ &amp; Hạn Chót
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: CREATE NEW OFFICER FORM */}
                  <div className="col-12 col-xl-6">
                    <div className="p-3 bg-light rounded-3 border h-100 d-flex flex-column justify-content-between">
                      <div>
                        <h6 className="fw-bold text-dark fs-7 mb-3 d-flex align-items-center gap-2">
                          <span>➕</span> Thêm Tài Khoản Cán Bộ Thụ Lý Mới:
                        </h6>

                        {accountMessage && (
                          <div className={`alert py-1.5 px-3 small mb-2 ${accountMessage.includes('thành công') ? 'alert-success' : 'alert-danger'}`}>
                            {accountMessage}
                          </div>
                        )}

                        <form onSubmit={handleCreateUser}>
                          <div className="row g-2 mb-2">
                            <div className="col-6">
                              <label className="form-label fw-bold fs-8 text-secondary mb-1">Họ tên cán bộ <span className="text-danger">*</span></label>
                              <input 
                                type="text" 
                                className="form-control form-control-sm rounded-2" 
                                placeholder="Nhập họ tên"
                                value={accountForm.fullName}
                                onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                                required
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label fw-bold fs-8 text-secondary mb-1">SĐT (Tên đn) <span className="text-danger">*</span></label>
                              <input 
                                type="text" 
                                className="form-control form-control-sm rounded-2" 
                                placeholder="09xxxxxxxx"
                                value={accountForm.phoneNumber}
                                onChange={(e) => setAccountForm({ ...accountForm, phoneNumber: e.target.value })}
                                required
                              />
                            </div>
                          </div>

                          <div className="row g-2 mb-2">
                            <div className="col-6">
                              <label className="form-label fw-bold fs-8 text-secondary mb-1">Email làm việc</label>
                              <input 
                                type="email" 
                                className="form-control form-control-sm rounded-2" 
                                placeholder="canbo@hapro.vn"
                                value={accountForm.email}
                                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label fw-bold fs-8 text-secondary mb-1">Mật khẩu khởi tạo <span className="text-danger">*</span></label>
                              <input 
                                type="text" 
                                className="form-control form-control-sm rounded-2" 
                                placeholder="Mặc định 123456"
                                value={accountForm.password}
                                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                                required
                              />
                            </div>
                          </div>

                          <div className="mb-3">
                            <label className="form-label fw-bold fs-8 text-secondary mb-1">Tổ nghiệp vụ phân quyền <span className="text-danger">*</span></label>
                            <select 
                              className="form-select form-select-sm rounded-2 fw-semibold"
                              value={accountForm.role}
                              onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value })}
                              required
                            >
                              <option value="officer_intake">🔵 Tổ Tiếp Nhận (Duyệt Giai đoạn 1)</option>
                              <option value="officer_control">🟣 Tổ Kiểm Soát (Duyệt Giai đoạn 2)</option>
                              <option value="officer_hardcopy">🟠 Tiếp Nhận Bản Gốc (Duyệt Giai đoạn 3)</option>
                              <option value="officer_archive">🟢 Bộ Phận Lưu Trữ (Duyệt Giai đoạn 4)</option>
                            </select>
                          </div>

                          <button 
                            type="submit" 
                            className="btn btn-emerald rounded-2 w-100 py-2 fw-bold text-white shadow-sm mt-2"
                            style={{ backgroundColor: '#0f172a', borderColor: '#0f172a' }}
                            disabled={isSubmittingAccount}
                          >
                            {isSubmittingAccount ? '⏳ Đang khởi tạo...' : '➕ Khởi Tạo Tài Khoản Cán Bộ'}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. BOTTOM ROW: PERSONNEL LIST TABLE WITH PAGINATION */}
              {(() => {
                const filteredOfficers = usersList
                  .filter(u => u.role && u.role.startsWith('officer_'))
                  .filter(u => {
                    if (!accountSearch) return true;
                    const q = accountSearch.toLowerCase();
                    return (
                      u.fullName?.toLowerCase().includes(q) ||
                      u.phoneNumber?.includes(q) ||
                      u.email?.toLowerCase().includes(q)
                    );
                  });

                const totalAccPages = Math.ceil(filteredOfficers.length / accountPageSize) || 1;
                const paginatedOfficers = filteredOfficers.slice((accountPage - 1) * accountPageSize, accountPage * accountPageSize);

                return (
                  <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                      <div>
                        <h5 style={{ fontWeight: '800', color: '#0f172a', margin: 0 }}>
                          📋 Danh Sách Cán Bộ Quản Lý Hồ Sơ ({filteredOfficers.length})
                        </h5>
                        <div className="text-secondary fs-8 mt-1">
                          Danh sách tài khoản cán bộ nghiệp vụ được phân quyền quản lý và duyệt hồ sơ đợt này
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <input 
                          type="text" 
                          className="form-control form-control-sm rounded-2 px-3"
                          placeholder="🔍 Tìm cán bộ..."
                          style={{ width: '220px' }}
                          value={accountSearch}
                          onChange={(e) => { setAccountSearch(e.target.value); setAccountPage(1); }}
                        />
                        <select 
                          className="form-select form-select-sm rounded-2"
                          style={{ width: '110px' }}
                          value={accountPageSize}
                          onChange={(e) => { setAccountPageSize(Number(e.target.value)); setAccountPage(1); }}
                        >
                          <option value={5}>5/trang</option>
                          <option value={10}>10/trang</option>
                          <option value={20}>20/trang</option>
                        </select>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                        <thead className="table-light text-secondary">
                          <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th>Họ và tên</th>
                            <th>Số điện thoại (ID)</th>
                            <th>Email</th>
                            <th>Vai trò phân quyền</th>
                            <th>Hồ sơ đang thụ lý</th>
                            <th>Ngày tạo</th>
                            <th className="text-end">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedOfficers.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="text-center py-4 text-muted">
                                Không tìm thấy cán bộ nào.
                              </td>
                            </tr>
                          ) : (
                            paginatedOfficers.map((u, index) => {
                              let badgeBg = '#f1f5f9';
                              let badgeText = '#475569';
                              let roleLabel = 'Khách hàng';

                              if (u.role === 'admin') {
                                badgeBg = '#fef2f2'; badgeText = '#dc2626'; roleLabel = '👑 Super Admin';
                              } else if (u.role === 'officer_intake') {
                                badgeBg = '#eff6ff'; badgeText = '#2563eb'; roleLabel = '🔵 Tổ Tiếp Nhận (GĐ 1)';
                              } else if (u.role === 'officer_control') {
                                badgeBg = '#faf5ff'; badgeText = '#9333ea'; roleLabel = '🟣 Tổ Kiểm Soát (GĐ 2)';
                              } else if (u.role === 'officer_hardcopy') {
                                badgeBg = '#fff7ed'; badgeText = '#ea580c'; roleLabel = '🟠 Tiếp Nhận Bản Gốc (GĐ 3)';
                              } else if (u.role === 'officer_archive') {
                                badgeBg = '#f0fdf4'; badgeText = '#16a34a'; roleLabel = '🟢 Bộ Phận Lưu Trữ (GĐ 4)';
                              }

                              const realIdx = (accountPage - 1) * accountPageSize + index + 1;

                              return (
                                <tr key={u.id || index}>
                                  <td className="fw-bold text-muted">{realIdx}</td>
                                  <td className="fw-bold text-dark">{u.fullName || '—'}</td>
                                  <td><code className="text-dark fw-semibold">{u.phoneNumber}</code></td>
                                  <td className="text-secondary">{u.email || '—'}</td>
                                  <td>
                                    <span className="badge rounded-2 px-2.5 py-1.5 fw-bold" style={{ backgroundColor: badgeBg, color: badgeText, border: `1px solid ${badgeText}40` }}>
                                      {roleLabel}
                                    </span>
                                  </td>
                                  <td>
                                    {(() => {
                                      const count = apps.filter(a => (a.assignedOfficer || '').includes(u.fullName || '')).length;
                                      return (
                                        <span className={`badge px-2.5 py-1 rounded-pill fw-bold ${count > 5 ? 'bg-warning text-dark' : 'bg-light text-dark border'}`}>
                                          📁 {count} hồ sơ
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="text-muted fs-8">
                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                                  </td>
                                  <td className="text-end">
                                    {u.id !== 'admin-id' && u.id !== session?.userId ? (
                                      <button 
                                        className="btn btn-outline-danger btn-sm rounded-2 px-2.5 py-1 fs-8 fw-semibold"
                                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                                      >
                                        🗑️ Xóa
                                      </button>
                                    ) : (
                                      <span className="fs-8 text-muted fst-italic">Cố định</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PERSONNEL PAGINATION FOOTER */}
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 pt-3 border-top" style={{ fontSize: '12px' }}>
                      <div className="text-secondary">
                        Hiển thị <strong>{filteredOfficers.length > 0 ? (accountPage - 1) * accountPageSize + 1 : 0}</strong>–<strong>{Math.min(filteredOfficers.length, accountPage * accountPageSize)}</strong> trên tổng số <strong>{filteredOfficers.length}</strong> cán bộ
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <button 
                          type="button" 
                          disabled={accountPage <= 1} 
                          onClick={() => setAccountPage(prev => Math.max(1, prev - 1))}
                          className="btn btn-sm btn-outline-secondary py-1 px-2.5 rounded-2"
                        >
                          ◀ Trước
                        </button>
                        <span className="px-2 fw-bold text-dark">
                          Trang {accountPage} / {totalAccPages}
                        </span>
                        <button 
                          type="button" 
                          disabled={accountPage >= totalAccPages} 
                          onClick={() => setAccountPage(prev => Math.min(totalAccPages, prev + 1))}
                          className="btn btn-sm btn-outline-secondary py-1 px-2.5 rounded-2"
                        >
                          Sau ▶
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: 🎲 QUẢN LÝ BỐC THĂM NHÀ Ở XÃ HỘI */}
          {/* ========================================================================= */}
          {activeTab === 'lottery' && (
            <div className="animate-fade-in">
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom pb-3 mb-4">
                  <div>
                    <span className="badge bg-primary-subtle text-primary border px-3 py-1 rounded-2 mb-2 fw-bold" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      ⚙️ BẢNG ĐIỀU HÀNH BỐC THĂM CHÍNH THỨC
                    </span>
                    <h4 className="fw-extrabold text-dark m-0">🎲 Hệ Thống Quản Lý &amp; Tổ Chức Bốc Thăm NOXH</h4>
                    <div className="text-secondary fs-8 mt-1">
                      Quản lý danh sách bốc thăm theo Nghị định &amp; Luật Nhà ở: <strong>Giai đoạn 1 (Quyền mua)</strong> và <strong>Giai đoạn 2 (Vị trí &amp; Căn hộ)</strong>.
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {/* Docx Rulebook Preview Buttons */}
                    <Link 
                      href="/QuyCheBocTham"
                      className="btn btn-sm btn-outline-info rounded-2 px-2.5 py-1.5 fw-bold shadow-sm d-flex align-items-center gap-1.5 text-decoration-none"
                    >
                      📖 Xem quy chế bốc thăm
                    </Link>

                    {/* Select % Units Quota */}
                    <div className="d-flex align-items-center gap-1.5 bg-light p-1.5 rounded-2 border">
                      <span className="fw-bold fs-8 text-secondary ps-1">📊 Tỷ lệ bán:</span>
                      <select 
                        className="form-select form-select-sm fw-bold text-primary rounded-2 border-0 bg-white"
                        style={{ width: '115px' }}
                        value={releasePercentage}
                        onChange={(e) => setReleasePercentage(Number(e.target.value))}
                      >
                        <option value={50}>50% quỹ căn</option>
                        <option value={60}>60% quỹ căn</option>
                        <option value={70}>70% quỹ căn</option>
                        <option value={80}>80% quỹ căn</option>
                        <option value={90}>90% quỹ căn</option>
                        <option value={100}>100% (Toàn bộ)</option>
                      </select>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => handleRunOfficialLottery('phase1')}
                      disabled={isRunningLottery}
                      className="btn btn-emerald text-white rounded-2 px-3 py-2 fw-bold shadow-sm d-flex align-items-center gap-2"
                      style={{ backgroundColor: '#059669', border: 'none' }}
                    >
                      {isRunningLottery ? (
                        <>⏳ Đang quay...</>
                      ) : (
                        <>🎟️ Bốc GĐ 1 ({releasePercentage}%)</>
                      )}
                    </button>

                    <button 
                      type="button" 
                      onClick={() => handleRunOfficialLottery('phase2')}
                      disabled={isRunningLottery}
                      className="btn btn-primary text-white rounded-2 px-3 py-2 fw-bold shadow-sm d-flex align-items-center gap-2"
                      style={{ backgroundColor: '#2563eb', border: 'none' }}
                    >
                      {isRunningLottery ? (
                        <>⏳ Đang quay...</>
                      ) : (
                        <>🏢 Bốc GĐ 2 ({releasePercentage}%)</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-light rounded-3 border text-center">
                      <span className="fs-8 text-secondary fw-semibold d-block">Hồ sơ đủ điều kiện bốc thăm</span>
                      <span className="fs-3 fw-bold text-dark">
                        {apps.filter(a => a.status === 'approved' || a.status === 'luu_tru' || a.stage === 4).length || apps.length}
                      </span>
                      <span className="fs-8 text-muted d-block mt-0.5">Đã qua thẩm định bản gốc</span>
                    </div>
                  </div>
                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25 text-center">
                      <span className="fs-8 text-success fw-semibold d-block">🎯 Trúng Quyền Mua / Vị Trí</span>
                      <span className="fs-3 fw-bold text-success">
                        {lotteryResults ? lotteryResults.filter(r => r.lotteryStatus === 'WIN_BUY_RIGHT' || r.lotteryStatus === 'WIN_UNIT_LOCATION').length : 0}
                      </span>
                      <span className="fs-8 text-success d-block mt-0.5">Đã cấp xác nhận chính thức</span>
                    </div>
                  </div>
                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-warning bg-opacity-10 rounded-3 border border-warning border-opacity-25 text-center">
                      <span className="fs-8 text-warning text-dark fw-semibold d-block">📋 Danh sách Dự khuyết</span>
                      <span className="fs-3 fw-bold text-warning text-dark">
                        {lotteryResults ? lotteryResults.filter(r => r.lotteryStatus === 'RESERVE_BUY_RIGHT').length : 0}
                      </span>
                      <span className="fs-8 text-muted d-block mt-0.5">Chờ thay thế trong 03 ngày</span>
                    </div>
                  </div>
                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-secondary bg-opacity-10 rounded-3 border border-secondary border-opacity-25 text-center">
                      <span className="fs-8 text-secondary fw-semibold d-block">⚪ Phiếu trắng NV1</span>
                      <span className="fs-3 fw-bold text-secondary">
                        {lotteryResults ? lotteryResults.filter(r => r.lotteryStatus === 'WHITE_TICKET').length : 0}
                      </span>
                      <span className="fs-8 text-muted d-block mt-0.5">Được chuyển bốc NV2</span>
                    </div>
                  </div>
                </div>

                {/* Filter and Table Header */}
                {(() => {
                  const filteredLottery = (lotteryResults || [])
                    .filter(r => {
                      if (!lotterySearch) return true;
                      const q = lotterySearch.toLowerCase();
                      return r.fullName?.toLowerCase().includes(q) || r.phoneNumber?.includes(q) || r.id?.toLowerCase().includes(q);
                    })
                    .filter(r => {
                      if (lotteryFilterType === 'win') return r.lotteryStatus === 'WIN_BUY_RIGHT' || r.lotteryStatus === 'WIN_UNIT_LOCATION';
                      if (lotteryFilterType === 'reserve') return r.lotteryStatus === 'RESERVE_BUY_RIGHT';
                      if (lotteryFilterType === 'white') return r.lotteryStatus === 'WHITE_TICKET';
                      return true;
                    });

                  const totalLotteryPages = Math.ceil(filteredLottery.length / lotteryPageSize) || 1;
                  const paginatedLottery = filteredLottery.slice((lotteryPage - 1) * lotteryPageSize, lotteryPage * lotteryPageSize);

                  return (
                    <>
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                        <h6 className="fw-bold text-dark m-0">
                          📋 Bảng Kết Quả Bốc Thăm Chi Tiết ({filteredLottery.length} kết quả)
                        </h6>
                        <div className="d-flex align-items-center gap-2">
                          <input 
                            type="text" 
                            className="form-control form-control-sm rounded-2 px-3"
                            placeholder="🔍 Tìm người đăng ký, SĐT, CCCD..."
                            style={{ width: '220px' }}
                            value={lotterySearch}
                            onChange={(e) => { setLotterySearch(e.target.value); setLotteryPage(1); }}
                          />
                          <select 
                            className="form-select form-select-sm rounded-2"
                            style={{ width: '160px' }}
                            value={lotteryFilterType}
                            onChange={(e) => { setLotteryFilterType(e.target.value); setLotteryPage(1); }}
                          >
                            <option value="all">Tất cả kết quả</option>
                            <option value="win">🎯 Chỉ người trúng</option>
                            <option value="reserve">📋 Chỉ dự khuyết</option>
                            <option value="white">⚪ Chỉ phiếu trắng</option>
                          </select>
                          <select 
                            className="form-select form-select-sm rounded-2"
                            style={{ width: '110px' }}
                            value={lotteryPageSize}
                            onChange={(e) => { setLotteryPageSize(Number(e.target.value)); setLotteryPage(1); }}
                          >
                            <option value={15}>15/trang</option>
                            <option value={50}>50/trang</option>
                            <option value={100}>100/trang</option>
                            <option value={500}>500/trang</option>
                          </select>
                        </div>
                      </div>

                      {/* Results Table */}
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                          <thead className="table-light text-secondary">
                            <tr>
                              <th style={{ width: '50px' }}>STT</th>
                              <th>Họ và tên người đăng ký</th>
                              <th>Số điện thoại / CCCD</th>
                              <th>Đối tượng NOXH</th>
                              <th>Nhu cầu loại căn</th>
                              <th>Kết quả Bốc thăm</th>
                              <th>Chi tiết Vị trí / Ghi chú</th>
                            </tr>
                          </thead>
                          <tbody>
                            {!lotteryResults || lotteryResults.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="text-center py-5 text-muted">
                                  <span className="fs-1 d-block mb-2">🎲</span>
                                  Chưa có dữ liệu bốc thăm chính thức. Nhấn nút <strong>"🎟️ Chạy Bốc Thăm Giai Đoạn 1"</strong> hoặc <strong>"🏢 Chạy Bốc Thăm Giai Đoạn 2"</strong> ở trên để thực hiện bốc thăm tự động.
                                </td>
                              </tr>
                            ) : (
                              paginatedLottery.map((r, index) => {
                                const realIndex = (lotteryPage - 1) * lotteryPageSize + index + 1;
                                return (
                                  <tr key={r.id || index} style={{ backgroundColor: r.bgColor }}>
                                    <td className="fw-bold text-muted">{realIndex}</td>
                                    <td>
                                      <div className="fw-bold text-dark">{r.fullName || r.name || 'Khách hàng'}</div>
                                      <span className="fs-8 text-muted">Mã HS: {r.id}</span>
                                    </td>
                                    <td>
                                      <code className="fw-semibold text-dark">{r.phoneNumber || r.cccdNumber || '—'}</code>
                                    </td>
                                    <td>
                                      <span className="badge bg-secondary-subtle text-dark border fs-8">
                                        {r.targetObject || 'K1'}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="badge bg-light text-dark border fs-8">
                                        {r.unitType || '2PN'}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="badge rounded-2 px-2.5 py-1.5 fw-bold text-white" style={{ backgroundColor: r.badgeColor }}>
                                        {r.statusText}
                                      </span>
                                    </td>
                                    <td>
                                      {r.allocatedRoomCode ? (
                                        <div>
                                          <span className="fw-bold text-primary">{r.allocatedRoomCode}</span>
                                          <span className="text-secondary fs-8 ms-2">({r.allocatedTower} - {r.allocatedFloor} - {r.allocatedArea})</span>
                                        </div>
                                      ) : (
                                        <span className="fs-8 text-secondary">{r.note}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* LOTTERY PAGINATION FOOTER */}
                      {filteredLottery.length > 0 && (
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 pt-3 border-top" style={{ fontSize: '12px' }}>
                          <div className="text-secondary">
                            Hiển thị <strong>{(lotteryPage - 1) * lotteryPageSize + 1}</strong>–<strong>{Math.min(filteredLottery.length, lotteryPage * lotteryPageSize)}</strong> trên tổng số <strong>{filteredLottery.length}</strong> kết quả
                          </div>
                          <div className="d-flex align-items-center gap-1">
                            <button 
                              type="button" 
                              disabled={lotteryPage <= 1} 
                              onClick={() => setLotteryPage(prev => Math.max(1, prev - 1))}
                              className="btn btn-sm btn-outline-secondary py-1 px-2.5 rounded-2"
                            >
                              ◀ Trước
                            </button>
                            <span className="px-2 fw-bold text-dark">
                              Trang {lotteryPage} / {totalLotteryPages}
                            </span>
                            <button 
                              type="button" 
                              disabled={lotteryPage >= totalLotteryPages} 
                              onClick={() => setLotteryPage(prev => Math.min(totalLotteryPages, prev + 1))}
                              className="btn btn-sm btn-outline-secondary py-1 px-2.5 rounded-2"
                            >
                              Sau ▶
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}



        </main>
      </div>

      {/* BATCH CREATE FLOORS & ROOMS TEMPLATE MODAL */}
      {showBatchFloorModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1062 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-white border-bottom py-3 px-4">
                <div>
                  <h6 className="modal-title fw-bold m-0 text-dark fs-6 d-flex align-items-center gap-2">
                    <span>🏗️</span> Khởi Tạo Hàng Loạt Tầng &amp; Sơ Đồ Căn Hộ Mẫu
                  </h6>
                  <div className="text-secondary fs-8 mt-1">
                    Thiết lập danh sách các phòng mẫu cho 1 tầng điển hình và áp dụng tự động cho hàng loạt tầng cùng lúc.
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowBatchFloorModal(false)}></button>
              </div>
              <form onSubmit={handleBatchCreateFloors}>
                <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                  {/* Step 1: Range of floors */}
                  <div className="p-3 bg-light rounded-3 border mb-4">
                    <h6 className="fw-bold text-dark fs-7 mb-2">1. Chọn khoảng Tầng áp dụng (Nhiều tầng cùng lúc):</h6>
                    <div className="row g-3">
                      <div className="col-4">
                        <label className="form-label fw-bold fs-8 text-secondary">Từ Tầng <span className="text-danger">*</span></label>
                        <input 
                          type="number" 
                          className="form-control form-control-sm fw-bold text-dark"
                          min="1" max="50"
                          value={batchFromFloor}
                          onChange={(e) => setBatchFromFloor(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-4">
                        <label className="form-label fw-bold fs-8 text-secondary">Đến Tầng <span className="text-danger">*</span></label>
                        <input 
                          type="number" 
                          className="form-control form-control-sm fw-bold text-dark"
                          min="1" max="50"
                          value={batchToFloor}
                          onChange={(e) => setBatchToFloor(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-4">
                        <label className="form-label fw-bold fs-8 text-secondary">Mã Tòa Nhà</label>
                        <input 
                          type="text" 
                          className="form-control form-control-sm fw-bold text-dark"
                          value={batchTower}
                          onChange={(e) => setBatchTower(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-text fs-8 text-primary mt-2">
                      💡 Ví dụ: Từ tầng 6 đến tầng 15 ➔ Hệ thống sẽ tự động nhân bản 10 tầng giống hệt sơ đồ phòng dưới đây.
                    </div>
                  </div>

                  {/* Step 2: Define rooms layout template */}
                  <div className="p-3 bg-white rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h6 className="fw-bold text-dark fs-7 m-0">2. Cấu hình Sơ đồ Phòng Mẫu cho 1 Tầng ({roomsTemplate.length} phòng/tầng):</h6>
                        <span className="fs-8 text-muted">Các phòng này sẽ xuất hiện giống nhau trên mọi tầng được chọn ở trên.</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleAddRoomToTemplate}
                        className="btn btn-sm btn-outline-primary py-1 px-3 fw-bold rounded-2 fs-8"
                      >
                        ➕ Thêm 1 Vị Trí Phòng
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0" style={{ fontSize: '13px' }}>
                        <thead className="table-light text-secondary">
                          <tr>
                            <th style={{ width: '60px' }}>STT</th>
                            <th>Mã phòng mẫu</th>
                            <th>Loại căn hộ</th>
                            <th>Diện tích (m²)</th>
                            <th className="text-end" style={{ width: '60px' }}>Xóa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roomsTemplate.map((rm, idx) => (
                            <tr key={idx}>
                              <td className="fw-bold text-muted">{idx + 1}</td>
                              <td>
                                <code className="fw-bold text-dark fs-7">
                                  {batchTower}-06{idx + 1 < 10 ? '0' + (idx + 1) : idx + 1}
                                </code>
                              </td>
                              <td>
                                <select 
                                  className="form-select form-select-sm fw-semibold"
                                  value={rm.type}
                                  onChange={(e) => {
                                    if (e.target.value === '__add_new__') {
                                      const newType = prompt('Nhập tên loại căn hộ mới (VD: Dual Key, Duplex, 4PN):');
                                      if (newType) {
                                        handleAddNewRoomType(newType);
                                        handleUpdateTemplateRoom(idx, 'type', newType.trim());
                                      }
                                    } else {
                                      handleUpdateTemplateRoom(idx, 'type', e.target.value);
                                    }
                                  }}
                                >
                                  {roomTypes.map(rt => (
                                    <option key={rt} value={rt}>{rt}</option>
                                  ))}
                                  <option value="__add_new__">➕ Thêm loại căn mới...</option>
                                </select>
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  step="0.1"
                                  className="form-control form-control-sm fw-semibold"
                                  value={rm.area}
                                  onChange={(e) => handleUpdateTemplateRoom(idx, 'area', Number(e.target.value))}
                                />
                              </td>
                              <td className="text-end">
                                <button 
                                  type="button"
                                  disabled={roomsTemplate.length <= 1}
                                  onClick={() => handleRemoveRoomFromTemplate(idx)}
                                  className="btn btn-sm btn-link text-danger p-0"
                                >
                                  ❌
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light border-top py-2.5 px-4">
                  <button type="button" className="btn btn-sm btn-light border px-3" onClick={() => setShowBatchFloorModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary text-white px-4 fw-bold shadow-sm" style={{ backgroundColor: '#2563eb' }}>
                    🏗️ Khởi Tạo {Math.abs(Number(batchToFloor) - Number(batchFromFloor)) + 1} Tầng Ngay
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW UNIT MODAL */}
      {showCreateUnitModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-white border-bottom py-3 px-4">
                <h6 className="modal-title fw-bold m-0 text-dark">
                  ➕ Thêm Phòng / Căn Hộ Mới
                </h6>
                <button type="button" className="btn-close" onClick={() => setShowCreateUnitModal(false)}></button>
              </div>
              <form onSubmit={handleCreateUnit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-bold fs-8 text-secondary">Số / Mã Phòng <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control form-control-sm rounded-2 fw-semibold"
                      placeholder="VD: B-0509"
                      value={newUnitForm.roomNumber}
                      onChange={(e) => setNewUnitForm({ ...newUnitForm, roomNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-bold fs-8 text-secondary">Vị trí Tầng <span className="text-danger">*</span></label>
                      <input 
                        type="number" 
                        className="form-control form-control-sm rounded-2 fw-semibold"
                        min="1" max="50"
                        value={newUnitForm.floor}
                        onChange={(e) => setNewUnitForm({ ...newUnitForm, floor: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold fs-8 text-secondary">Loại Căn Hộ <span className="text-danger">*</span></label>
                      <select 
                        className="form-select form-select-sm rounded-2 fw-semibold"
                        value={newUnitForm.type}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            const newType = prompt('Nhập tên loại căn hộ mới (VD: Dual Key, Duplex, 4PN):');
                            if (newType) {
                              handleAddNewRoomType(newType);
                              setNewUnitForm({ ...newUnitForm, type: newType.trim() });
                            }
                          } else {
                            setNewUnitForm({ ...newUnitForm, type: e.target.value });
                          }
                        }}
                        required
                      >
                        {roomTypes.map(rt => (
                          <option key={rt} value={rt}>{rt}</option>
                        ))}
                        <option value="__add_new__">➕ Thêm loại căn mới...</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold fs-8 text-secondary">Diện Tích Thông Thủy (m²) <span className="text-danger">*</span></label>
                    <input 
                      type="number" 
                      step="0.1"
                      className="form-control form-control-sm rounded-2 fw-semibold"
                      placeholder="VD: 65.5"
                      value={newUnitForm.area}
                      onChange={(e) => setNewUnitForm({ ...newUnitForm, area: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light border-top py-2.5 px-4">
                  <button type="button" className="btn btn-sm btn-light border px-3" onClick={() => setShowCreateUnitModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-sm btn-emerald text-white px-4 fw-bold" style={{ backgroundColor: '#059669' }}>
                    ➕ Khởi Tạo Căn Hộ
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1065 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-white border-bottom py-3 px-4">
                <h6 className="modal-title fw-bold m-0 d-flex align-items-center gap-2" style={{ color: '#0f172a', fontSize: '15px' }}>
                  <span>📄 Xem Tệp Thẩm Định:</span>
                  <span style={{ color: '#059669', fontWeight: '700' }}>{previewDoc.name || 'Tài liệu'}</span>
                </h6>
                <button type="button" className="btn-close" onClick={() => setPreviewDoc(null)}></button>
              </div>
              <div className="modal-body text-center p-4 bg-light">
                {previewDoc.url ? (
                  <div>
                    {(previewDoc.isImage || previewDoc.url.startsWith('data:image') || previewDoc.url.match(/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i)) ? (
                      <div className="p-2 bg-white rounded-3 border shadow-sm d-inline-block mw-100">
                        <img 
                          src={previewDoc.url} 
                          alt={previewDoc.name} 
                          className="img-fluid rounded" 
                          style={{ maxHeight: '65vh', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <iframe 
                        src={previewDoc.url} 
                        title={previewDoc.name}
                        style={{ width: '100%', height: '500px', border: 'none', borderRadius: '8px' }}
                      />
                    )}
                    <div className="mt-3 d-flex justify-content-center align-items-center gap-2">
                      <a href={previewDoc.url} target="_blank" rel="noreferrer" className="btn btn-outline-secondary btn-sm rounded-2 px-3 fw-bold">
                        🔗 Mở tab mới
                      </a>
                      <a href={previewDoc.url} download={previewDoc.name} className="btn btn-emerald btn-sm rounded-2 px-3 fw-bold text-white" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                        ⬇ Tải tệp về máy
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-3 border">
                    <span className="fs-1 d-block mb-2">📁</span>
                    <strong className="d-block text-dark mb-1">{previewDoc.name}</strong>
                    <span className="text-muted fs-8">Tệp chưa có liên kết hình ảnh trực tiếp.</span>
                  </div>
                )}
              </div>
              <div className="modal-footer bg-white py-2 px-4 justify-content-between">
                <span className="fs-8 text-muted">💡 Bạn có thể xem hình ảnh minh chứng chi tiết ngay trên màn hình.</span>
                <button type="button" className="btn btn-secondary btn-sm rounded-2 px-4 fw-semibold" onClick={() => setPreviewDoc(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
