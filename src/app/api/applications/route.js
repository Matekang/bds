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
    const fullName = formData.get('fullName') || session.fullName;
    const targetObject = formData.get('targetObject'); // Đối tượng mua (vd: thu nhập thấp)
    
    // Lưu các tệp đính kèm
    const files = ['cccdFront', 'cccdBack', 'residency', 'income'];
    const savedDocs = {};

    for (const fieldName of files) {
      const file = formData.get(fieldName);
      if (file && file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = path.extname(file.name) || '.pdf';
        const filename = `${session.userId}-${fieldName}-${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);
        savedDocs[fieldName] = `/uploads/${filename}`;
      } else {
        savedDocs[fieldName] = null;
      }
    }

    const db = getDb();
    
    // Tạo hồ sơ mới
    const newApp = {
      id: 'app-' + Math.random().toString(36).substr(2, 9),
      userId: session.userId,
      fullName,
      phoneNumber: session.phoneNumber,
      email: formData.get('email') || '',
      targetObject,
      status: 'submitted', // Trạng thái ban đầu
      notes: '',
      documents: savedDocs,
      createdAt: new Date().toISOString()
    };

    db.applications.push(newApp);
    saveDb(db);

    return NextResponse.json({ success: true, message: 'Nộp hồ sơ thành công!', application: newApp });
  } catch (error) {
    console.error('Error submitting application:', error);
    return NextResponse.json({ success: false, message: 'Đã xảy ra lỗi khi nộp hồ sơ.' });
  }
}
