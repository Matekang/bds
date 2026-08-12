import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Tạo thư mục uploads nếu chưa tồn tại (an toàn trên Vercel)
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {}

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const db = getDb();
    
    // Nếu là admin, trả về toàn bộ hồ sơ
    if (session.role === 'admin') {
      return NextResponse.json({ success: true, applications: db.applications });
    }

    // Nếu là user thường, chỉ trả về hồ sơ của họ
    const userApps = db.applications.filter(a => a.userId === session.userId);
    return NextResponse.json({ success: true, applications: userApps });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống.' });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const formData = await request.formData();
    const appId = formData.get('appId');
    const resetApp = formData.get('resetApp') === 'true';
    const fullName = formData.get('fullName') || session.fullName;
    const email = formData.get('email') || '';
    const cccdNumber = formData.get('cccdNumber') || '';
    const targetObject = formData.get('targetObject') || 'K1';
    const targetObjectDetail = formData.get('targetObjectDetail') || '';
    const agreedTerms1 = formData.get('agreedTerms1') === 'true';
    const agreedTerms2 = formData.get('agreedTerms2') === 'true';
    const ekycStatus = formData.get('ekycStatus') || 'unverified';
    const ekycDataRaw = formData.get('ekycData');
    const appointmentTicketRaw = formData.get('appointmentTicket');

    let ekycData = null;
    if (ekycDataRaw) {
      try { ekycData = JSON.parse(ekycDataRaw); } catch (e) {}
    }

    let appointmentTicket = null;
    if (appointmentTicketRaw) {
      try { 
        appointmentTicket = JSON.parse(appointmentTicketRaw); 
        const db = getDb();
        if (!db.queueCounter) db.queueCounter = 1000;
        db.queueCounter += 1;
        const atomicStt = `STT-${String(db.queueCounter).padStart(4, '0')}`;
        appointmentTicket.sttNumber = atomicStt;
        appointmentTicket.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${atomicStt}`;
      } catch (e) {}
    }

    const db = getDb();
    let existingApp = appId ? db.applications.find(a => a.id === appId && a.userId === session.userId) : null;
    
    if (!existingApp) {
      existingApp = db.applications.find(a => a.userId === session.userId);
    }

    // Nếu người dân bấm Nộp lại từ đầu (sau khi bị từ chối do chọn sai K)
    if (resetApp && existingApp) {
      existingApp.status = 'submitted';
      existingApp.stage = 1;
      existingApp.targetObject = targetObject;
      existingApp.targetObjectDetail = targetObjectDetail;
      existingApp.notes = 'Người dân đã chọn lại nhóm đối tượng K và nộp lại hồ sơ.';
      existingApp.updatedAt = new Date().toISOString();
      saveDb(db);
      return NextResponse.json({ success: true, message: 'Đã tạo lại hồ sơ thành công!', application: existingApp });
    }

    const docs = existingApp?.documents || {
      doc1: null, doc2: null, doc3: null, doc4: null, doc5: null, doc6: null, doc7: null, doc8: null, doc9: null
    };

    // Helper lưu file an toàn (hỗ trợ môi trường đĩa Read-Only như Vercel)
    const saveFileSafely = async (file, prefix) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || (file.type?.includes('image') ? '.jpg' : '.pdf');
      const filename = `${prefix}-${session.userId}-${Date.now()}${ext}`;
      
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);
        return `/uploads/${filename}`;
      } catch (err) {
        console.warn('Cannot write to disk (Vercel read-only filesystem), fallback to Data URL:', err.message);
        const mimeType = file.type || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg');
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    };

    // Xử lý tệp CCCD mặt trước & mặt sau
    let cccdImage = existingApp?.cccdImage || null;
    let cccdFrontImage = existingApp?.cccdFrontImage || existingApp?.cccdImage || null;
    let cccdBackImage = existingApp?.cccdBackImage || null;

    const cccdFrontFile = formData.get('cccdFrontFile') || formData.get('cccdFile');
    if (cccdFrontFile && cccdFrontFile instanceof File && cccdFrontFile.size > 0) {
      cccdFrontImage = await saveFileSafely(cccdFrontFile, 'cccd-front');
      cccdImage = cccdFrontImage;
    }

    const cccdBackFile = formData.get('cccdBackFile');
    if (cccdBackFile && cccdBackFile instanceof File && cccdBackFile.size > 0) {
      cccdBackImage = await saveFileSafely(cccdBackFile, 'cccd-back');
    }

    // Xử lý các trường trích xuất từ QR CCCD
    const dob = formData.get('dob') || existingApp?.dob || '';
    const gender = formData.get('gender') || existingApp?.gender || '';
    const address = formData.get('address') || existingApp?.address || '';
    const issueDate = formData.get('issueDate') || existingApp?.issueDate || '';
    const oldCmnd = formData.get('oldCmnd') || existingApp?.oldCmnd || '';
    const qrDataRaw = formData.get('qrParsedData');
    let qrParsedData = existingApp?.qrParsedData || null;
    if (qrDataRaw) {
      try { qrParsedData = JSON.parse(qrDataRaw); } catch (e) {}
    }

    // Xử lý 9 loại tài liệu (doc1 -> doc9)
    for (let i = 1; i <= 9; i++) {
      const docKey = `doc${i}`;
      const file = formData.get(docKey);
      if (file && file instanceof File && file.size > 0) {
        const fileUrl = await saveFileSafely(file, docKey);
        docs[docKey] = {
          name: file.name,
          url: fileUrl,
          uploadedAt: new Date().toISOString()
        };
      }
    }

    // Tính % hoàn thành dựa trên số tài liệu bắt buộc (doc1, doc2, doc3, doc4, doc5, doc7) và CCCD
    const requiredKeys = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5', 'doc7'];
    let filledCount = cccdNumber || cccdImage || cccdFrontImage ? 1 : 0;
    requiredKeys.forEach(k => {
      if (docs[k]) filledCount++;
    });
    const progressPercent = Math.round((filledCount / 7) * 100);

    const infoChannel = formData.get('infoChannel') || 'social_media';
    const needLoanConsult = formData.get('needLoanConsult') || 'yes';
    const maritalStatus = formData.get('maritalStatus') || 'Độc thân/ Độc thân nuôi con';
    const unitType = formData.get('unitType') || 'Căn 1 phòng ngủ';
    const preferredFloor = formData.get('preferredFloor') || 'mid';

    if (existingApp) {
      existingApp.fullName = fullName;
      existingApp.email = email;
      existingApp.cccdNumber = cccdNumber;
      existingApp.dob = dob;
      existingApp.gender = gender;
      existingApp.address = address;
      existingApp.issueDate = issueDate;
      existingApp.oldCmnd = oldCmnd;
      existingApp.infoChannel = infoChannel;
      existingApp.needLoanConsult = needLoanConsult;
      existingApp.targetObject = targetObject;
      existingApp.targetObjectDetail = targetObjectDetail;
      existingApp.maritalStatus = maritalStatus;
      existingApp.unitType = unitType;
      existingApp.preferredFloor = preferredFloor;
      existingApp.cccdImage = cccdImage;
      existingApp.cccdFrontImage = cccdFrontImage;
      existingApp.cccdBackImage = cccdBackImage;
      existingApp.qrParsedData = qrParsedData;
      existingApp.documents = docs;
      existingApp.agreedTerms1 = agreedTerms1;
      existingApp.agreedTerms2 = agreedTerms2;
      existingApp.progressPercent = progressPercent;
      if (ekycStatus !== 'unverified') {
        existingApp.ekycStatus = ekycStatus;
        if (ekycData) existingApp.ekycData = ekycData;
      }
      if (appointmentTicket) {
        existingApp.appointmentTicket = appointmentTicket;
      }
      if (existingApp.status === 'returned_for_supplement') {
        existingApp.status = 'submitted';
        existingApp.notes = 'Người dân đã cập nhật và bổ sung hồ sơ theo yêu cầu.';
      } else {
        existingApp.status = existingApp.status || 'submitted';
      }
      existingApp.updatedAt = new Date().toISOString();

      saveDb(db);
      return NextResponse.json({ success: true, message: 'Cập nhật hồ sơ thành công!', application: existingApp });
    } else {
      const maKHNumber = Math.floor(1000 + Math.random() * 9000);
      const now = new Date();
      const sla30Deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const newApp = {
        id: 'HS-2026-' + maKHNumber,
        userId: session.userId,
        maKH: `KH-${maKHNumber}`,
        fullName,
        phoneNumber: session.phoneNumber,
        email,
        cccdNumber,
        infoChannel,
        needLoanConsult,
        targetObject,
        targetObjectDetail,
        unitType,
        preferredFloor,
        status: 'submitted', // 'submitted' | 'to_kiem_soat' | 'bo_sung_ban_goc' | 'luu_tru' | 'returned_for_supplement' | 'rejected_wrong_k'
        stage: 1, // 1: Tổ tiếp nhận, 2: Tổ kiểm soát, 3: Nộp bản gốc, 4: Lưu trữ
        progressPercent,
        notes: 'Hồ sơ đã được gửi lên Tổ tiếp nhận.',
        dob,
        gender,
        address,
        issueDate,
        oldCmnd,
        cccdFrontImage,
        cccdBackImage,
        qrParsedData,
        cccdImage,
        documents: docs,
        agreedTerms1,
        agreedTerms2,
        ekycStatus: ekycStatus || 'unverified',
        ekycData: ekycData || null,
        appointmentTicket: appointmentTicket || null,
        assignedOfficer: 'Nguyễn Văn Tùng', // Mặc định Cán bộ tiếp nhận
        shift: 'morning', // 'morning' | 'afternoon'
        slaDeadline: sla30Deadline,
        createdAt: now.toISOString()
      };

      db.applications.push(newApp);
      saveDb(db);

      return NextResponse.json({ success: true, message: 'Nộp hồ sơ thành công!', application: newApp });
    }
  } catch (error) {
    console.error('Error submitting application:', error);
    return NextResponse.json({ success: false, message: 'Đã xảy ra lỗi khi nộp/cập nhật hồ sơ.' });
  }
}
