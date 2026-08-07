import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const db = getDb();
    return NextResponse.json({ success: true, settings: db.settings });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Lỗi tải cài đặt.' });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const { countdownDeadline } = await request.json();
    if (!countdownDeadline) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin hạn chót nộp hồ sơ.' });
    }

    const db = getDb();
    db.settings.countdownDeadline = countdownDeadline;
    saveDb(db);

    return NextResponse.json({ success: true, message: 'Cập nhật thời gian hạn chót thành công!' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống.' });
  }
}
