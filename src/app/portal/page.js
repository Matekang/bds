import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import PortalClient from './PortalClient';

export const metadata = {
  title: 'Portal Cá Nhân - Marina Living',
  description: 'Trang cá nhân quản lý hồ sơ đăng ký mua nhà ở xã hội Marina Living.'
};

export default async function PortalPage() {
  const session = await getSession();

  // Yêu cầu đăng nhập, nếu chưa thì điều hướng
  if (!session) {
    redirect('/?auth=login');
  }

  // Lấy dữ liệu hồ sơ ban đầu của user này
  const db = getDb();
  const initialApplications = db.applications.filter(a => a.userId === session.userId);

  return (
    <PortalClient 
      session={session} 
      initialApplications={initialApplications} 
    />
  );
}
