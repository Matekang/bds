'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }
  return (
    <footer className="site-footer mt-auto">
      <div className="container">
        <div className="row gy-4">
          <div className="col-lg-5">
            <img 
              className="footer-logo" 
              src="https://marinaliving.vn/images/logo%20marina%20living%20halong/marina%20living%20hl_logo%201.png" 
              alt="MARINA LIVING" 
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <h4 className="text-white fw-bold mb-3 d-lg-none" style={{ letterSpacing: '1px' }}>MARINA LIVING</h4>
            <div className="footer-social-row">
              <a className="footer-social" href="https://www.facebook.com/profile.php?id=61592073140044&locale=vi_VN" target="_blank" rel="noopener" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z"/></svg>
              </a>
              <a className="footer-social" href="https://www.youtube.com/c/BIMGROUPOfficial" target="_blank" rel="noopener" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.5a3.02 3.02 0 0 0-2.12-2.14C19.5 3.85 12 3.85 12 3.85s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14c.5-1.9.5-5.5.5-5.5s0-3.6-.5-5.5ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z"/></svg>
              </a>
              <a className="footer-social" href="https://bimland.com/" target="_blank" rel="noopener" aria-label="Website BIM Land">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm6.92 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8ZM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96ZM4.26 14A8.09 8.09 0 0 1 4 12c0-.69.09-1.36.26-2h3.38a16.5 16.5 0 0 0 0 4H4.26Zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.08 16Zm2.95-8H5.08a7.99 7.99 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8ZM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96ZM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4Zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56ZM16.36 14a16.5 16.5 0 0 0 0-4h3.38c.17.64.26 1.31.26 2s-.09 1.36-.26 2h-3.38Z"/></svg>
              </a>
            </div>
          </div>
          <div className="col-lg-7">
            <div className="footer-heading">Thông tin dự án</div>
            <div className="footer-info-row">
              <span className="footer-label">Địa chỉ:</span>
              <span className="footer-value">Đa giác 3, Khu đô thị Halong Marina, phường Bãi Cháy, tỉnh Quảng Ninh</span>
            </div>
            <div className="footer-info-row">
              <span className="footer-label">Địa điểm tiếp nhận hồ sơ:</span>
              <span className="footer-value">Văn phòng tư vấn Nhà ở xã hội Marina Living Halong, Hạ Long Marine Plaza, phường Bãi Cháy, tỉnh Quảng Ninh.</span>
            </div>
            <div className="footer-info-row">
              <span className="footer-label">Email:</span>
              <span className="footer-value"><a href="mailto:cskh-marinalivinghalong@bimgroup.com">cskh-marinalivinghalong@bimgroup.com</a></span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 BIM Group. Phát triển bởi Antigravity AI.</span>
        </div>
      </div>
    </footer>
  );
}
