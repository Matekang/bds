import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
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

  return (
    <PortalClient 
      session={session} 
      initialApplications={[]} 
    />
  );
}
