'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phone) return;
    setSent(true);
  };

  return (
    <div className="bg-cream py-5" style={{ minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: '540px' }}>
        <div className="card border-0 shadow-lg p-4 p-md-5" style={{ borderRadius: '20px' }}>
          <div className="text-center mb-4">
            <span className="v2-kicker">Hỗ trợ tài khoản</span>
            <h2 className="fw-bold text-emerald mt-2">QUÊN MẬT KHẨU</h2>
            <p className="text-muted small">
              Nhập số điện thoại đã đăng ký tài khoản cư dân để nhận mã khôi phục mật khẩu.
            </p>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="result-banner result-ok mb-4">
                📩 ĐÃ GỬI MÃ KHÔI PHỤC VỀ SỐ DỰ PHÒNG
              </div>
              <p className="text-muted small mb-4">
                Hệ thống đã gửi một liên kết/mã OTP khôi phục mật khẩu tới số điện thoại <strong>{phone}</strong>. Vui lòng kiểm tra tin nhắn SMS.
              </p>
              <Link href="/" className="btn btn-emerald rounded-2 px-4 py-2 text-decoration-none">
                ➜ Quay về Trang Chủ
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label fw-bold text-dark">Số điện thoại đăng ký</label>
                <input 
                  type="tel" 
                  className="form-control form-control-lg border-success border-opacity-25"
                  placeholder="Nhập số điện thoại của bạn..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                />
              </div>

              <button type="submit" className="btn btn-emerald w-100 py-3 rounded-2 fw-bold mb-3">
                🔑 Gửi yêu cầu khôi phục
              </button>

              <div className="text-center">
                <Link href="/" className="text-muted small text-decoration-none hover-underline">
                  ← Quay lại trang chủ
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
