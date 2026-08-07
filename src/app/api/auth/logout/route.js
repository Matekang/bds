import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true, message: 'Đăng xuất thành công.' });
}

export async function GET() {
  await deleteSession();
  // Điều hướng về trang chủ
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
