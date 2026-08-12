import { cookies } from 'next/headers';
import { getDb } from './db';

// Tạo session cookie giả lập
export async function setSession(user) {
  const cookieStore = await cookies();
  const sessionData = {
    userId: user.id,
    role: user.role,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    email: user.email || ''
  };
  const token = Buffer.from(JSON.stringify(sessionData)).toString('base64');
  cookieStore.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
}

// Lấy session từ cookie
export async function getSession() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('session_token');
  if (!tokenCookie || !tokenCookie.value) {
    return null;
  }
  try {
    const rawData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
    const session = JSON.parse(rawData);
    
    // Kiểm tra xem user có thực sự tồn tại trong DB không
    const db = getDb();
    const user = db.users.find(u => u.id === session.userId);
    if (!user) return null;

    return {
      ...session,
      email: user.email || session.email || ''
    };
  } catch (error) {
    return null;
  }
}

// Xóa session cookie
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
}
