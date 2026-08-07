import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import AdminClient from './AdminClient';

export const metadata = {
  title: 'Trang Quản Trị Viên - Marina Living',
  description: 'Trang quản trị dành cho Admin Hapro để duyệt hồ sơ đăng ký mua nhà ở xã hội và cập nhật bảng hàng.'
};

export default async function AdminPage() {
  const session = await getSession();

  // Yêu cầu đăng nhập và vai trò phải là admin
  if (!session || session.role !== 'admin') {
    redirect('/?auth=login');
  }

  const db = getDb();

  return (
    <AdminClient 
      session={session} 
      initialApplications={db.applications || []} 
      initialUnits={db.units || []} 
      initialDeadline={db.settings?.countdownDeadline || '2026-08-20T17:00:00.000Z'} 
    />
  );
}
