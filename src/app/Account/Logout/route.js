import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST() {
  // Xóa session cookie
  await deleteSession();

  // Tạo response redirect về trang chủ
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));

  // Xóa thêm cookie phòng trường hợp deleteSession không đủ
  response.cookies.set('session_token', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    expires: new Date(0),
  });

  return response;
}

// Cũng hỗ trợ GET để dễ dùng từ link thông thường
export async function GET() {
  return POST();
}
