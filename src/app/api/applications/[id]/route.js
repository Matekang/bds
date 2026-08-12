import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    const isStaff = session && (session.role === 'admin' || session.role?.startsWith('officer_'));
    if (!session || !isStaff) {
      return NextResponse.json({ success: false, message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes, stage, action, assignedOfficer, shift, hardCopyDays } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin mã hồ sơ.' });
    }

    const db = getDb();
    const app = db.applications.find(a => a.id === id);

    if (!app) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hồ sơ.' });
    }

    // Kiểm tra quyền xử lý hồ sơ theo phân vai nhiệm vụ từng tổ
    if (session.role === 'officer_intake' && app.stage !== 1) {
      return NextResponse.json({ success: false, message: 'Tổ tiếp nhận chỉ có quyền xử lý các hồ sơ ở Giai đoạn 1 (Tổ tiếp nhận).' }, { status: 403 });
    }
    if (session.role === 'officer_control' && app.stage !== 2) {
      return NextResponse.json({ success: false, message: 'Tổ kiểm soát chỉ có quyền xử lý các hồ sơ ở Giai đoạn 2 (Tổ kiểm soát).' }, { status: 403 });
    }
    if (session.role === 'officer_hardcopy' && app.stage !== 3) {
      return NextResponse.json({ success: false, message: 'Bộ phận tiếp nhận bản gốc chỉ có quyền xử lý các hồ sơ ở Giai đoạn 3 (Nộp bản gốc).' }, { status: 403 });
    }
    if (session.role === 'officer_archive' && app.stage !== 4) {
      return NextResponse.json({ success: false, message: 'Bộ phận lưu trữ chỉ có quyền thao tác với các hồ sơ ở Giai đoạn 4 (Lưu trữ).' }, { status: 403 });
    }

    // Xử lý các hành động đặc thù
    if (action === 'bypass_intake') {
      app.status = 'to_kiem_soat';
      app.stage = 2;
      app.notes = notes || '⚡ Hồ sơ hoàn chỉnh chuẩn hóa, đã Bypass Tổ Tiếp Nhận và chuyển thẳng lên Tổ Kiểm Soát.';
    } else if (action === 'reject_wrong_k') {
      app.status = 'rejected_wrong_k';
      app.stage = 1;
      app.notes = notes || '❌ Hồ sơ bị từ chối do chọn sai nhóm đối tượng K. Yêu cầu người dân nộp lại từ đầu.';
    } else if (action === 'return_to_citizen') {
      app.status = 'returned_for_supplement';
      app.notes = notes || '🟠 Hồ sơ chưa đủ điều kiện, được trả về cho người dân để bổ sung/sửa đổi.';
    } else if (action === 'approve_digital') {
      app.status = 'bo_sung_ban_goc';
      app.stage = 3;
      const days = hardCopyDays || 5;
      app.hardCopyDeadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      app.notes = notes || `✅ Hồ sơ đã được duyệt bản số. Người dân có ${days} ngày để mang hồ sơ gốc đến làm việc.`;
    } else if (action === 'archive') {
      app.status = 'luu_tru';
      app.stage = 4;
      app.notes = notes || '🟢 Hồ sơ gốc đã đối chứng thành công và được đưa vào Lưu Trữ.';
    } else {
      if (status) app.status = status;
      if (stage) app.stage = stage;
      if (notes !== undefined) app.notes = notes;
    }

    if (assignedOfficer) app.assignedOfficer = assignedOfficer;
    if (shift) app.shift = shift;

    app.updatedAt = new Date().toISOString();

    saveDb(db);
    return NextResponse.json({ success: true, message: 'Cập nhật hồ sơ thành công!', application: app });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống.' });
  }
}
