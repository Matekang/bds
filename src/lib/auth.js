import { cookies } from 'next/headers';

// Lấy session từ cookie do .NET Core backend tạo
export async function getSession() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('session_token');
  if (!tokenCookie || !tokenCookie.value) {
    return null;
  }
  try {
    const rawData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
    const session = JSON.parse(rawData);

    if (!session || !session.userId) {
      return null;
    }
    
    return {
      userId: session.userId,
      role: session.role || 'user',
      fullName: session.fullName || 'Người dùng',
      phoneNumber: session.phoneNumber || '',
      email: session.email || ''
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
