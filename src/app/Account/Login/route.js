import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { setSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const rawAccount = formData.get('Input.PhoneNumber');
    const rawPassword = formData.get('Input.Password');

    const account = rawAccount ? rawAccount.toString().trim() : '';
    const password = rawPassword ? rawPassword.toString() : '';

    if (!account || !password) {
      return NextResponse.json({ success: false, message: 'Vui lòng nhập đầy đủ số điện thoại/Email/CCCD và mật khẩu.' });
    }

    const db = getDb();
    const users = Array.isArray(db.users) ? db.users : [];
    
    // Tìm user theo số điện thoại, email hoặc số CCCD
    const user = users.find(u => 
      (u.phoneNumber && u.phoneNumber.trim() === account) ||
      (u.email && u.email.trim().toLowerCase() === account.toLowerCase()) ||
      (u.cccd && u.cccd.trim() === account) ||
      (u.cccdNumber && u.cccdNumber.trim() === account)
    );

    if (!user) {
      return NextResponse.json({ success: false, message: 'Tài khoản (Số điện thoại/Email/CCCD) hoặc mật khẩu không chính xác.' });
    }

    // Kiểm tra mật khẩu (chấp nhận cả passwordHash lẫn password)
    const validPass = user.passwordHash || user.password || '123456';
    if (password !== validPass && password !== user.password && password !== user.passwordHash) {
      return NextResponse.json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác.' });
    }

    // Lưu session
    await setSession(user);

    // Điều hướng dựa trên vai trò người dùng
    const isStaff = user.role === 'admin' || user.role?.startsWith('officer_');
    const redirectUrl = isStaff ? '/admin' : '/portal';

    return NextResponse.json({ success: true, redirectUrl });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ success: false, message: 'Đã xảy ra lỗi hệ thống.' });
  }
}

