import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { setSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const phoneNumber = formData.get('Input.PhoneNumber');
    const password = formData.get('Input.Password');

    if (!phoneNumber || !password) {
      return NextResponse.json({ success: false, message: 'Vui lòng nhập đầy đủ số điện thoại và mật khẩu.' });
    }

    const db = getDb();
    const user = db.users.find(u => u.phoneNumber === phoneNumber);

    if (!user) {
      return NextResponse.json({ success: false, message: 'Số điện thoại hoặc mật khẩu không chính xác.' });
    }

    // Kiểm tra mật khẩu (so sánh trực tiếp cho môi trường demo)
    if (user.passwordHash !== password) {
      return NextResponse.json({ success: false, message: 'Số điện thoại hoặc mật khẩu không chính xác.' });
    }

    // Lưu session
    await setSession(user);

    // Điều hướng dựa trên vai trò người dùng
    const redirectUrl = user.role === 'admin' ? '/admin' : '/portal';

    return NextResponse.json({ success: true, redirectUrl });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ success: false, message: 'Đã xảy ra lỗi hệ thống.' });
  }
}
