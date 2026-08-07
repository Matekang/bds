import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const { id } = await params;
    const { status, notes } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin cập nhật.' });
    }

    const db = getDb();
    const app = db.applications.find(a => a.id === id);

    if (!app) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hồ sơ.' });
    }

    // Cập nhật trạng thái và ghi chú
    app.status = status; // 'submitted' | 'reviewing' | 'approved' | 'rejected'
    if (notes !== undefined) {
      app.notes = notes;
    }

    saveDb(db);
    return NextResponse.json({ success: true, message: 'Cập nhật trạng thái hồ sơ thành công.', application: app });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống.' });
  }
}
