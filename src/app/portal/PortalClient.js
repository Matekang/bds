'use client';

import React, { useState, useEffect, useRef } from 'react';
import { readQrFromImageFile, parseCccdQr, sampleCccdQrData } from '@/lib/cccdQr';
import { renderAsync } from 'docx-preview';

export default function PortalClient({ session, initialApplications }) {
  const [apps, setApps] = useState(initialApplications || []);
  const activeApp = apps.length > 0 ? apps[0] : null;

  const isSubmittedApp = activeApp && activeApp.status && activeApp.status !== 'draft';

  // Form View vs List View state
  const [viewMode, setViewMode] = useState(isSubmittedApp ? 'view' : 'edit'); // 'view' | 'edit'

  // Wizard Step State (1 -> 6)
  const [currentFormStep, setCurrentFormStep] = useState(isSubmittedApp ? 4 : 1);

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
  const [targetObjectDetail, setTargetObjectDetail] = useState(activeApp?.targetObjectDetail || '');
  const [maritalStatus, setMaritalStatus] = useState(activeApp?.maritalStatus || 'Độc thân/ Độc thân nuôi con');
  const [unitType, setUnitType] = useState(activeApp?.unitType || 'Căn 1 phòng ngủ');
  const [preferredFloor, setPreferredFloor] = useState(activeApp?.preferredFloor || 'mid');

  // Helper for dynamic unit pricing & area details
  const getUnitTypeDetails = (type) => {
    switch (type) {
      case 'Căn studio':
      case 'Studio':
        return { area: '30.25 – 35.50 m²', price: '820,000,000 – 960,000,000 đ' };
      case 'Căn 1 phòng ngủ':
      case '1PN':
        return { area: '39.33 – 50.84 m²', price: '1,067,000,000 – 1,325,000,000 đ' };
      case 'Căn 2 phòng ngủ':
      case '2PN':
        return { area: '55.10 – 68.40 m²', price: '1,490,000,000 – 1,850,000,000 đ' };
      case 'Căn 3 phòng ngủ':
      case '3PN':
        return { area: '72.60 – 84.90 m²', price: '1,960,000,000 – 2,290,000,000 đ' };
      default:
        return { area: '39.33 – 50.84 m²', price: '1,067,000,000 – 1,325,000,000 đ' };
    }
  };

  // eKYC States
  const [showEkycModal, setShowEkycModal] = useState(false);
  const [ekycScanning, setEkycScanning] = useState(false);
  const [ekycDone, setEkycDone] = useState(activeApp?.ekycStatus === 'verified');
  const [ekycExtractedData, setEkycExtractedData] = useState(activeApp?.ekycData || null);
  const [handbookModal, setHandbookModal] = useState(null);
  const [isDocLoading, setIsDocLoading] = useState(false);
  const docxContainerRef = useRef(null);

  useEffect(() => {
    if (handbookModal && handbookModal.url && docxContainerRef.current) {
      setIsDocLoading(true);
      docxContainerRef.current.innerHTML = '';

      fetch(handbookModal.url)
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
            experimental: false,
            trimXmlDeclaration: true,
            useBase64URL: false,
            useMathMLPolyfill: false,
            showChanges: false,
            debug: false
          })
            .then(() => {
              setIsDocLoading(false);
            })
            .catch(err => {
              console.error('Error rendering docx-preview:', err);
              setIsDocLoading(false);
            });
        })
        .catch(err => {
          console.error('Error fetching docx blob:', err);
          setIsDocLoading(false);
        });
    }
  }, [handbookModal]);

  // High-Concurrency Queue & Virtual Waiting Room States
  const [isQueuing, setIsQueuing] = useState(false);
  const [queuePos, setQueuePos] = useState(42);
  const [queueTotal, setQueueTotal] = useState(1000);
  const [queueWaitSec, setQueueWaitSec] = useState(3);
  const [queueTaskType, setQueueTaskType] = useState('Xử lý nộp hồ sơ');

  // Ticket STT Booking State
  const [generatedTicket, setGeneratedTicket] = useState(activeApp?.appointmentTicket || null);

  // STEP 3 STATES: Nộp hồ sơ (Tài khoản, CCCD 2 mặt & Giải mã QR)
  const [fullName, setFullName] = useState(activeApp?.fullName || session?.fullName || '');
  const [email, setEmail] = useState(activeApp?.email || session?.email || '');
  const [cccdNumber, setCccdNumber] = useState(activeApp?.cccdNumber || '');
  const [dob, setDob] = useState(activeApp?.dob || '');
  const [gender, setGender] = useState(activeApp?.gender || 'Nam');
  const [address, setAddress] = useState(activeApp?.address || '');
  const [issueDate, setIssueDate] = useState(activeApp?.issueDate || '');
  const [oldCmnd, setOldCmnd] = useState(activeApp?.oldCmnd || '');

  // CCCD 2 Mặt Files & Previews
  const [cccdFrontFile, setCccdFrontFile] = useState(null);
  const [cccdFrontPreview, setCccdFrontPreview] = useState(activeApp?.cccdFrontImage || activeApp?.cccdImage || '');
  const [cccdBackFile, setCccdBackFile] = useState(null);
  const [cccdBackPreview, setCccdBackPreview] = useState(activeApp?.cccdBackImage || '');
  const [cccdPreview, setCccdPreview] = useState(activeApp?.cccdImage || '');

  // Mã QR CCCD trích xuất
  const [qrParsedData, setQrParsedData] = useState(activeApp?.qrParsedData || null);
  const [isQrScanning, setIsQrScanning] = useState(false);

  // STEP 5 STATES: Lịch hẹn đối chứng bản cứng
  const [appointmentDate, setAppointmentDate] = useState(activeApp?.appointmentDate || '2026-08-22');
  const [appointmentTime, setAppointmentTime] = useState(activeApp?.appointmentTime || '09:00 - 10:00');
  const [appointmentConfirmed, setAppointmentConfirmed] = useState(activeApp?.appointmentConfirmed || false);

  const isAppSubmitted = activeApp && activeApp.status !== 'draft';

  // Documents state (doc1 -> doc9) - Null by default for new/draft applications
  const defaultDocs = {
    doc1: isAppSubmitted ? (activeApp?.documents?.doc1 || null) : null,
    doc2: isAppSubmitted ? (activeApp?.documents?.doc2 || null) : null,
    doc3: isAppSubmitted ? (activeApp?.documents?.doc3 || null) : null,
    doc4: isAppSubmitted ? (activeApp?.documents?.doc4 || null) : null,
    doc5: isAppSubmitted ? (activeApp?.documents?.doc5 || null) : null,
    doc6: isAppSubmitted ? (activeApp?.documents?.doc6 || null) : null,
    doc7: isAppSubmitted ? (activeApp?.documents?.doc7 || null) : null,
    doc8: isAppSubmitted ? (activeApp?.documents?.doc8 || null) : null,
    doc9: isAppSubmitted ? (activeApp?.documents?.doc9 || null) : null,
  };

  const [uploadedDocs, setUploadedDocs] = useState(defaultDocs);
  const [filesToUpload, setFilesToUpload] = useState({});
  const [cccdFile, setCccdFile] = useState(null);

  // Calculate dynamic completion percentage based strictly on actual uploaded files & verified eKYC
  const calculateDynamicProgress = () => {
    if (!isAppSubmitted && Object.keys(filesToUpload).length === 0 && !cccdFile && !ekycDone) {
      return 0;
    }
    let count = 0;
    let total = 8;
    
    if (cccdPreview || cccdFile || ekycDone || (isAppSubmitted && activeApp?.cccdImage)) count += 1;
    if (uploadedDocs.doc1 || filesToUpload.doc1) count += 1;
    if (uploadedDocs.doc2 || filesToUpload.doc2) count += 1;
    if (uploadedDocs.doc3 || filesToUpload.doc3) count += 1;
    if (uploadedDocs.doc4 || filesToUpload.doc4) count += 1;
    if (uploadedDocs.doc5 || filesToUpload.doc5) count += 1;
    if (uploadedDocs.doc7 || filesToUpload.doc7) count += 1;
    if (uploadedDocs.doc8 || filesToUpload.doc8) count += 1;

    if (count === 0) return 0;
    return Math.min(100, Math.round((count / total) * 100));
  };

  const dynamicProgress = calculateDynamicProgress();

  // Agreement Checkboxes (Un-ticked by default)
  const [agreedTerms1, setAgreedTerms1] = useState(false);
  const [agreedTerms2, setAgreedTerms2] = useState(false);

  // Status & Notification states
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [previewModalDoc, setPreviewModalDoc] = useState(null);
  const [rejectionNotificationModal, setRejectionNotificationModal] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const unreadNotifCount = apps.filter(a => a.notes || a.status === 'rejected_wrong_k' || a.status === 'returned_for_supplement' || a.status === 'approved' || a.status === 'to_kiem_soat').length;

  React.useEffect(() => {
    const target = activeApp || (apps && apps.length > 0 ? apps[0] : null);
    if (target) {
      if (target.status === 'rejected_wrong_k' || target.status === 'returned_for_supplement' || target.status === 'rejected') {
        setRejectionNotificationModal(target);
      }
    }
  }, [activeApp, apps]);

  // Operating Hours (08:00 -> 17:30)
  const checkIsOperatingHours = () => {
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    return curMin >= 8 * 60 && curMin <= 17 * 60 + 30;
  };
  const isOperatingHours = checkIsOperatingHours();

  // Danh sách các kênh biết đến thông tin
  const infoChannelsList = [
    { id: 'social_media', icon: '🌐', name: 'Mạng xã hội (Facebook, Zalo, TikTok)', desc: 'Tin tức, bài đăng, nhóm thảo luận trên MXH' },
    { id: 'press_media', icon: '📰', name: 'Báo chí / Truyền hình / Pano ngoài trời', desc: 'Báo điện tử, thời sự VTV/QTV, bảng biển quảng cáo' },
    { id: 'referral', icon: '👥', name: 'Người thân / Bạn bè / Đồng nghiệp giới thiệu', desc: 'Được người quen giới thiệu thông tin dự án' },
    { id: 'agency', icon: '🏢', name: 'Sàn giao dịch / Đơn vị tư vấn BĐS', desc: 'Chuyên viên tư vấn các sàn đối tác chính thức' },
    { id: 'bim_event', icon: '📬', name: 'Thư ngỏ / Sự kiện BIM Group', desc: 'Nhận thư ngỏ trực tiếp hoặc tham dự sự kiện' },
    { id: 'other', icon: '❓', name: 'Kênh thông tin khác', desc: 'Tìm kiếm trên Google, diễn đàn khác...' },
  ];

  // Danh sách đầy đủ 11 Nhóm đối tượng Luật Nhà Ở (Handico CT3-CT4 Kim Chung & Marina Living)
  const targetGroupsList = [
    { id: 'K1', title: 'K1 – Người có công với cách mạng, thân nhân liệt sĩ được hỗ trợ cải thiện nhà ở theo quy định', desc: 'Theo Luật Ưu đãi người có công. (Lưu ý: Nếu cả 2 vợ chồng đều có thu nhập thì cả 2 đều phải nộp xác nhận thu nhập)' },
    { id: 'K2', title: 'K2 – Hộ gia đình nghèo, cận nghèo tại khu vực nông thôn', desc: 'Có giấy xác nhận hộ nghèo/cận nghèo theo quy định của UBND cấp xã' },
    { id: 'K3', title: 'K3 – Hộ gia đình tại khu vực nông thôn thuộc vùng thường xuyên bị ảnh hưởng bởi thiên tai, biến đổi khí hậu', desc: 'Thuộc vùng ô nhiễm môi trường hoặc bị ảnh hưởng thiên tai tại khu vực nông thôn' },
    { id: 'K4', title: 'K4 – Hộ gia đình nghèo, cận nghèo tại khu vực đô thị', desc: 'Có giấy xác nhận hộ nghèo/cận nghèo tại khu vực đô thị' },
    { id: 'K5', title: 'K5 – Người thu nhập thấp tại khu vực đô thị', desc: 'Cán bộ, công chức, viên chức, người lao động thu nhập thấp (Không quá 15tr/tháng cá nhân hoặc 30tr/tháng 2 vợ chồng)' },
    { id: 'K6', title: 'K6 – Công nhân, người lao động đang làm việc tại các doanh nghiệp, hợp tác xã trong và ngoài khu công nghiệp', desc: 'Đang hợp đồng lao động và tham gia BHXH tại các doanh nghiệp, KCN' },
    { id: 'K7', title: 'K7 – Sĩ quan, quân nhân chuyên nghiệp, hạ sĩ quan thuộc lực lượng vũ trang nhân dân, công an nhân dân', desc: 'Lực lượng vũ trang nhân dân công tác tại các đơn vị trên địa bàn' },
    { id: 'K8', title: 'K8 – Cán bộ, công chức, viên chức theo quy định của pháp luật về cán bộ, công chức, viên chức', desc: 'Đang công tác tại các cơ quan Đảng, Nhà nước, Mặt trận Tổ quốc' },
    { id: 'K9', title: 'K9 – Đối tượng đã trả lại nhà ở công vụ theo quy định', desc: 'Đã hoàn tất trả lại nhà ở công vụ theo quy định' },
    { id: 'K10', title: 'K10 – Hộ gia đình, cá nhân thuộc diện thu hồi đất và phải giải tỏa, phá dỡ nhà ở theo quy định', desc: 'Chưa được nhà nước bồi thường bằng nhà ở hoặc đất ở tái định cư' },
    { id: 'K11', title: 'K11 – Học sinh, sinh viên các đại học, học viện, trường đại học, cao đẳng, dạy nghề', desc: 'Đang theo học tại các trường đại học, cao đẳng trên địa bàn' },
  ];

  // Document specifications list matching Vietnamese requirements
  const documentList = [
    {
      id: 'doc1',
      num: 1,
      required: true,
      title: 'Mẫu số 01_Mẫu đơn đăng ký mua, thuê mua, thuê NOXH (Ban hành kèm theo NĐ261/2025/NĐ-CP)',
      handbooks: [
        { 
          label: '📖 Sổ tay Mẫu 01', 
          url: '/files/20260722_Mẫu số 01_NĐ136.2026_Mẫu đơn đăng ký mua, thuê mua, thuê NOXH.docx'
        }
      ],
      templates: [
        { label: '📥 Tải mẫu 01 (.docx)', url: '/files/20260722_Mẫu số 01_NĐ136.2026_Mẫu đơn đăng ký mua, thuê mua, thuê NOXH.docx' }
      ]
    },
    {
      id: 'doc2',
      num: 2,
      required: true,
      title: 'Mẫu số 02_Giấy tờ chứng minh điều kiện về nhà ở để được mua, thuê mua nhà ở xã hội trường hợp chưa có nhà ở thuộc sở hữu của mình (Ban hành kèm theo TT08/2026/TT-BXD); hoặc Mẫu số 03_Giấy tờ chứng minh điều kiện về nhà ở...; hoặc 02 Mẫu tham khảo_Giấy tờ chứng minh...',
      handbooks: [
        { 
          label: '📖 Sổ tay Mẫu 02', 
          url: '/files/Mẫu số 02_Giấy tờ chứng minh điều kiện về nhà ở để được mua NOXH (chưa có nhà).docx'
        },
        { 
          label: '📖 STHD Khoảng cách nơi làm việc', 
          url: '/files/Phụ lục 01 khoảng cách nơi làm việc.docx'
        },
        { 
          label: '📖 STHD Duy nhất 01 nhà', 
          url: '/files/Xác nhận có duy nhất 01 nhà.docx'
        },
        { 
          label: '📖 Sổ tay Mẫu 03', 
          url: '/files/Mẫu số 03_Giấy tờ chứng minh điều kiện về nhà ở để được mua NOXH (đã có nhà) chưa sửa.docx'
        }
      ],
      templates: [
        { label: '📥 Tải Mẫu 02 (chưa có nhà)', url: '/files/Mẫu số 02_Giấy tờ chứng minh điều kiện về nhà ở để được mua NOXH (chưa có nhà).docx' },
        { label: '📥 Tải Mẫu 03 (đã có nhà)', url: '/files/Mẫu số 03_Giấy tờ chứng minh điều kiện về nhà ở để được mua NOXH (đã có nhà) chưa sửa.docx' },
        { label: '📥 Phụ lục khoảng cách', url: '/files/Phụ lục 01 khoảng cách nơi làm việc.docx' },
        { label: '📥 XN duy nhất 01 nhà', url: '/files/Xác nhận có duy nhất 01 nhà.docx' }
      ]
    },
    {
      id: 'doc3',
      num: 3,
      required: true,
      title: 'Giấy tờ chứng minh người có công với cách mạng hoặc thân nhân liệt sỹ (Pháp lệnh Ưu đãi người có công với cách mạng)',
      handbooks: [
        { 
          label: '📖 Sổ tay Hướng dẫn', 
          url: '/files/(STHD)_NgườiCóCông_ThânNhânLiệtSĩ_NOXH.docx'
        }
      ]
    },
    {
      id: 'doc4',
      num: 4,
      required: true,
      title: 'Bản sao y công chứng CCCD của Chủ hộ, tất cả các thành viên trong gia đình (nếu kết hôn) và tất cả thành viên có tên trong Xác nhận cư trú CT07',
      handbooks: [
        { 
          label: '📖 Sổ tay Hướng dẫn', 
          url: '/files/(STHD)_CCCD_HộChiếu_GiấyKhaiSinh_NOXH.docx'
        }
      ]
    },
    {
      id: 'doc5',
      num: 5,
      required: true,
      title: 'Giấy chứng nhận kết hôn hoặc xác nhận tình trạng hôn nhân của người đứng đơn',
      handbooks: [
        { 
          label: '📖 Sổ tay Hướng dẫn', 
          url: '/files/(STHD)_XácNhậnTìnhTrạngHônNhân_NOXH.docx'
        }
      ]
    },
    {
      id: 'doc6',
      num: 6,
      required: false,
      title: 'Giấy tờ chứng minh độc thân đang nuôi con vị thành niên (nếu có)',
      handbooks: [
        { 
          label: '📖 Sổ tay Hướng dẫn', 
          url: '/files/(STHD)_NgườiĐộcThânNuôiCon_NOXH.docx'
        }
      ]
    },
    {
      id: 'doc7',
      num: 7,
      required: true,
      title: 'Xác nhận cư trú của người đứng đơn (mẫu CT07; bổ sung xác nhận của vợ/chồng nếu không cùng nơi đăng ký cư trú)',
      handbooks: [
        { 
          label: '📖 Sổ tay Hướng dẫn', 
          url: '/files/(STHD)_XácNhậnCưTrú_NOXH.docx'
        }
      ]
    },
    {
      id: 'doc8',
      num: 8,
      required: false,
      title: 'Xác nhận người khuyết tật (nếu có)',
      handbooks: [
        { 
          label: '📖 Sổ tay Hướng dẫn', 
          url: '/files/(STHD)_XácNhậnNgườiKhuyếtTật_NOXH.docx'
        }
      ]
    },
    {
      id: 'doc9',
      num: 9,
      required: false,
      title: 'Giấy tờ chứng minh có từ 02 con đẻ trở lên (Nếu có)',
      handbooks: [
        { 
          label: '📖 Sổ tay Hướng dẫn', 
          url: '/files/(STHD)_ChứngMinhNgườiCóTừ02ConĐẻ_NOXH.docx'
        }
      ]
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

  // Xử lý kết quả giải mã QR CCCD
  const processQrResult = (rawQrString) => {
    const parsed = parseCccdQr(rawQrString);
    if (parsed) {
      setQrParsedData(parsed);
      if (parsed.fullName) setFullName(parsed.fullName);
      if (parsed.cccdNumber) setCccdNumber(parsed.cccdNumber);
      if (parsed.dob) setDob(parsed.dob);
      if (parsed.gender) setGender(parsed.gender);
      if (parsed.address) setAddress(parsed.address);
      if (parsed.issueDate) setIssueDate(parsed.issueDate);
      if (parsed.oldCmnd) setOldCmnd(parsed.oldCmnd);
      setMessage({ text: '✅ Giải mã mã QR CCCD thành công! Đã tự động chiết xuất toàn bộ thông tin cá nhân.', type: 'success' });
      return true;
    }
    return false;
  };

  // Quét QR từ tệp ảnh người dùng chọn (hỗ trợ đọc trực tiếp QR từ ảnh chụp màn hình/điện thoại)
  const handleQrFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsQrScanning(true);
    try {
      const qrString = await readQrFromImageFile(file);
      if (qrString) {
        const ok = processQrResult(qrString);
        if (!ok) {
          setMessage({ text: '⚠️ Đã quét mã QR thành công nhưng dữ liệu không khớp định dạng CCCD Việt Nam.', type: 'warning' });
        }
      } else {
        setMessage({ text: '⚠️ Không tìm thấy mã QR trong hình ảnh vừa tải lên. Vui lòng chọn ảnh chứa mã QR rõ nét hơn.', type: 'danger' });
      }
    } catch (err) {
      setMessage({ text: 'Lỗi trong quá trình quét tệp ảnh mã QR.', type: 'danger' });
    } finally {
      setIsQrScanning(false);
    }
  };

  // Sử dụng mẫu QR dùng thử (Demo)
  const handleApplySampleQr = (qrString) => {
    processQrResult(qrString);
  };

  // Tải lên ảnh Mặt Trước CCCD (Ảnh chân dung & Thông tin cơ bản)
  const handleCccdFrontChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCccdFrontFile(file);
      setCccdFile(file);
      const url = URL.createObjectURL(file);
      setCccdFrontPreview(url);
      setCccdPreview(url);
      
      if (!cccdNumber) {
        const generatedCccd = '035' + Math.floor(100000000 + Math.random() * 900000000);
        setCccdNumber(generatedCccd);
      }
      setMessage({ text: '📷 Đã tải lên ảnh Mặt Trước CCCD. Vui lòng tải tiếp Mặt Sau (nơi chứa Mã QR) để tự động quét chiết xuất dữ liệu.', type: 'info' });
    }
  };

  // Tải lên ảnh Mặt Sau CCCD (NƠI CHỨA MÃ QR & CHIP ĐIỆN TỬ)
  // Quy định: Bắt buộc phải tìm thấy Mã QR và đúng định dạng CCCD Việt Nam thì mới xem/chấp nhận tệp ảnh
  const handleCccdBackChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsQrScanning(true);
    try {
      // 1. Quét QR từ tệp ảnh Mặt Sau
      const qrString = await readQrFromImageFile(file);

      if (!qrString) {
        // KHÔNG TÌM THẤY MÃ QR -> CHẶN KHÔNG CHO VIEW VÀ THÔNG BÁO LỖI
        setCccdBackFile(null);
        setCccdBackPreview('');
        setQrParsedData(null);
        e.target.value = '';
        setMessage({ 
          text: '⚠️ Không tìm thấy mã QR trên ảnh Mặt Sau CCCD vừa tải lên. Vui lòng chọn/chụp ảnh Mặt Sau CCCD rõ nét chứa mã QR!', 
          type: 'danger' 
        });
        return;
      }

      // 2. KIỂM TRA ĐỊNH DẠNG QR CCCD VIỆT NAM
      const ok = processQrResult(qrString);
      if (!ok) {
        // CÓ QR NHƯNG KHÔNG ĐÚNG ĐỊNH DẠNG CCCD -> CHẶN KHÔNG CHO VIEW
        setCccdBackFile(null);
        setCccdBackPreview('');
        setQrParsedData(null);
        e.target.value = '';
        setMessage({ 
          text: '⚠️ Mã QR trong tệp ảnh KHÔNG ĐÚNG định dạng thẻ Căn cước công dân Việt Nam. Vui lòng tải đúng ảnh Mặt Sau CCCD!', 
          type: 'danger' 
        });
        return;
      }

      // 3. HỢP LỆ -> CHO PHÉP XEM (VIEW) VÀ TỰ ĐỘNG ĐIỀN THÔNG TIN
      setCccdBackFile(file);
      setCccdBackPreview(URL.createObjectURL(file));
      setMessage({ 
        text: '✅ Quét và giải mã thành công mã QR ở MẶT SAU CCCD! Đã tự động chiết xuất toàn bộ thông tin hồ sơ.', 
        type: 'success' 
      });

    } catch (err) {
      setCccdBackFile(null);
      setCccdBackPreview('');
      setQrParsedData(null);
      e.target.value = '';
      setMessage({ 
        text: '❌ Lỗi trong quá trình quét ảnh Mặt Sau CCCD. Vui lòng thử lại với tệp ảnh khác.', 
        type: 'danger' 
      });
    } finally {
      setIsQrScanning(false);
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

  // Helper đổi nhanh trạng thái Demo cho tài khoản đang đăng nhập (ví dụ: 0944562794)
  const handleQuickStatusToggle = async (targetStatus) => {
    const appToUpdate = activeApp || (apps && apps.length > 0 ? apps[0] : null);
    if (!appToUpdate || !appToUpdate.id) {
      setMessage({ text: '⚠️ Cần nộp/khai hồ sơ trước khi chuyển trạng thái demo.', type: 'warning' });
      return;
    }

    let patchBody = { status: targetStatus };
    if (targetStatus === 'returned_for_supplement') {
      patchBody.notes = '⚠️ Ban quản lý thông báo yêu cầu bổ sung: Thiếu Giấy xác nhận chưa có nhà ở Mẫu số 02 có dấu đỏ phường/xã. Vui lòng bổ sung tệp đính kèm.';
      patchBody.stage = 1;
    } else if (targetStatus === 'rejected_wrong_k') {
      patchBody.notes = '❌ Ban quản lý từ chối do chọn sai nhóm K: Kê khai sai đối tượng K1 trong khi giấy tờ đính kèm là Sinh viên (K11). Yêu cầu công dân nộp lại hồ sơ từ đầu.';
      patchBody.stage = 1;
    } else if (targetStatus === 'to_kiem_soat') {
      patchBody.notes = '⚡ Đã Bypass Tổ Tiếp Nhận → Chuyển hồ sơ lên Tổ Kiểm Soát thẩm định dữ liệu BHXH.';
      patchBody.stage = 2;
    } else if (targetStatus === 'bo_sung_ban_goc') {
      patchBody.notes = '🟠 Tổ Kiểm Soát đã duyệt sơ bộ. Hẹn người dân mang bản gốc đối chiếu tại bàn tiếp nhận số 02.';
      patchBody.stage = 3;
    } else if (targetStatus === 'approved') {
      patchBody.notes = '🟢 Hồ sơ đã thẩm định đạt 100% & Đã được chuyển vào danh sách bốc thăm căn hộ chính thức.';
      patchBody.stage = 4;
    } else if (targetStatus === 'submitted') {
      patchBody.notes = 'Hồ sơ mới nộp, đang chờ Tổ tiếp nhận thẩm định.';
      patchBody.stage = 1;
    }

    try {
      const res = await fetch(`/api/applications/${appToUpdate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `🎉 Đã chuyển nhanh trạng thái hồ sơ sang [${targetStatus.toUpperCase()}] thành công!`, type: 'success' });
        fetchApplications();
      }
    } catch (err) {
      console.error(err);
    }
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

  // eKYC Verification Handler
  const handleStartEkyc = () => {
    setShowEkycModal(true);
    setEkycScanning(true);
    setTimeout(() => {
      setEkycScanning(false);
      setEkycDone(true);
      const extracted = {
        fullName: fullName || session?.fullName || 'Nguyễn Văn An',
        cccdNumber: cccdNumber || '035200008801',
        dob: '15/08/1992',
        gender: 'Nam',
        address: 'Xã Thiên Lộc, Huyện Đông Anh, Thành phố Hà Nội',
        issueDate: '10/05/2021',
        verifiedAt: new Date().toLocaleString('vi-VN')
      };
      setEkycExtractedData(extracted);
      if (!fullName) setFullName(extracted.fullName);
      if (!cccdNumber) setCccdNumber(extracted.cccdNumber);
      setMessage({ text: '✅ Xác thực eKYC thành công! Đã tự động nhận diện thẻ CCCD.', type: 'success' });
    }, 2000);
  };

  // Reset Application when Wrong K is selected
  const handleResetApplication = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn nộp lại hồ sơ từ đầu với nhóm K mới?')) return;
    setIsLoading(true);
    try {
      const fd = new FormData();
      if (activeApp?.id) fd.append('appId', activeApp.id);
      fd.append('resetApp', 'true');
      fd.append('targetObject', targetObject);
      fd.append('targetObjectDetail', targetObjectDetail);

      const res = await fetch('/api/applications', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: '🔄 Đã làm lại hồ sơ. Vui lòng chọn lại nhóm đối tượng K chính xác và tải lại tài liệu.', type: 'info' });
        reloadApplications();
        setCurrentFormStep(1);
        setViewMode('edit');
      } else {
        setMessage({ text: `⚠️ Lỗi: ${data.message}`, type: 'danger' });
      }
    } catch (e) {
      setMessage({ text: 'Lỗi kết nối máy chủ.', type: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit / Update Application
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreedTerms1 || !agreedTerms2) {
      setMessage({ text: '⚠️ Bạn vui lòng tích chọn đồng ý 2 nội dung điều khoản để tiếp tục.', type: 'warning' });
      return;
    }

    setIsLoading(true);
    setQueueTaskType('Nộp & Mã Hóa Hồ Sơ Số');
    setQueuePos(Math.floor(15 + Math.random() * 25));
    setQueueTotal(1000);
    setIsQueuing(true);

    // Chờ 2.5s xử lý trong phòng chờ chống nghẽn 1.000 người
    await new Promise(r => setTimeout(r, 2500));
    setIsQueuing(false);

    try {
      const fd = new FormData();
      if (activeApp?.id) fd.append('appId', activeApp.id);
      fd.append('fullName', fullName);
      fd.append('email', email);
      fd.append('cccdNumber', cccdNumber);
      fd.append('infoChannel', infoChannel);
      fd.append('needLoanConsult', needLoanConsult);
      fd.append('targetObject', targetObject);
      fd.append('targetObjectDetail', targetObjectDetail);
      fd.append('maritalStatus', maritalStatus);
      fd.append('unitType', unitType);
      fd.append('preferredFloor', preferredFloor);
      fd.append('agreedTerms1', agreedTerms1);
      fd.append('agreedTerms2', agreedTerms2);
      if (ekycDone) {
        fd.append('ekycStatus', 'verified');
        fd.append('ekycData', JSON.stringify(ekycExtractedData || { verified: true }));
      }

      if (cccdFrontFile) fd.append('cccdFrontFile', cccdFrontFile);
      if (cccdBackFile) fd.append('cccdBackFile', cccdBackFile);
      if (cccdFile) fd.append('cccdFile', cccdFile);
      if (dob) fd.append('dob', dob);
      if (gender) fd.append('gender', gender);
      if (address) fd.append('address', address);
      if (issueDate) fd.append('issueDate', issueDate);
      if (oldCmnd) fd.append('oldCmnd', oldCmnd);
      if (qrParsedData) fd.append('qrParsedData', JSON.stringify(qrParsedData));

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

  // Confirm appointment in Step 5 & Generate Queue Monotonic STT Ticket
  const handleConfirmAppointment = async () => {
    setIsLoading(true);
    setQueueTaskType('Cấp Số Thứ Tự (STT) Đơn Tuyến');
    setQueuePos(Math.floor(10 + Math.random() * 20));
    setQueueTotal(1000);
    setIsQueuing(true);

    await new Promise(r => setTimeout(r, 2200));
    setIsQueuing(false);

    const ticketReq = {
      date: appointmentDate,
      timeSlot: appointmentTime,
      counter: 'Bàn tiếp nhận số 02 - Dự án CT3-CT4 Kim Chung Handico',
      createdAt: new Date().toLocaleString('vi-VN')
    };

    try {
      const fd = new FormData();
      if (activeApp?.id) fd.append('appId', activeApp.id);
      fd.append('appointmentTicket', JSON.stringify(ticketReq));
      const res = await fetch('/api/applications', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.success && data.application?.appointmentTicket) {
        setAppointmentConfirmed(true);
        setGeneratedTicket(data.application.appointmentTicket);
        reloadApplications();
        setMessage({ text: `🎉 Đã đặt lịch thành công! Số thứ tự độc bản của bạn là: ${data.application.appointmentTicket.sttNumber}`, type: 'success' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. TOP HEADER (Green Bar - Mobile Optimized) */}
      <header className="py-2 px-2 px-md-3 text-white shadow-sm" style={{ backgroundColor: '#0b6640', borderBottom: '1px solid #084e31' }}>
        <div className="container d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ maxWidth: '1240px' }}>
          
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
              style={{ backgroundColor: 'rgba(255,255,255,0.22)', fontSize: '0.8rem', fontWeight: 'bold' }}
              onClick={() => setShowNotificationModal(true)}
              title="Xem Thông báo & Ghi chú từ Cán bộ / Admin"
            >
              📁 Hồ sơ 
              <span className="badge bg-danger rounded-circle p-1 d-inline-flex align-items-center justify-content-center" style={{ minWidth: '18px', height: '18px', fontSize: '0.65rem' }}>
                {unreadNotifCount > 0 ? unreadNotifCount : apps.length}
              </span>
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

      {/* 2. SUB-BAR NAVIGATION (Seamless background, no border line, spacious padding) */}
      <div className="py-3 px-2 px-md-3 my-1">
        <div className="container d-flex align-items-center gap-3" style={{ maxWidth: '1240px' }}>
          
          <button 
            className="btn btn-sm rounded-2 px-3 py-1.5 border bg-white shadow-2sm"
            style={{ 
              borderColor: '#64748b', 
              color: '#334155', 
              fontSize: '0.9rem', 
              fontWeight: '400',
              borderRadius: '6px'
            }}
            onClick={() => setViewMode('my_applications')}
          >
            ← Hồ sơ của tôi
          </button>
          
          <span 
            className="badge text-white px-3 py-2 rounded-3 fw-bold" 
            style={{ backgroundColor: '#64748b', fontSize: '0.85rem', borderRadius: '8px' }}
          >
            {activeApp ? (
              activeApp.status === 'approved' ? '✓ Đã duyệt hồ sơ' :
              activeApp.status === 'rejected' ? '❌ Cần bổ sung' :
              activeApp.status === 'reviewing' ? '⏳ Đang thẩm duyệt' : 'Chờ gửi hồ sơ'
            ) : 'Chờ gửi hồ sơ'}
          </span>

        </div>
      </div>

      <div className="container py-3 px-2 px-md-3" style={{ maxWidth: '1240px' }}>

        {/* Operating Hours Alert Banner (08:00 - 17:30) */}
        {!isOperatingHours && (
          <div className="alert alert-warning border-start border-4 border-warning shadow-sm rounded-3 p-3 mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fs-4">🕒</span>
              <div>
                <strong className="d-block text-dark">THÔNG BÁO: HỆ THỐNG TẠM ĐÓNG CỔNG NỘP HỒ SƠ (08:00 - 17:30)</strong>
                <span className="text-dark small">Khung giờ làm việc tiếp nhận hồ sơ: <strong>08:00 đến 17:30</strong> hàng ngày. Quý khách vẫn có thể tra cứu hồ sơ nhưng tính năng gửi mới/chỉnh sửa tạm thời khóa cho đến 08:00 sáng mai.</span>
              </div>
            </div>
          </div>
        )}

        {/* 30-Day SLA & Status Bar */}
        {activeApp && (
          <div className="bg-white border rounded-3 p-3 mb-3 shadow-sm d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle bg-success bg-opacity-10 p-2 text-success fs-4">⏱️</div>
              <div>
                <div className="fw-bold text-dark fs-7">Thời Hạn Thụ Lý Hồ Sơ (SLA Quy Định 30 Ngày):</div>
                <div className="text-muted fs-8">Mỗi hồ sơ có tối đa 30 ngày để hoàn thiện toàn bộ thủ tục số &amp; đối chứng bản gốc.</div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-danger px-3 py-2 fs-7 rounded-pill fw-bold">⌛ Còn 24 ngày 18 giờ</span>
              {ekycDone || activeApp.ekycStatus === 'verified' ? (
                <span className="badge bg-success text-white px-3 py-2 fs-7 rounded-pill fw-bold">✓ eKYC Verified</span>
              ) : (
                <button className="btn btn-sm btn-outline-success rounded-pill px-3 py-1 fw-bold fs-8" onClick={handleStartEkyc}>
                  🔍 Xác thực eKYC ngay
                </button>
              )}
            </div>
          </div>
        )}

        {/* SINGLE PRIMARY APPLICATION STATUS NOTIFICATION BANNER */}
        {activeApp && (
          <div className={`card border-0 shadow-sm rounded-3 mb-3 p-3.5 ${
            activeApp.status === 'approved' ? 'bg-success bg-opacity-10 border-start border-5 border-success text-success-emphasis' :
            activeApp.status === 'rejected_wrong_k' ? 'bg-danger bg-opacity-10 border-start border-5 border-danger text-danger-emphasis' :
            activeApp.status === 'returned_for_supplement' ? 'bg-warning bg-opacity-10 border-start border-5 border-warning text-warning-emphasis' :
            activeApp.status === 'to_kiem_soat' ? 'bg-purple bg-opacity-10 border-start border-5 border-purple' : 'bg-primary bg-opacity-10 border-start border-5 border-primary'
          }`}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <span className="fw-bold fs-7 text-dark">📢 TÌNH TRẠNG HỒ SƠ HIỆN TẠI:</span>
                  <span className={`badge rounded-pill px-3 py-1.5 fs-7 fw-bold ${
                    activeApp.status === 'approved' ? 'bg-success text-white' :
                    activeApp.status === 'rejected_wrong_k' ? 'bg-danger text-white' :
                    activeApp.status === 'returned_for_supplement' ? 'bg-warning text-dark' :
                    activeApp.status === 'to_kiem_soat' ? 'bg-purple text-white' :
                    activeApp.status === 'bo_sung_ban_goc' ? 'bg-primary text-white' : 'bg-info text-dark'
                  }`}>
                    {activeApp.status === 'approved' ? '🟢 4. Đã duyệt - Đủ điều kiện vào bốc thăm' :
                     activeApp.status === 'rejected_wrong_k' ? '🔴 1. Bị từ chối do chọn sai nhóm K' :
                     activeApp.status === 'returned_for_supplement' ? '🟡 1. Trả về yêu cầu bổ sung Mẫu 02' :
                     activeApp.status === 'to_kiem_soat' ? '🟣 2. Đang thẩm định tại Tổ Kiểm Soát (GĐ 2)' :
                     activeApp.status === 'bo_sung_ban_goc' ? '🟠 3. Đã duyệt sơ bộ - Hẹn mang bản gốc (GĐ 3)' : '🔵 1. Mới nộp - Đang chờ Tổ Tiếp Nhận (GĐ 1)'}
                  </span>
                  <span className="badge bg-light text-dark border font-monospace fs-8">Mã HS: #{activeApp.id}</span>
                </div>

                <div className="mt-2 text-dark fs-8">
                  💬 <strong>Ghi chú từ Cán bộ / Admin:</strong>{' '}
                  <span className="fst-italic text-secondary">
                    "{activeApp.notes || 'Hồ sơ của bạn đã được ghi nhận vào hệ thống và đang trong quá trình xử lý.'}"
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                {activeApp.status === 'rejected_wrong_k' && (
                  <button className="btn btn-danger rounded-pill px-3.5 py-1.5 fw-bold fs-8 shadow-sm" onClick={() => { setViewMode('edit'); setCurrentFormStep(1); }}>
                    🔄 Nộp lại từ đầu (Chọn lại K)
                  </button>
                )}

                {activeApp.status === 'returned_for_supplement' && (
                  <button className="btn btn-warning text-dark rounded-pill px-3.5 py-1.5 fw-bold fs-8 shadow-sm" onClick={() => { setViewMode('edit'); setCurrentFormStep(4); }}>
                    📤 Tải lên bổ sung Mẫu 02
                  </button>
                )}

                {activeApp.status === 'approved' && (
                  <a href="/QuyCheBocTham" className="btn btn-success text-white rounded-pill px-3.5 py-1.5 fw-bold fs-8 shadow-sm">
                    🎲 Đến trang Bốc thăm ngay
                  </a>
                )}

                {(activeApp.status !== 'rejected_wrong_k' && activeApp.status !== 'returned_for_supplement' && activeApp.status !== 'approved') && (
                  <button className="btn btn-outline-secondary rounded-pill px-3.5 py-1.5 fw-semibold fs-8" onClick={() => setViewMode('view')}>
                    👁️ Xem hồ sơ đã nộp
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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
                  <span className="fw-medium text-dark">
                    {(cccdPreview || cccdFile || ekycDone) ? (cccdNumber || '035200008801') : 'Chưa cập nhật'}
                  </span>
                </div>

                <div className="d-flex justify-content-between py-1 border-bottom border-light">
                  <span className="text-muted">Đợt nộp:</span>
                  <span className="badge bg-light text-dark border">Đợt 1</span>
                </div>

                {/* Completion Progress Bar */}
                <div className="pt-2">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-muted fw-semibold">Hoàn thành:</span>
                    <strong className={dynamicProgress > 0 ? "text-success" : "text-secondary"}>{dynamicProgress}%</strong>
                  </div>
                  <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      role="progressbar" 
                      style={{ width: `${dynamicProgress}%`, backgroundColor: dynamicProgress > 0 ? '#0b6640' : '#cbd5e1' }} 
                      aria-valuenow={dynamicProgress} 
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
            
            {viewMode === 'my_applications' ? (
              /* MY APPLICATIONS LIST VIEW (MATCHING USER SCREENSHOT) */
              <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="fs-3">📁</span>
                  <h4 className="fw-bold mb-0" style={{ color: '#0b6640' }}>
                    Hồ sơ của tôi
                  </h4>
                </div>

                <p className="text-secondary small mb-4" style={{ fontSize: '0.9rem' }}>
                  Bạn đang có {apps.length > 0 ? apps.length : 1} hồ sơ chưa kết thúc. Chỉ có thể nộp hồ sơ mới khi hồ sơ hiện tại bị từ chối hoặc không hợp lệ.
                </p>

                {apps.length === 0 ? (
                  <div className="p-4 border rounded-3 text-center bg-light">
                    <p className="text-muted mb-3">Bạn chưa có hồ sơ nào.</p>
                    <button 
                      className="btn text-white rounded-3 px-4 py-2 fw-semibold" 
                      style={{ backgroundColor: '#0b6640' }}
                      onClick={() => { setViewMode('edit'); setCurrentFormStep(1); }}
                    >
                      + Tạo hồ sơ mới
                    </button>
                  </div>
                ) : (
                  apps.map((app, idx) => (
                    <div 
                      key={app.id || idx} 
                      className="p-3.5 mb-3 rounded-3 border d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 bg-white shadow-sm" 
                      style={{ borderColor: '#0b6640' }}
                    >
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1.5 flex-wrap">
                          <strong className="fs-6 text-dark fw-bold">
                            {app.id && app.id !== 'Chưa cấp' ? `Hồ sơ #${app.id}` : 'Hồ sơ nháp – chưa cấp mã'}
                          </strong>
                          <span className="badge rounded-pill text-white px-2.5 py-1 fs-8 fw-semibold" style={{ backgroundColor: '#64748b' }}>
                            {app.status === 'approved' ? '✓ Đã duyệt hồ sơ' :
                             app.status === 'rejected' ? '❌ Cần bổ sung' :
                             app.status === 'reviewing' ? '⏳ Đang thẩm duyệt' : 'Chờ gửi hồ sơ'}
                          </span>
                        </div>
                        <div className="text-secondary small" style={{ fontSize: '0.85rem' }}>
                          Ngày tạo: {app.createdAt ? new Date(app.createdAt).toLocaleDateString('vi-VN') : '08/08/2026'} · Đợt nộp: Đợt 1 · Giai đoạn 1/4 · Nhóm đối tượng: {app.targetObject || 'K1'}
                        </div>
                      </div>

                      <div>
                        <button 
                          type="button" 
                          className="btn text-white rounded-3 px-3.5 py-2 fw-semibold fs-7 border-0 text-nowrap shadow-sm"
                          style={{ backgroundColor: '#0b6640' }}
                          onClick={() => { setViewMode('edit'); setCurrentFormStep(app.status && app.status !== 'draft' ? 4 : 1); }}
                        >
                          Tiếp tục khai hồ sơ →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : viewMode === 'view' && activeApp ? (
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
                    <h5 className="fw-bold mb-4" style={{ color: '#0b6640', fontSize: '1.25rem' }}>
                      Bước 2/6 – Nhóm Đối Tượng &amp; Loại Căn
                    </h5>

                    <div className="row g-4 mb-4">
                      {/* Left Column */}
                      <div className="col-12 col-md-6 d-flex flex-column gap-3">
                        <div>
                          <label className="form-label fw-bold text-dark fs-7 mb-2">
                            Nhóm đối tượng thụ hưởng <span className="text-danger">*</span>
                          </label>
                          <select 
                            className="form-select rounded-3 py-2.5 px-3 border fs-7 bg-white shadow-sm"
                            style={{ borderColor: '#e2e8f0', color: '#1e293b' }}
                            value={targetObject}
                            onChange={(e) => setTargetObject(e.target.value)}
                          >
                            {targetGroupsList.map((tg) => (
                              <option key={tg.id} value={tg.id}>
                                {tg.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="form-label fw-bold text-dark fs-7 mb-2">
                            Tình trạng hôn nhân <span className="text-danger">*</span>
                          </label>
                          <select 
                            className="form-select rounded-3 py-2.5 px-3 border fs-7 bg-white shadow-sm"
                            style={{ borderColor: '#e2e8f0', color: '#1e293b' }}
                            value={maritalStatus}
                            onChange={(e) => setMaritalStatus(e.target.value)}
                          >
                            <option value="Độc thân/ Độc thân nuôi con">Độc thân/ Độc thân nuôi con</option>
                            <option value="Đã kết hôn">Đã kết hôn</option>
                            <option value="Đã ly hôn">Đã ly hôn</option>
                            <option value="Góa (vợ/chồng đã mất)">Góa (vợ/chồng đã mất)</option>
                          </select>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="col-12 col-md-6 d-flex flex-column gap-3">
                        <div>
                          <label className="form-label fw-bold text-dark fs-7 mb-2">
                            Loại căn hộ <span className="text-danger">*</span>
                          </label>
                          <select 
                            className="form-select rounded-3 py-2.5 px-3 border fs-7 bg-white shadow-sm"
                            style={{ borderColor: '#e2e8f0', color: '#1e293b' }}
                            value={unitType}
                            onChange={(e) => setUnitType(e.target.value)}
                          >
                            <option value="Căn studio">Căn studio</option>
                            <option value="Căn 1 phòng ngủ">Căn 1 phòng ngủ</option>
                            <option value="Căn 2 phòng ngủ">Căn 2 phòng ngủ</option>
                            <option value="Căn 3 phòng ngủ">Căn 3 phòng ngủ</option>
                          </select>
                        </div>

                        {/* Dynamic Reference Price & Area Info Box */}
                        {(() => {
                          const info = getUnitTypeDetails(unitType);
                          return (
                            <div className="p-3 rounded-3 border bg-light-subtle shadow-sm" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                              <div className="text-secondary small mb-1" style={{ fontSize: '0.85rem' }}>
                                Diện tích: {info.area}
                              </div>
                              <div className="fw-bold mb-2" style={{ color: '#0b6640', fontSize: '1.1rem' }}>
                                Giá tham chiếu: {info.price}
                              </div>
                              <div className="text-secondary small mb-2" style={{ fontSize: '0.82rem', lineHeight: '1.5' }}>
                                Thông tin về giá dựa trên thông tin trong bảng giá đã public trên sở xây dựng Quảng Ninh ngày 18/06/2026. Bảng giá đang cập nhật theo văn bản đã gửi Sở XD và đang chờ VB Sở XD chấp thuận
                              </div>
                              <a 
                                href="https://www.quangninh.gov.vn/So/soxaydung/Trang/ChiTietTinTuc.aspx?nid=5479" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary text-decoration-none small"
                                style={{ fontSize: '0.82rem' }}
                              >
                                https://www.quangninh.gov.vn
                              </a>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Footer Action Buttons */}
                    <div className="d-flex justify-content-between align-items-center pt-3 mt-4 border-top">
                      <button 
                        type="button" 
                        className="btn bg-white rounded-3 px-3 py-2 fw-semibold fs-7 border"
                        style={{ borderColor: '#cbd5e1', color: '#334155' }}
                        onClick={() => setCurrentFormStep(1)}
                      >
                        ← Quay lại
                      </button>

                      <button 
                        type="button" 
                        className="btn text-white rounded-3 px-4 py-2 fw-semibold fs-7 border-0"
                        style={{ backgroundColor: '#0b6640' }}
                        onClick={() => setCurrentFormStep(3)}
                      >
                        Tiếp tục →
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

                      {/* TẢI LÊN 2 MẶT CCCD LOẠI MỚI */}
                      <div className="card border mb-3 rounded-3 shadow-sm overflow-hidden" style={{ backgroundColor: '#fcfdfc' }}>
                        <div className="card-header text-white py-2 px-3 fw-bold d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ backgroundColor: '#0b6640' }}>
                          <span className="fs-7">🪪 Tải Lên Thẻ CCCD Loại Mới (2 Mặt)</span>
                          <button 
                            type="button" 
                            className="btn btn-sm rounded-pill px-2.5 py-0.5 text-decoration-none d-inline-flex align-items-center gap-1 border shadow-sm cursor-pointer"
                            style={{ backgroundColor: '#e0f7ff', color: '#0284c7', borderColor: '#b3f0ff', fontSize: '0.78rem', fontWeight: '500' }}
                            onClick={() => setHandbookModal({
                              title: 'Bản sao y công chứng CCCD của Chủ hộ, tất cả các thành viên trong gia đình',
                              label: '📖 Sổ tay CCCD',
                              url: '/files/(STHD)_CCCD_HộChiếu_GiấyKhaiSinh_NOXH.docx'
                            })}
                          >
                            📖 Sổ tay CCCD
                          </button>
                        </div>

                        <div className="card-body p-3">
                          
                          {/* BẢNG KẾT QUẢ TRÍCH XUẤT QR (NẾU CÓ) */}
                          {qrParsedData && (
                            <div className="mt-1 mb-3 pt-2 pb-2 border-top border-success border-opacity-25">
                              <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
                                <span className="badge bg-success text-white px-2.5 py-1 rounded-pill fw-semibold fs-8">
                                  ✅ Đã giải mã &amp; trích xuất dữ liệu thành công từ Mã QR CCCD
                                </span>
                                <span className="text-muted fs-8">Thời gian: {qrParsedData.scannedAt}</span>
                              </div>

                              <div className="row g-2 text-dark fs-8 bg-white p-2.5 rounded border">
                                <div className="col-12 col-sm-6 col-md-4">
                                  <span className="text-muted d-block fs-8">1. Số CCCD (12 số):</span>
                                  <strong className="text-success fs-7">{cccdNumber || qrParsedData.cccdNumber}</strong>
                                </div>
                                <div className="col-12 col-sm-6 col-md-4">
                                  <span className="text-muted d-block fs-8">2. Họ và tên:</span>
                                  <strong className="text-uppercase text-dark">{fullName || qrParsedData.fullName}</strong>
                                </div>
                                <div className="col-12 col-sm-6 col-md-4">
                                  <span className="text-muted d-block fs-8">3. Ngày sinh:</span>
                                  <strong>{dob || qrParsedData.dob}</strong>
                                </div>
                                <div className="col-12 col-sm-6 col-md-4">
                                  <span className="text-muted d-block fs-8">4. Giới tính:</span>
                                  <strong>{gender || qrParsedData.gender}</strong>
                                </div>
                                <div className="col-12 col-sm-6 col-md-4">
                                  <span className="text-muted d-block fs-8">5. Ngày cấp thẻ:</span>
                                  <strong>{issueDate || qrParsedData.issueDate}</strong>
                                </div>
                                <div className="col-12">
                                  <span className="text-muted d-block fs-8">6. Nơi đăng ký thường trú:</span>
                                  <strong>{address || qrParsedData.address}</strong>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* UPLOAD 2 MẶT CCCD LOẠI MỚI */}
                          <div className="row g-3">
                            
                            {/* MẶT TRƯỚC */}
                            <div className="col-12 col-md-6">
                              <div className="p-3 border rounded-3 bg-white h-100 shadow-sm d-flex flex-column justify-content-between">
                                <div>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="fw-bold text-dark mb-0 fs-7">🖼️ Mặt trước thẻ CCCD (Ảnh chân dung) <span className="text-danger">*</span></h6>
                                    {cccdFrontPreview ? (
                                      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-8">✓ Đã tải lên</span>
                                    ) : (
                                      <span className="badge bg-warning-subtle text-dark border border-warning-subtle px-2 py-0.5 fs-8">Chưa có</span>
                                    )}
                                  </div>
                                  <p className="text-muted fs-8 mb-2">Ảnh chụp rõ nét mặt trước (ảnh chân dung &amp; họ tên).</p>

                                  <div className="text-center my-2 p-2 border rounded bg-light" style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {cccdFrontPreview ? (
                                      <img src={cccdFrontPreview} alt="Mặt trước CCCD" className="img-fluid rounded" style={{ maxHeight: '110px', objectFit: 'contain' }} />
                                    ) : (
                                      <div className="text-muted py-2">
                                        <span className="fs-2 d-block mb-1">🪪</span>
                                        <span className="fs-8 fw-medium">Mặt trước thẻ CCCD (Chân dung)</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-2 text-center">
                                  <label className="btn btn-emerald btn-sm rounded-pill px-3 py-2 fw-bold fs-7 cursor-pointer mb-0 w-100 shadow-sm text-white d-flex align-items-center justify-content-center gap-1.5" style={{ backgroundColor: '#0b6640', borderColor: '#0b6640', color: '#ffffff' }}>
                                    <span>📷</span> {cccdFrontPreview ? 'Tải lại ảnh Mặt trước' : '+ Tải lên Mặt trước'}
                                    <input type="file" accept="image/*" className="d-none" onChange={handleCccdFrontChange} />
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* MẶT SAU (NƠI CHỨA MÃ QR & CHIP) */}
                            <div className="col-12 col-md-6">
                              <div className="p-3 border rounded-3 bg-white h-100 shadow-sm d-flex flex-column justify-content-between">
                                <div>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="fw-bold text-dark mb-0 fs-7">🖼️ Mặt sau thẻ CCCD (Nơi chứa Mã QR &amp; Chip) <span className="text-danger">*</span></h6>
                                    {cccdBackPreview ? (
                                      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-8">✓ Đã tải lên</span>
                                    ) : (
                                      <span className="badge bg-warning-subtle text-dark border border-warning-subtle px-2 py-0.5 fs-8">Chưa có</span>
                                    )}
                                  </div>
                                  <p className="text-muted fs-8 mb-2">Ảnh chụp mặt sau (Hệ thống tự động quét mã QR ở mặt sau).</p>

                                  <div className="text-center my-2 p-2 border rounded bg-light" style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {cccdBackPreview ? (
                                      <img src={cccdBackPreview} alt="Mặt sau CCCD" className="img-fluid rounded" style={{ maxHeight: '110px', objectFit: 'contain' }} />
                                    ) : (
                                      <div className="text-muted py-2">
                                        <span className="fs-2 d-block mb-1">💳</span>
                                        <span className="fs-8 fw-medium">Mặt sau thẻ CCCD (Mã QR &amp; Chip)</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-2 text-center">
                                  <label className="btn btn-emerald btn-sm rounded-pill px-3 py-2 fw-bold fs-7 cursor-pointer mb-0 w-100 shadow-sm text-white d-flex align-items-center justify-content-center gap-1.5" style={{ backgroundColor: '#0b6640', borderColor: '#0b6640', color: '#ffffff' }}>
                                    <span>📷</span> {cccdBackPreview ? 'Tải lại ảnh Mặt sau' : '+ Tải lên Mặt sau (Quét QR)'}
                                    <input type="file" accept="image/*" className="d-none" onChange={handleCccdBackChange} />
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* BẢNG ĐIỀN CÁC TRƯỜNG THÔNG TIN KÊ KHAI CÁ NHÂN (CHỈ HIỂN THỊ KHI UP ĐỦ 2 MẶT CCCD) */}
                          {((cccdFrontPreview || cccdFrontFile) && (cccdBackPreview || cccdBackFile)) ? (
                            <div className="mt-3 pt-3 border-top">
                              <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
                                <h6 className="fw-bold text-dark mb-0 fs-7">📝 Thông Tin Cá Nhân Đăng Ký (Đã mở khóa từ 2 mặt CCCD &amp; QR)</h6>
                                <span className="badge bg-success text-white px-2 py-0.5 fs-8">✓ Đã đủ 2 mặt CCCD</span>
                              </div>

                              <div className="row g-2">
                                <div className="col-12 col-sm-6 col-md-4">
                                  <label className="form-label fs-8 fw-semibold mb-1">Số CCCD (12 số) <span className="text-danger">*</span></label>
                                  <input type="text" className="form-control form-control-sm bg-light" value={cccdNumber || qrParsedData?.cccdNumber || ''} readOnly disabled title="Thông tin tự động lấy từ Căn cước công dân" required />
                                </div>
                                <div className="col-12 col-sm-6 col-md-4">
                                  <label className="form-label fs-8 fw-semibold mb-1">Họ và tên <span className="text-danger">*</span></label>
                                  <input type="text" className="form-control form-control-sm bg-light fw-bold text-uppercase" value={fullName || qrParsedData?.fullName || session?.fullName || ''} readOnly disabled title="Họ tên tự động lấy từ Căn cước công dân" required />
                                </div>
                                <div className="col-12 col-sm-6 col-md-4">
                                  <label className="form-label fs-8 fw-semibold mb-1">Ngày sinh (DD/MM/YYYY)</label>
                                  <input type="text" className="form-control form-control-sm bg-light" value={dob || qrParsedData?.dob || ''} readOnly disabled title="Ngày sinh tự động lấy từ Căn cước công dân" />
                                </div>
                                <div className="col-12 col-sm-6 col-md-4">
                                  <label className="form-label fs-8 fw-semibold mb-1">Giới tính</label>
                                  <input type="text" className="form-control form-control-sm bg-light" value={gender || qrParsedData?.gender || 'Nam'} readOnly disabled title="Giới tính tự động lấy từ Căn cước công dân" />
                                </div>
                                <div className="col-12 col-sm-6 col-md-4">
                                  <label className="form-label fs-8 fw-semibold mb-1">Ngày cấp thẻ</label>
                                  <input type="text" className="form-control form-control-sm bg-light" value={issueDate || qrParsedData?.issueDate || ''} readOnly disabled title="Ngày cấp tự động lấy từ Căn cước công dân" />
                                </div>
                                <div className="col-12 col-sm-6 col-md-4">
                                  <label className="form-label fs-8 fw-semibold mb-1">Email (Lấy từ tài khoản)</label>
                                  <input type="email" className="form-control form-control-sm bg-light" value={email || session?.email || ''} readOnly disabled title="Email tự động lấy từ thông tin tài khoản đăng ký" />
                                </div>
                                <div className="col-12">
                                  <label className="form-label fs-8 fw-semibold mb-1">Địa chỉ đăng ký thường trú</label>
                                  <input type="text" className="form-control form-control-sm bg-light" value={address || qrParsedData?.address || ''} readOnly disabled title="Địa chỉ tự động lấy từ Căn cước công dân" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 pt-3 border-top">
                              <div className="alert alert-warning mb-0 border border-warning shadow-sm rounded-3">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fs-5">📌</span>
                                  <div>
                                    <strong className="text-dark fs-7 d-block">Yêu cầu nộp đủ 2 mặt thẻ CCCD (Mặt Trước &amp; Mặt Sau):</strong>
                                    <span className="text-muted fs-8">Vui lòng tải lên cả 2 mặt thẻ CCCD của bạn để mở khóa và xem dữ liệu thông tin cá nhân đăng ký (bao gồm Email lấy từ tài khoản đăng ký).</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

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
                                      <div className="d-flex gap-1.5 flex-wrap mt-1">
                                        {doc.handbooks?.map((hb, idx) => (
                                          <button 
                                            type="button"
                                            key={idx}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              setHandbookModal({
                                                title: doc.title,
                                                label: hb.label,
                                                url: hb.url,
                                                docxUrl: hb.docxUrl
                                              });
                                            }} 
                                            className="btn btn-sm rounded-pill px-2.5 py-0.5 text-decoration-none d-inline-flex align-items-center gap-1 border shadow-sm cursor-pointer"
                                            style={{ backgroundColor: '#e0f7ff', color: '#0284c7', borderColor: '#b3f0ff', fontSize: '0.78rem', fontWeight: '500' }}
                                          >
                                            {hb.label}
                                          </button>
                                        ))}
                                        {doc.templates?.map((tmpl, idx) => (
                                          <a 
                                            key={idx}
                                            href={tmpl.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            download
                                            className="btn btn-sm rounded-pill px-2.5 py-0.5 text-decoration-none d-inline-flex align-items-center gap-1 border shadow-sm cursor-pointer"
                                            style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0', fontSize: '0.78rem', fontWeight: '500' }}
                                          >
                                            {tmpl.label}
                                          </a>
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
                                      <label className="btn btn-emerald btn-sm rounded-pill px-3 py-1 fs-8 fw-bold cursor-pointer mb-0 text-white" style={{ backgroundColor: '#0b6640', borderColor: '#0b6640', color: '#ffffff' }}>
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
                      <div className="p-3.5 mb-3 rounded-3 border bg-light-subtle" style={{ backgroundColor: '#f8fafc' }}>
                        <div className="fw-bold text-dark fs-7 mb-2.5">📋 VUI LÒNG TÍCH CHỌN ĐỒNG Ý BẮT BUỘC ĐỂ NỘP HỒ SƠ:</div>
                        
                        <div className="form-check mb-3">
                          <input 
                            className="form-check-input mt-1 cursor-pointer" 
                            type="checkbox" 
                            id="term1" 
                            checked={agreedTerms1}
                            onChange={(e) => setAgreedTerms1(e.target.checked)}
                          />
                          <label className="form-check-label text-dark cursor-pointer lh-base" htmlFor="term1" style={{ fontSize: '0.85rem' }}>
                            Tôi xác nhận đã đọc, hiểu rõ và tự nguyện đồng ý để Công Ty thực hiện toàn bộ các hoạt động xử lý Dữ Liệu Cá Nhân đối với các Dữ Liệu Cá Nhân mà Tôi đã cung cấp, đang cung cấp hoặc sẽ cung cấp cho Công Ty, nhằm mục đích thực hiện các công việc, thủ tục có liên quan, phù hợp với Chính Sách Bảo Vệ Dữ Liệu Cá Nhân do Công Ty ban hành và được đăng tải công khai tại{' '}
                            <a href="https://bimgroup.com/bvdlcn" target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none fw-medium" style={{ color: '#2563eb' }}>
                              https://bimgroup.com/bvdlcn
                            </a>
                            , cũng như các sửa đổi, bổ sung của Chính Sách này tại từng thời điểm (nếu có).
                          </label>
                        </div>

                        <div className="form-check mb-3">
                          <input 
                            className="form-check-input mt-1 cursor-pointer" 
                            type="checkbox" 
                            id="term2"
                            checked={agreedTerms2}
                            onChange={(e) => setAgreedTerms2(e.target.checked)}
                          />
                          <label className="form-check-label text-dark cursor-pointer lh-base" htmlFor="term2" style={{ fontSize: '0.85rem' }}>
                            Tôi tự xác định rằng Tôi thuộc đối tượng mua Nhà Ở Xã Hội như đã kê khai và xin chịu trách nhiệm trước pháp luật về tính chính xác của các thông tin đã cung cấp.
                          </label>
                        </div>

                        {(!agreedTerms1 || !agreedTerms2) && (
                          <div className="p-2.5 rounded bg-warning bg-opacity-10 border border-warning text-dark fs-8 mt-2">
                            ⚠️ <strong>Chú ý:</strong> Quý khách cần tích chọn đầy đủ 2 ô cam kết phía trên để kích hoạt nút Nộp hồ sơ.
                          </div>
                        )}
                      </div>

                      {/* FOOTER ACTIONS - 2 EQUAL WIDTH BALANCED BUTTONS */}
                      <div className="d-flex justify-content-between align-items-center gap-3 pt-3 mt-4 border-top">
                        <button 
                          type="button" 
                          className="btn bg-white rounded-pill px-4 py-2.5 fw-semibold fs-7 border flex-fill text-nowrap"
                          style={{ borderColor: '#0b6640', color: '#0b6640' }}
                          onClick={() => setCurrentFormStep(2)}
                        >
                          ← Quay lại Bước 2
                        </button>

                        <button 
                          type="submit" 
                          className="btn text-white rounded-pill px-4 py-2.5 fw-bold fs-7 border-0 flex-fill text-nowrap shadow-sm"
                          disabled={isLoading || !agreedTerms1 || !agreedTerms2}
                          style={{ 
                            backgroundColor: (agreedTerms1 && agreedTerms2) ? '#0b6640' : '#6c757d', 
                            borderColor: (agreedTerms1 && agreedTerms2) ? '#0b6640' : '#6c757d',
                            opacity: (agreedTerms1 && agreedTerms2) ? 1 : 0.6,
                            cursor: (agreedTerms1 && agreedTerms2) ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {isLoading ? 'Đang gửi...' : 'Nộp hồ sơ trực tuyến'}
                        </button>
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

                {/* STEP 5: ĐỐI CHỨNG BẢN CỨNG & ĐẶT LỊCH HẸN KÈM SỐ THỨ TỰ (STT) */}
                {currentFormStep === 5 && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                      <h6 className="fw-bold mb-0 text-success fs-6" style={{ color: '#0b6640' }}>
                        Bước 5/6 — Đặt Lịch Hẹn Nộp Bản Gốc &amp; Cấp Số Thứ Tự (STT)
                      </h6>
                      <span className="badge bg-primary px-2.5 py-1 rounded-pill fs-8">Hạn nộp: 3-5 ngày</span>
                    </div>

                    <div className="alert alert-info border-0 shadow-sm mb-3 rounded-3 fs-7 p-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fs-4">🏛️</span>
                        <div>
                          <strong>Quy định nộp bản gốc (Hạn 3-5 ngày sau khi duyệt bản số):</strong>
                          <div className="fs-8 mt-0.5">Sau khi hồ sơ số được Tổ kiểm soát chấp thuận, người dân cần chọn khung giờ bên dưới để hẹn làm việc và nhận <strong>Số thứ tự (STT)</strong> tự động.</div>
                        </div>
                      </div>
                    </div>

                    {/* PRINTABLE STT TICKET CARD */}
                    {(generatedTicket || appointmentConfirmed) && (
                      <div className="card border-2 border-success rounded-3 p-3 mb-3 bg-success bg-opacity-10 shadow-sm">
                        <div className="text-center pb-2 border-bottom border-success">
                          <span className="badge bg-success text-white px-3 py-1 rounded-pill fw-bold fs-7 mb-1">
                            ✓ ĐÃ CẤP PHIẾU HẸN VÀ SỐ THỨ TỰ (STT)
                          </span>
                          <h2 className="fw-black text-emerald display-6 mb-0" style={{ color: '#0b6640', letterSpacing: '1px' }}>
                            {generatedTicket?.sttNumber || 'STT-042'}
                          </h2>
                          <div className="fs-8 text-secondary mt-1">Mã xác thực VNeID / eKYC</div>
                        </div>

                        <div className="row g-3 align-items-center py-3 border-bottom border-success fs-7">
                          <div className="col-12 col-md-8">
                            <div className="space-y-1">
                              <div>📅 <strong>Ngày hẹn:</strong> {generatedTicket?.date || appointmentDate}</div>
                              <div>⏰ <strong>Khung giờ:</strong> {generatedTicket?.timeSlot || appointmentTime}</div>
                              <div>📍 <strong>Địa điểm:</strong> {generatedTicket?.counter || 'Bàn tiếp nhận số 02 - Dự án CT3-CT4 Kim Chung Handico'}</div>
                              <div>👤 <strong>Người đăng ký:</strong> {fullName || session?.fullName} (CCCD: {cccdNumber})</div>
                            </div>
                          </div>
                          <div className="col-12 col-md-4 text-center">
                            <img 
                              src={generatedTicket?.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=STT-042`} 
                              alt="Mã QR STT" 
                              className="img-thumbnail rounded shadow-sm"
                              style={{ width: '110px', height: '110px' }} 
                            />
                            <div className="fs-8 text-muted mt-1">Quét mã QR khi đến bàn làm việc</div>
                          </div>
                        </div>

                        <div className="pt-2 text-center">
                          <button 
                            type="button" 
                            className="btn btn-emerald btn-sm rounded-pill px-4 py-1.5 fw-bold shadow-sm"
                            style={{ backgroundColor: '#0b6640', borderColor: '#0b6640' }}
                            onClick={() => window.print()}
                          >
                            🖨️ In Phiếu Hẹn &amp; Tải Xuống
                          </button>
                        </div>
                      </div>
                    )}

                    {/* BOOKING FORM */}
                    <div className="p-3 mb-3 rounded-3 border bg-white shadow-sm">
                      <h6 className="fw-bold text-dark mb-2 fs-7">📅 Đặt Lịch Hẹn Nộp Hồ Sơ Gốc:</h6>

                      <div className="row g-2 mb-3">
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-bold fs-8 text-dark">Chọn ngày hẹn (Trong 3 - 5 ngày tới):</label>
                          <input 
                            type="date" 
                            className="form-control form-control-sm"
                            value={appointmentDate}
                            onChange={(e) => setAppointmentDate(e.target.value)}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-bold fs-8 text-dark">Chọn khung giờ làm việc:</label>
                          <select 
                            className="form-select form-select-sm"
                            value={appointmentTime}
                            onChange={(e) => setAppointmentTime(e.target.value)}
                          >
                            <option value="08:30 - 09:30">Ca sáng: 08:30 - 09:30 (Còn 5 chỗ)</option>
                            <option value="09:30 - 10:30">Ca sáng: 09:30 - 10:30 (Còn 3 chỗ)</option>
                            <option value="10:30 - 11:30">Ca sáng: 10:30 - 11:30 (Còn 8 chỗ)</option>
                            <option value="14:00 - 15:00">Ca chiều: 14:00 - 15:00 (Còn 4 chỗ)</option>
                            <option value="15:00 - 16:00">Ca chiều: 15:00 - 16:00 (Còn 6 chỗ)</option>
                            <option value="16:00 - 17:00">Ca chiều: 16:00 - 17:00 (Còn 2 chỗ)</option>
                          </select>
                        </div>
                      </div>

                      <div className="text-end">
                        <button 
                          type="button" 
                          className="btn btn-emerald rounded-pill px-4 py-2 fw-bold fs-7 shadow-sm"
                          style={{ backgroundColor: '#0b6640', borderColor: '#0b6640' }}
                          onClick={handleConfirmAppointment}
                        >
                          🎟️ Lấy Số Thứ Tự &amp; Xác Nhận Lịch Hẹn
                        </button>
                      </div>
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

      {/* VIRTUAL WAITING ROOM QUEUE MODAL (1.000+ USER HIGH CONCURRENCY GUARD) */}
      {isQueuing && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '460px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg p-3 text-center">
              <div className="modal-body py-4">
                <div className="d-inline-flex justify-content-center align-items-center rounded-circle bg-success bg-opacity-10 p-3 mb-3 text-success">
                  <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>

                <h5 className="fw-bold text-dark mb-1">⏳ PHÒNG CHỜ XỦ LÝ HÀNG CHỜ CẤP SỐ</h5>
                <span className="badge bg-warning text-dark px-3 py-1 rounded-pill fw-bold fs-8 mb-3">
                  Tải cao đột biến: 1.000+ truy cập cùng lúc
                </span>

                <div className="p-3 mb-3 bg-light rounded-3 border text-start fs-7">
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Tác vụ đang xử lý:</span>
                    <strong className="text-dark">{queueTaskType}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Vị trí của bạn trong hàng chờ:</span>
                    <strong className="text-danger fs-6">#{queuePos} / {queueTotal}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Thời gian xử lý dự kiến:</span>
                    <strong className="text-success">~2 giây (Tự động chuyển tiếp)</strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress mb-2" style={{ height: '10px', borderRadius: '5px' }}>
                  <div 
                    className="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                    role="progressbar" 
                    style={{ width: '85%' }}
                  ></div>
                </div>
                <div className="fs-8 text-muted">Vui lòng không tắt hoặc tải lại trang. Hệ thống đang giữ vị trí của bạn...</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (DISPLAYED ON MOBILE DEVICES < 768px) */}
      <div className="mobile-bottom-nav d-md-none">
        <button 
          type="button"
          className={`mobile-bottom-nav-item ${viewMode === 'view' ? 'active' : ''}`}
          onClick={() => setViewMode('view')}
        >
          <span className="mobile-bottom-nav-icon">🏠</span>
          <span>Tổng quan</span>
        </button>

        <button 
          type="button"
          className={`mobile-bottom-nav-item ${viewMode === 'edit' && currentFormStep <= 3 ? 'active' : ''}`}
          onClick={() => { setViewMode('edit'); if (currentFormStep > 3) setCurrentFormStep(1); }}
        >
          <span className="mobile-bottom-nav-icon">✏️</span>
          <span>Kê khai</span>
        </button>

        <button 
          type="button"
          className="mobile-bottom-nav-item"
          onClick={handleStartEkyc}
        >
          <span className="mobile-bottom-nav-icon">🪪</span>
          <span>Quét eKYC</span>
        </button>

        <button 
          type="button"
          className={`mobile-bottom-nav-item ${viewMode === 'edit' && currentFormStep === 5 ? 'active' : ''}`}
          onClick={() => { setViewMode('edit'); setCurrentFormStep(5); }}
        >
          <span className="mobile-bottom-nav-icon">🎟️</span>
          <span>Lấy STT</span>
        </button>
      </div>

      {/* HANDBOOK PREVIEW MODAL MATCHING MARINALIVING.VN (DOCX-PREVIEW ENGINE) */}
      {handbookModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1060 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '1000px', width: '95%' }}>
            <div className="modal-content border-0 shadow-lg rounded-3 overflow-hidden" style={{ height: '90vh' }}>
              
              {/* Header */}
              <div className="modal-header bg-white py-2.5 px-3.5 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2 text-dark me-2" style={{ minWidth: 0 }}>
                  <span className="badge p-1.5 rounded-1 fs-6 text-white" style={{ backgroundColor: '#0284c7' }}>📘</span>
                  <div>
                    <h6 className="modal-title fw-bold text-dark text-truncate mb-0" style={{ fontSize: '0.95rem' }} title={handbookModal.title}>
                      {handbookModal.label || handbookModal.title}
                    </h6>
                    <span className="text-muted fs-8">Sổ tay hướng dẫn kê khai hồ sơ NOXH chính thức</span>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <a 
                    href={handbookModal.url} 
                    download
                    className="btn btn-sm btn-primary rounded-pill px-3 py-1.5 fw-semibold fs-8 d-inline-flex align-items-center gap-1 shadow-sm"
                  >
                    📥 Tải file Word mẫu (.docx)
                  </a>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setHandbookModal(null)} 
                    aria-label="Close"
                  ></button>
                </div>
              </div>

              {/* Body (Exact docx-preview engine used by marinaliving.vn) */}
              <div className="modal-body p-0 bg-body-secondary position-relative" style={{ height: 'calc(90vh - 110px)', overflowY: 'auto' }}>
                {isDocLoading && (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-center bg-white position-absolute top-0 start-0 w-100 h-100" style={{ zIndex: 10 }}>
                    <div className="spinner-border text-success mb-3" style={{ width: '3rem', height: '3rem' }} role="status"></div>
                    <h6 className="fw-bold text-dark mb-1">⏳ Đang tải nội dung sổ tay hướng dẫn...</h6>
                    <span className="text-muted fs-8">Sử dụng bộ render docx-preview chuẩn marinaliving.vn</span>
                  </div>
                )}

                <div 
                  ref={docxContainerRef} 
                  className="docx-preview-host p-2 p-md-3" 
                  style={{ minHeight: '100%' }}
                />
              </div>

              {/* Footer */}
              <div className="modal-footer bg-white py-2 px-3.5 border-top d-flex justify-content-between align-items-center">
                <a 
                  href={handbookModal.url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="btn btn-sm btn-outline-secondary rounded-2 px-3 py-1 fs-8"
                >
                  📥 Mở / Tải bản gốc
                </a>

                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm rounded-2 px-4 py-1.5 fw-semibold fs-8"
                  style={{ backgroundColor: '#6c757d' }}
                  onClick={() => setHandbookModal(null)}
                >
                  Đóng
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

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

      {/* PERSONAL REJECTION NOTIFICATION POPUP MODAL */}
      {rejectionNotificationModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1080 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden animate-scale-up">
              
              {/* Modal Header */}
              <div className={`modal-header py-3 px-4 text-white d-flex align-items-center justify-content-between ${
                rejectionNotificationModal.status === 'rejected_wrong_k' ? 'bg-danger' :
                rejectionNotificationModal.status === 'returned_for_supplement' ? 'bg-warning text-dark' : 'bg-danger'
              }`}>
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-4">
                    {rejectionNotificationModal.status === 'rejected_wrong_k' ? '❌' : '⚠️'}
                  </span>
                  <div>
                    <span className={`badge rounded-pill fs-8 ${rejectionNotificationModal.status === 'returned_for_supplement' ? 'bg-dark text-white' : 'bg-white text-danger fw-bold'}`}>
                      THÔNG BÁO TỪ BAN QUẢN LÝ
                    </span>
                    <h6 className="modal-title fw-bold mb-0 text-truncate" style={{ maxWidth: '380px' }}>
                      {rejectionNotificationModal.status === 'rejected_wrong_k'
                        ? 'HỒ SƠ BỊ TỪ CHỐI DO SAI NHÓM K'
                        : 'YÊU CẦU BỔ SUNG TÀI LIỆU HỒ SƠ'}
                    </h6>
                  </div>
                </div>
                <button 
                  type="button" 
                  className={`btn-close ${rejectionNotificationModal.status === 'returned_for_supplement' ? '' : 'btn-close-white'}`}
                  onClick={() => setRejectionNotificationModal(null)}
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4 bg-light">
                <div className="p-3 bg-white rounded-3 border mb-3 shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold text-dark fs-7">👤 Khách hàng: {rejectionNotificationModal.fullName}</span>
                    <span className="badge bg-secondary text-white fs-8">Mã HS: #{rejectionNotificationModal.id}</span>
                  </div>
                  <div className="text-muted fs-8">
                    🪪 Số CCCD: <strong>{rejectionNotificationModal.cccdNumber || rejectionNotificationModal.phoneNumber}</strong> | Nhóm đối tượng: <strong>{rejectionNotificationModal.targetObject || 'K1'}</strong>
                  </div>
                </div>

                <div className={`p-3 rounded-3 mb-3 border ${
                  rejectionNotificationModal.status === 'rejected_wrong_k' 
                    ? 'bg-danger bg-opacity-10 border-danger text-danger-emphasis' 
                    : 'bg-warning bg-opacity-10 border-warning text-warning-emphasis'
                }`}>
                  <h6 className="fw-bold mb-1 fs-7">💬 Chi tiết nội dung phản hồi từ Hội đồng thẩm định:</h6>
                  <p className="mb-0 fs-8 text-dark fw-semibold">
                    {rejectionNotificationModal.notes || 'Hồ sơ cần cập nhật thông tin theo yêu cầu.'}
                  </p>
                </div>

                {rejectionNotificationModal.status === 'rejected_wrong_k' && (
                  <div className="p-2.5 bg-white rounded border text-muted fs-8 mb-2">
                    📌 <strong>Hướng dẫn:</strong> Do bạn đăng ký nhầm nhóm K, hồ sơ này bị từ chối. Bạn vui lòng bấm nút dưới đây để khai lại nhóm K chính xác và nộp lại hồ sơ từ đầu.
                  </div>
                )}

                {rejectionNotificationModal.status === 'returned_for_supplement' && (
                  <div className="p-2.5 bg-white rounded border text-muted fs-8 mb-2">
                    📌 <strong>Hướng dẫn:</strong> Vui lòng chuẩn bị và tải lên đầy đủ tệp Giấy xác nhận chưa có nhà ở (Mẫu số 02) có dấu xác nhận của UBND xã/phường để hoàn tất hồ sơ.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer bg-white py-2.5 px-4 border-top d-flex justify-content-between align-items-center">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm rounded-pill px-3 fs-8"
                  onClick={() => setRejectionNotificationModal(null)}
                >
                  Đóng Thông Báo
                </button>

                {rejectionNotificationModal.status === 'rejected_wrong_k' ? (
                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm rounded-pill px-4 fw-bold fs-8 shadow-sm"
                    onClick={() => {
                      setRejectionNotificationModal(null);
                      setViewMode('edit');
                      setCurrentFormStep(1);
                    }}
                  >
                    🔄 Nộp Lại Hồ Sơ Từ Đầu (Chọn lại nhóm K)
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-warning text-dark btn-sm rounded-pill px-4 fw-bold fs-8 shadow-sm"
                    onClick={() => {
                      setRejectionNotificationModal(null);
                      setViewMode('edit');
                      setCurrentFormStep(4);
                    }}
                  >
                    📤 Tải Lên Bổ Sung Tài Liệu Ngay
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION CENTER & ADMIN NOTES MODAL (TRIGGERED BY CLICKING '📁 Hồ sơ [Badge]') */}
      {showNotificationModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1080 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '720px', width: '95%' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              
              {/* Modal Header */}
              <div className="modal-header py-3 px-4 text-white d-flex align-items-center justify-content-between" style={{ backgroundColor: '#0b6640' }}>
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-4">🔔</span>
                  <div>
                    <h6 className="modal-title fw-bold mb-0 text-white">
                      TRUNG TÂM THÔNG BÁO &amp; GHI CHÚ TỪ CÁN BỘ / ADMIN
                    </h6>
                    <span className="text-light fs-8 opacity-75">
                      Danh sách phản hồi &amp; hướng dẫn trực tiếp từ Ban quản lý dự án
                    </span>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowNotificationModal(false)}
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4 bg-light" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                {apps.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <span className="fs-1 d-block mb-2">📭</span>
                    Hiện tại bạn chưa có thông báo nào từ Ban quản lý.
                  </div>
                ) : (
                  apps.map((app, idx) => {
                    const statusBadgeClass = 
                      app.status === 'approved' ? 'bg-success text-white' :
                      app.status === 'rejected_wrong_k' ? 'bg-danger text-white' :
                      app.status === 'returned_for_supplement' ? 'bg-warning text-dark' :
                      app.status === 'to_kiem_soat' ? 'bg-purple text-white' : 'bg-secondary text-white';

                    const statusTitle =
                      app.status === 'approved' ? '🟢 ĐÃ DUYỆT HỒ SƠ & VÀO DANH SÁCH BỐC THĂM' :
                      app.status === 'rejected_wrong_k' ? '🔴 TỪ CHỐI DO CHỌN SAI NHÓM K' :
                      app.status === 'returned_for_supplement' ? '🟡 TRẢ VỀ YÊU CẦU BỔ SUNG MẪU 02' :
                      app.status === 'to_kiem_soat' ? '🟣 ĐANG KIỂM SOÁT THẨM ĐỊNH DỮ LIỆU BHXH' :
                      app.status === 'bo_sung_ban_goc' ? '🟠 HẸN MANG BẢN GỐC ĐỐI CHỨNG' : '🔵 ĐÃ TIẾP NHẬN HỒ SƠ';

                    const roleAuthor =
                      app.status === 'rejected_wrong_k' ? 'Tổ Tiếp Nhận & Thẩm Định Hồ Sơ' :
                      app.status === 'returned_for_supplement' ? 'Tổ Tiếp Nhận Hồ Sơ' :
                      app.status === 'to_kiem_soat' ? 'Tổ Kiểm Soát Thẩm Định' :
                      app.status === 'approved' ? 'Hội Đồng Bốc Thăm Chính Thức' : 'Ban Quản Lý Dự Án (Admin)';

                    return (
                      <div key={app.id || idx} className="card border-0 shadow-sm rounded-3 mb-3 overflow-hidden bg-white">
                        <div className="card-header bg-white border-bottom py-2.5 px-3.5 d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className={`badge rounded-pill fs-8 ${statusBadgeClass}`}>
                              {statusTitle}
                            </span>
                            <span className="fw-bold text-dark fs-8">Hồ sơ #{app.id}</span>
                          </div>
                          <span className="text-muted fs-8">
                            📅 {app.updatedAt ? new Date(app.updatedAt).toLocaleString('vi-VN') : 'Mới cập nhật'}
                          </span>
                        </div>

                        <div className="card-body p-3.5">
                          <div className="d-flex align-items-center gap-1.5 mb-2">
                            <span className="badge bg-secondary bg-opacity-10 text-dark border fs-8">
                              ✍️ Người ghi chú: <strong>{roleAuthor}</strong>
                            </span>
                          </div>

                          <div className="p-3 rounded-3 bg-light border border-secondary border-opacity-25 mb-3">
                            <div className="fw-semibold text-dark fs-8 mb-1">💬 Chi tiết nội dung phản hồi / Ghi chú:</div>
                            <div className="text-secondary fs-8">
                              {app.notes || 'Hồ sơ đã được tiếp nhận và chuyển đến bộ phận thẩm định.'}
                            </div>
                          </div>

                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div className="text-muted fs-8">
                              Công dân: <strong>{app.fullName}</strong> ({app.cccdNumber || app.phoneNumber})
                            </div>

                            <div className="d-flex align-items-center gap-2">
                              {app.status === 'rejected_wrong_k' && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm rounded-pill px-3 fs-8 fw-bold"
                                  onClick={() => {
                                    setShowNotificationModal(false);
                                    setViewMode('edit');
                                    setCurrentFormStep(1);
                                  }}
                                >
                                  🔄 Nộp lại từ đầu (Chọn lại K)
                                </button>
                              )}

                              {app.status === 'returned_for_supplement' && (
                                <button
                                  type="button"
                                  className="btn btn-warning text-dark btn-sm rounded-pill px-3 fs-8 fw-bold"
                                  onClick={() => {
                                    setShowNotificationModal(false);
                                    setViewMode('edit');
                                    setCurrentFormStep(4);
                                  }}
                                >
                                  📤 Tải lên bổ sung Mẫu 02
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm rounded-pill px-3 fs-8 fw-semibold"
                                onClick={() => {
                                  setShowNotificationModal(false);
                                  setActiveApp(app);
                                  setViewMode('view');
                                }}
                              >
                                👁️ Xem chi tiết hồ sơ
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer bg-white py-2.5 px-4 border-top d-flex justify-content-between align-items-center">
                <span className="text-muted fs-8">
                  Tổng cộng: <strong>{apps.length}</strong> thông báo / ghi chú phản hồi
                </span>
                <button 
                  type="button" 
                  className="btn btn-emerald btn-sm text-white rounded-pill px-4 fs-8 fw-bold"
                  style={{ backgroundColor: '#0b6640' }}
                  onClick={() => setShowNotificationModal(false)}
                >
                  Đã Đọc &amp; Đóng
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
