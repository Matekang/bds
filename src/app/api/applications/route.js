import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Tạo thư mục uploads nếu chưa tồn tại
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
    const fullName = formData.get('fullName') || session.fullName;
    const email = formData.get('email') || '';
    const cccdNumber = formData.get('cccdNumber') || '';
    const targetObject = formData.get('targetObject') || 'K1';
    const agreedTerms1 = formData.get('agreedTerms1') === 'true';
    const agreedTerms2 = formData.get('agreedTerms2') === 'true';

    const db = getDb();
    let existingApp = appId ? db.applications.find(a => a.id === appId && a.userId === session.userId) : null;
    
    // Nếu chưa có appId nhưng user đã có 1 app, ta cập nhật app đó
    if (!existingApp) {
      existingApp = db.applications.find(a => a.userId === session.userId);
    }

    const docs = existingApp?.documents || {
      doc1: null, doc2: null, doc3: null, doc4: null, doc5: null, doc6: null, doc7: null, doc8: null, doc9: null
    };

    // Xử lý tệp CCCD
    let cccdImage = existingApp?.cccdImage || null;
    const cccdFile = formData.get('cccdFile');
    if (cccdFile && cccdFile instanceof File && cccdFile.size > 0) {
      const buffer = Buffer.from(await cccdFile.arrayBuffer());
      const ext = path.extname(cccdFile.name) || '.jpg';
      const filename = `cccd-${session.userId}-${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      cccdImage = `/uploads/${filename}`;
    }

    // Xử lý 9 loại tài liệu (doc1 -> doc9)
    for (let i = 1; i <= 9; i++) {
      const docKey = `doc${i}`;
      const file = formData.get(docKey);
      if (file && file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = path.extname(file.name) || '.pdf';
        const filename = `${session.userId}-${docKey}-${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);
        docs[docKey] = {
          name: file.name,
          url: `/uploads/${filename}`
        };
      }
    }

    // Tính % hoàn thành dựa trên số tài liệu bắt buộc (doc1, doc2, doc3, doc4, doc5, doc7) và CCCD
    const requiredKeys = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5', 'doc7'];
    let filledCount = cccdNumber || cccdImage ? 1 : 0;
    requiredKeys.forEach(k => {
      if (docs[k]) filledCount++;
    });
    const progressPercent = Math.round((filledCount / 7) * 100);

    const infoChannel = formData.get('infoChannel') || 'social_media';
    const needLoanConsult = formData.get('needLoanConsult') || 'yes';
    const unitType = formData.get('unitType') || '2PN';
    const preferredFloor = formData.get('preferredFloor') || 'mid';

    if (existingApp) {
      existingApp.fullName = fullName;
      existingApp.email = email;
      existingApp.cccdNumber = cccdNumber;
      existingApp.infoChannel = infoChannel;
      existingApp.needLoanConsult = needLoanConsult;
      existingApp.targetObject = targetObject;
      existingApp.unitType = unitType;
      existingApp.preferredFloor = preferredFloor;
      existingApp.cccdImage = cccdImage;
      existingApp.documents = docs;
      existingApp.agreedTerms1 = agreedTerms1;
      existingApp.agreedTerms2 = agreedTerms2;
      existingApp.progressPercent = progressPercent;
      existingApp.status = existingApp.status || 'submitted';
      existingApp.updatedAt = new Date().toISOString();

      saveDb(db);
      return NextResponse.json({ success: true, message: 'Cập nhật hồ sơ thành công!', application: existingApp });
    } else {
      const maKHNumber = Math.floor(1000 + Math.random() * 9000);
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
        unitType,
        preferredFloor,
        status: 'submitted',
        stage: 1,
        progressPercent,
        notes: '',
        cccdImage,
        documents: docs,
        agreedTerms1,
        agreedTerms2,
        createdAt: new Date().toISOString()
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
