import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { setSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const handler = searchParams.get('handler');
    const formData = await request.formData();

    if (handler === 'SendOtp') {
      const phoneNumber = formData.get('phoneNumber');
      if (!phoneNumber) {
        return NextResponse.json({ success: false, message: 'Vui lòng nhập số điện thoại.' });
      }

      // Tạo mã OTP ngẫu nhiên
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 phút hiệu lực

      const db = getDb();
      // Xóa OTP cũ của số điện thoại này
      db.otps = db.otps.filter(o => o.phoneNumber !== phoneNumber);
      // Lưu OTP mới
      db.otps.push({ phoneNumber, code: otpCode, expiresAt });
      saveDb(db);

      console.log(`[OTP] Mã OTP cho số điện thoại ${phoneNumber} là: ${otpCode}`);

      // Trả về kèm mã OTP trong tin nhắn để demo tiện lợi
      return NextResponse.json({ 
        success: true, 
        message: `Mã xác nhận (SMS) đã gửi. (Mã demo: ${otpCode})` 
      });
    }

    if (handler === 'VerifyOtp') {
      const phoneNumber = formData.get('phoneNumber');
      const otpCode = formData.get('otpCode');

      if (!phoneNumber || !otpCode) {
        return NextResponse.json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin xác thực.' });
      }

      const db = getDb();
      const activeOtp = db.otps.find(o => o.phoneNumber === phoneNumber);

      if (!activeOtp || activeOtp.code !== otpCode) {
        return NextResponse.json({ success: false, message: 'Mã xác minh không chính xác.' });
      }

      const expired = new Date(activeOtp.expiresAt).getTime() < Date.now();
      if (expired) {
        return NextResponse.json({ success: false, message: 'Mã OTP đã hết hiệu lực, vui lòng lấy mã mới.' });
      }

      return NextResponse.json({ success: true, message: 'Xác minh số điện thoại thành công!' });
    }

    // Luồng đăng ký hoàn tất
    const fullName = formData.get('Input.FullName');
    const phoneNumber = formData.get('Input.PhoneNumber');
    const email = formData.get('Input.Email');
    const password = formData.get('Input.Password');

    if (!fullName || !phoneNumber || !email || !password) {
      return NextResponse.json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin đăng ký.' });
    }

    const db = getDb();
    const existUser = db.users.find(u => u.phoneNumber === phoneNumber);
    if (existUser) {
      return NextResponse.json({ success: false, message: 'Số điện thoại này đã được đăng ký tài khoản khác.' });
    }

    // Tạo user mới
    const newUser = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      fullName,
      phoneNumber,
      email,
      passwordHash: password, // Demo đơn giản
      role: 'user',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    // Xóa OTP sau khi sử dụng thành công
    db.otps = db.otps.filter(o => o.phoneNumber !== phoneNumber);
    saveDb(db);

    // Lưu session đăng nhập luôn
    await setSession(newUser);

    return NextResponse.json({ success: true, redirectUrl: '/portal' });
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json({ success: false, message: 'Đã xảy ra lỗi hệ thống.' });
  }
}
