'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Navbar({ session }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const nav = document.querySelector('.site-nav');
    if (nav) {
      document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
    }
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      window.location.href = '/';
    }
  };

  return (
    <>
      {/* Top Announcement Bar 📢 */}
      <div className="announce-bar">
        <div className="container d-flex justify-content-between align-items-center gap-3">
          <div className="announce-text">
            <span>Dự án Marina Living Halong đang tiếp nhận hồ sơ đăng ký Đợt 1 đến 21/08/2026</span>
          </div>
          <div className="text-nowrap d-none d-md-block announce-email">
            Email hỗ trợ: <strong>cskh-marinalivinghalong@bimgroup.com</strong>
          </div>
        </div>
      </div>

      {/* Sticky Nav */}
      <nav className="site-nav">
        <div className="container d-flex align-items-center py-2 justify-content-between">
          <Link className="brand-block d-flex align-items-center me-3 text-decoration-none" href="/#hero">
            <img 
              src="https://marinaliving.vn/images/logo%20marina%20living%20halong/marina%20living%20hl_logo%201.png" 
              style={{ width: '110px', height: 'auto' }} 
              alt="Logo MARINA LIVING"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </Link>
          
          {/* Main Navigation items matching original site dropdowns */}
          <div className="d-none d-lg-flex mega-nav align-items-center mx-auto">
            <div className="mega-item">
              <span className="nav-link mega-trigger">
                Marina Living
              </span>
              <div className="mega-panel">
                <Link className="mega-link" href="/VeMarinaLiving">Về Marina Living</Link>
                <a className="mega-link" href="#">Câu chuyện thương hiệu</a>
              </div>
            </div>
            
            <div className="mega-item">
              <span className="nav-link mega-trigger">
                Marina Living Halong
              </span>
              <div className="mega-panel">
                <Link className="mega-link" href="/#tongquan">Tổng quan dự án</Link>
                <Link className="mega-link" href="/#vitri">Vị trí &amp; Kết nối</Link>
                <Link className="mega-link" href="/#songxanh">Thiết kế</Link>
                <Link className="mega-link" href="/#tienich">Tiện ích</Link>
                <Link className="mega-link" href="/#donvi">Đơn vị phát triển</Link>
              </div>
            </div>
            
            <div className="mega-item">
              <span className="nav-link mega-trigger">
                Mua nhà dễ dàng
              </span>
              <div className="mega-panel">
                <Link className="mega-link" href="/DieuKienMua">Tôi có đủ điều kiện mua không?</Link>
                <Link className="mega-link" href="/cungbanmuanha">Hướng dẫn cùng bạn mua nhà</Link>
              </div>
            </div>
            
            <div className="mega-item">
              <span className="nav-link mega-trigger">
                Thông tin giỏ hàng
              </span>
              <div className="mega-panel">
                <Link className="mega-link" href="/#matbang">Mặt bằng căn hộ</Link>
                <Link className="mega-link" href="/#tintuc">Thư viện &amp; tin tức</Link>
                <a className="mega-link" href="#">Câu hỏi thường gặp</a>
              </div>
            </div>
          </div>

          {/* Action buttons (Right side) */}
          <div className="d-none d-sm-flex gap-2 align-items-center">
            {session ? (
              <div className="dropdown">
                <button 
                  className="btn btn-nav-emerald dropdown-toggle" 
                  type="button" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                >
                  Xin chào, {session.fullName}
                </button>
                <ul className="dropdown-menu dropdown-menu-end mt-2 shadow border-0" style={{ borderRadius: '12px' }}>
                  <li>
                    <Link className="dropdown-item py-2 px-3 fw-semibold text-emerald" href={session.role === 'admin' ? '/admin' : '/portal'}>
                      {session.role === 'admin' ? '⚙️ Trang Admin' : '👤 Portal Cá Nhân'}
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <a className="dropdown-item py-2 px-3 text-danger fw-semibold" href="#" onClick={handleLogout}>
                      🚪 Đăng xuất
                    </a>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <button type="button" className="btn btn-nav-light" data-bs-toggle="modal" data-bs-target="#loginModal">Đăng Nhập</button>
                <button type="button" className="btn btn-nav-emerald" data-bs-toggle="modal" data-bs-target="#registerModal">Đăng Ký Mua</button>
              </>
            )}
            
            <a className="nav-contact-btn" href="mailto:cskh-marinalivinghalong@bimgroup.com" title="Liên hệ với chúng tôi" aria-label="Liên hệ với chúng tôi">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ width: '18px', height: '18px', color: '#f5a623' }}>
                <path d="M6.62 10.79a15.53 15.53 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.24 1.02l-2.21 2.2Z"/>
              </svg>
            </a>
          </div>

          <button 
            className="nav-toggle d-lg-none ms-auto ms-sm-2" 
            type="button"
            data-bs-toggle="offcanvas" 
            data-bs-target="#mobileNav"
            aria-controls="mobileNav" 
            aria-label="Mở menu"
          >
            <span className="nav-toggle-bars" aria-hidden="true"></span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className="offcanvas offcanvas-end mobile-nav" tabIndex="-1" id="mobileNav" aria-labelledby="mobileNavLabel">
        <div className="offcanvas-header">
          <span className="offcanvas-title fw-bold" id="mobileNavLabel">MARINA LIVING</span>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Đóng"></button>
        </div>
        <div className="offcanvas-body">
          <div className="mnav-group">
            <button className="mnav-trigger collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#mnav1" aria-expanded="false" aria-controls="mnav1">
              Marina Living<span className="mega-caret" aria-hidden="true"></span>
            </button>
            <div className="collapse" id="mnav1">
              <Link className="mnav-link" href="/VeMarinaLiving">Về Marina Living</Link>
              <a className="mnav-link" href="#">Câu chuyện thương hiệu</a>
            </div>
          </div>
          <div className="mnav-group">
            <button className="mnav-trigger collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#mnav2" aria-expanded="false" aria-controls="mnav2">
              Marina Living Halong<span className="mega-caret" aria-hidden="true"></span>
            </button>
            <div className="collapse" id="mnav2">
              <Link className="mnav-link" href="/#tongquan">Tổng quan dự án</Link>
              <Link className="mnav-link" href="/#vitri">Vị trí &amp; Kết nối</Link>
              <Link className="mnav-link" href="/#songxanh">Thiết kế</Link>
              <Link className="mnav-link" href="/#tienich">Tiện ích</Link>
              <Link className="mnav-link" href="/#donvi">Đơn vị phát triển</Link>
            </div>
          </div>
          <div className="mnav-group">
            <button className="mnav-trigger collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#mnav3" aria-expanded="false" aria-controls="mnav3">
              Mua nhà dễ dàng<span className="mega-caret" aria-hidden="true"></span>
            </button>
            <div className="collapse" id="mnav3">
              <Link className="mnav-link" href="/DieuKienMua">Tôi có đủ điều kiện mua không?</Link>
              <Link className="mnav-link" href="/cungbanmuanha">Hướng dẫn cùng bạn mua nhà</Link>
            </div>
          </div>
          <div className="mnav-group">
            <button className="mnav-trigger collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#mnav4" aria-expanded="false" aria-controls="mnav4">
              Thông tin giỏ hàng<span className="mega-caret" aria-hidden="true"></span>
            </button>
            <div className="collapse" id="mnav4">
              <Link className="mnav-link" href="/#matbang">Mặt bằng căn hộ</Link>
              <Link className="mnav-link" href="/#tintuc">Thư viện &amp; tin tức</Link>
              <a className="mnav-link" href="#">Câu hỏi thường gặp</a>
            </div>
          </div>

          <div className="mnav-actions">
            {session ? (
              <>
                <Link className="btn btn-emerald rounded-pill w-100 text-center" href={session.role === 'admin' ? '/admin' : '/portal'}>
                  👤 {session.fullName}
                </Link>
                <button type="button" className="btn btn-light rounded-pill w-100" onClick={handleLogout}>Đăng xuất</button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-light rounded-pill w-100 brand-login" data-bs-dismiss="offcanvas" data-bs-toggle="modal" data-bs-target="#loginModal">Đăng Nhập</button>
                <button type="button" className="btn btn-emerald rounded-pill w-100" data-bs-dismiss="offcanvas" data-bs-toggle="modal" data-bs-target="#registerModal">Đăng Ký Mua</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
