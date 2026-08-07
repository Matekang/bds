import { getSession } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModals from '@/components/AuthModals';
import BackToTop from '@/components/BackToTop';
import './globals.css';

export const metadata = {
  title: "Trang chủ - MARINA LIVING",
  description: "Dự án nhà ở xã hội Marina Living Hạ Long do BIM Land phát triển. Cung cấp giải pháp nhà ở chất lượng cao, xanh và bền vững.",
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html lang="vi" className="h-full">
      <head>
        {/* Bootstrap 5 CSS từ CDN */}
        <link 
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" 
          rel="stylesheet" 
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Navbar component */}
        <Navbar session={session} />
        
        {/* Nội dung trang */}
        <main className="flex-shrink-0">
          {children}
        </main>
        
        {/* Footer component */}
        <Footer />
        
        {/* Modals Đăng ký / Đăng nhập */}
        <AuthModals />

        {/* Nút Cuộn về đầu trang (Back To Top) */}
        <BackToTop />

        {/* Bootstrap 5 JS Bundle từ CDN */}
        <script 
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" 
          async 
          defer
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
