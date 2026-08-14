import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminClient from './AdminClient';

export const metadata = {
  title: 'Trang Quản Trị Viên - Marina Living',
  description: 'Trang quản trị dành cho Admin Hapro để duyệt hồ sơ đăng ký mua nhà ở xã hội và cập nhật bảng hàng.'
};

export default async function AdminPage() {
  const session = await getSession();

  const isStaff = session && (session.role === 'admin' || session.role?.startsWith('officer_'));
  if (!isStaff) {
    redirect('/?auth=login');
  }

  return (
    <AdminClient 
      session={session} 
      initialApplications={[]} 
      initialUnits={[]} 
      initialDeadline={'2026-08-30T17:00:00.000Z'} 
    />
  );
}
