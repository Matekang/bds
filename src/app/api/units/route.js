import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const floor = searchParams.get('floor');
    
    const db = getDb();
    let units = db.units;

    if (floor) {
      units = units.filter(u => u.floor === parseInt(floor, 10));
    }

    return NextResponse.json({ success: true, units });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải danh sách căn hộ.' });
  }
}

// Giữ chỗ / Hủy giữ chỗ căn hộ
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập để thực hiện đặt chỗ.' });
    }

    const { unitId } = await request.json();
    if (!unitId) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin mã căn hộ.' });
    }

    const db = getDb();
    const unit = db.units.find(u => u.id === unitId);

    if (!unit) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy căn hộ này.' });
    }

    if (unit.status === 'sold') {
      return NextResponse.json({ success: false, message: 'Căn hộ này đã bán, không thể đặt giữ chỗ.' });
    }

    // Toggle trạng thái
    if (unit.status === 'reserved') {
      if (unit.reservedByUserId !== session.userId && session.role !== 'admin') {
        return NextResponse.json({ success: false, message: 'Căn hộ này đang được đặt chỗ bởi khách hàng khác.' });
      }
      // Hủy giữ chỗ
      unit.status = 'available';
      unit.reservedByUserId = null;
      unit.reservedAt = null;
    } else {
      // Giữ chỗ
      unit.status = 'reserved';
      unit.reservedByUserId = session.userId;
      unit.reservedAt = new Date().toISOString();
    }

    saveDb(db);
    return NextResponse.json({ success: true, message: 'Cập nhật trạng thái căn hộ thành công.', unit });
  } catch (error) {
    console.error('Error toggling unit reservation:', error);
    return NextResponse.json({ success: false, message: 'Đã xảy ra lỗi hệ thống.' });
  }
}

// Cập nhật trạng thái bán căn hộ trực tiếp của Admin
export async function PUT(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const { unitId, status } = await request.json();
    if (!unitId || !status) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin cập nhật căn hộ.' });
    }

    const db = getDb();
    const unit = db.units.find(u => u.id === unitId);

    if (!unit) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy căn hộ.' });
    }

    unit.status = status; // 'available' | 'reserved' | 'sold'
    
    // Nếu chuyển sang available hoặc sold, giải phóng thông tin đặt chỗ của user cũ
    if (status === 'available' || status === 'sold') {
      unit.reservedByUserId = null;
      unit.reservedAt = null;
    } else if (status === 'reserved' && !unit.reservedByUserId) {
      unit.reservedByUserId = session.userId;
      unit.reservedAt = new Date().toISOString();
    }

    saveDb(db);
    return NextResponse.json({ success: true, message: 'Cập nhật trạng thái căn hộ thành công!', unit });
  } catch (error) {
    console.error('Error updating unit status by admin:', error);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống.' });
  }
}

