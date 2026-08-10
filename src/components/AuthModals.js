'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AuthModals() {
  // States cho Đăng nhập
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState({ text: '', isError: false });
  const [showLoginPass, setShowLoginPass] = useState(false);

  // States cho Đăng ký
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMsg, setOtpMsg] = useState({ text: '', type: 'muted' }); // muted, success, danger
  const [regMsg, setRegMsg] = useState({ text: '', isError: false });
  
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirmPass, setShowRegConfirmPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Gửi OTP
  const handleSendOtp = async () => {
    const trimmedPhone = regPhone.trim();
    if (!trimmedPhone) {
      setOtpMsg({ text: 'Vui lòng nhập số điện thoại trước.', type: 'danger' });
      return;
    }
    setOtpMsg({ text: 'Đang gửi mã...', type: 'muted' });
    
    try {
      const fd = new FormData();
      fd.append('phoneNumber', trimmedPhone);
      
      const res = await fetch('/Account/Register?handler=SendOtp', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      
      if (data.success) {
        setOtpMsg({ text: data.message, type: 'success' });
        setOtpSent(true);
        setOtpVerified(false);
      } else {
        setOtpMsg({ text: data.message, type: 'danger' });
      }
    } catch (error) {
      setOtpMsg({ text: 'Lỗi gửi mã OTP. Vui lòng thử lại.', type: 'danger' });
    }
  };

  // Xác minh OTP tự động khi nhập đủ 6 ký tự
  useEffect(() => {
    if (regOtp.trim().length === 6 && otpSent && !otpVerified) {
      const verifyOtp = async () => {
        setOtpMsg({ text: 'Đang kiểm tra mã...', type: 'muted' });
        try {
          const fd = new FormData();
          fd.append('phoneNumber', regPhone.trim());
          fd.append('otpCode', regOtp.trim());

          const res = await fetch('/Account/Register?handler=VerifyOtp', {
            method: 'POST',
            body: fd
          });
          const data = await res.json();

          if (data.success) {
            setOtpMsg({ text: data.message, type: 'success' });
            setOtpVerified(true);
          } else {
            setOtpMsg({ text: data.message, type: 'danger' });
          }
        } catch (error) {
          setOtpMsg({ text: 'Không thể xác thực OTP lúc này.', type: 'danger' });
        }
      };
      verifyOtp();
    }
  }, [regOtp, otpSent, otpVerified, regPhone]);

  // Đăng ký tài khoản
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      setRegMsg({ text: 'Vui lòng nhận và xác minh mã OTP (SMS) trước khi tạo tài khoản.', isError: true });
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegMsg({ text: 'Mật khẩu và xác nhận mật khẩu không khớp.', isError: true });
      return;
    }

    setIsLoading(true);
    setRegMsg({ text: '', isError: false });

    try {
      const fd = new FormData();
      fd.append('Input.FullName', regFullName);
      fd.append('Input.PhoneNumber', regPhone);
      fd.append('Input.Email', regEmail);
      fd.append('Input.Password', regPassword);

      const res = await fetch('/Account/Register', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();

      if (data.success) {
        // Tắt modal và reload/redirect
        const modalEl = document.getElementById('registerModal');
        if (modalEl) {
          const bootstrap = window.bootstrap;
          if (bootstrap) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          }
        }
        window.location.href = data.redirectUrl || '/portal';
      } else {
        setRegMsg({ text: data.message, isError: true });
        setIsLoading(false);
      }
    } catch (error) {
      setRegMsg({ text: 'Đăng ký thất bại. Lỗi kết nối hệ thống.', isError: true });
      setIsLoading(false);
    }
  };

  // Đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMsg({ text: '', isError: false });

    try {
      const fd = new FormData();
      fd.append('Input.PhoneNumber', loginPhone);
      fd.append('Input.Password', loginPassword);

      const res = await fetch('/Account/Login', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();

      if (data.success) {
        // Tắt modal và redirect
        const modalEl = document.getElementById('loginModal');
        if (modalEl) {
          const bootstrap = window.bootstrap;
          if (bootstrap) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          }
        }
        window.location.href = data.redirectUrl || '/portal';
      } else {
        setLoginMsg({ text: data.message, isError: true });
      }
    } catch (error) {
      setLoginMsg({ text: 'Đăng nhập thất bại. Lỗi kết nối.', isError: true });
    }
  };

  // Chuyển đổi giữa Đăng ký và Đăng nhập
  const switchTo = (targetId) => {
    const bootstrap = window.bootstrap;
    if (!bootstrap) return;

    const loginModalEl = document.getElementById('loginModal');
    const registerModalEl = document.getElementById('registerModal');

    if (targetId === 'registerModal') {
      const loginModal = bootstrap.Modal.getInstance(loginModalEl) || bootstrap.Modal.getOrCreateInstance(loginModalEl);
      loginModal.hide();
      loginModalEl.addEventListener('hidden.bs.modal', function onHidden() {
        loginModalEl.removeEventListener('hidden.bs.modal', onHidden);
        const registerModal = bootstrap.Modal.getInstance(registerModalEl) || bootstrap.Modal.getOrCreateInstance(registerModalEl);
        registerModal.show();
      });
    } else {
      const registerModal = bootstrap.Modal.getInstance(registerModalEl) || bootstrap.Modal.getOrCreateInstance(registerModalEl);
      registerModal.hide();
      registerModalEl.addEventListener('hidden.bs.modal', function onHidden() {
        registerModalEl.removeEventListener('hidden.bs.modal', onHidden);
        const loginModal = bootstrap.Modal.getInstance(loginModalEl) || bootstrap.Modal.getOrCreateInstance(loginModalEl);
        loginModal.show();
      });
    }
  };

  return (
    <>
      {/* Modal Đăng nhập */}
      <div className="modal fade" id="loginModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0">
            <div className="modal-header border-0 pb-0">
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
            </div>
            <div className="modal-body px-4 pb-4 pt-0">
              <h4 className="fw-bold text-center text-emerald mb-1">Đăng Nhập Hệ Thống</h4>
              <p className="text-center text-muted small mb-4">Nhập số điện thoại để tiếp tục</p>

              {loginMsg.text && (
                <div className={`alert ${loginMsg.isError ? 'alert-danger' : 'alert-success'} py-2`} role="alert">
                  {loginMsg.text}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Số điện thoại đăng nhập</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Số điện thoại" 
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    required 
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Mật khẩu</label>
                  <div className="input-group">
                    <input 
                      type={showLoginPass ? 'text' : 'password'} 
                      className="form-control" 
                      placeholder="Mật khẩu"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required 
                    />
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                    >
                      {showLoginPass ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <div className="form-check mb-0">
                    <input type="checkbox" className="form-check-input" id="modalRememberMe" />
                    <label className="form-check-label" htmlFor="modalRememberMe">Ghi nhớ tôi</label>
                  </div>
                  <Link className="text-emerald fw-semibold small" href="/Account/ForgotPassword" data-bs-dismiss="modal">
                    Quên mật khẩu?
                  </Link>
                </div>

                <button type="submit" className="btn btn-emerald w-100 btn-lg">Đăng Nhập</button>

                <p className="text-center mt-3 mb-0">
                  Chưa có tài khoản?{' '}
                  <a href="#" className="text-emerald fw-semibold" onClick={(e) => { e.preventDefault(); switchTo('registerModal'); }}>
                    Đăng ký mua NOXH
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Đăng ký */}
      <div className="modal fade" id="registerModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0">
            <div className="modal-header border-0 pb-0">
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
            </div>
            <div className="modal-body px-4 pb-4 pt-0">
              <h4 className="fw-bold text-center text-emerald mb-1">Đăng Ký Tài Khoản Mua NOXH</h4>
              <p className="text-center text-muted small mb-3">Mỗi cá nhân chỉ đăng ký duy nhất 1 tài khoản</p>

              {regMsg.text && (
                <div className={`alert ${regMsg.isError ? 'alert-danger' : 'alert-success'} py-2`} role="alert">
                  {regMsg.text}
                </div>
              )}

              <form onSubmit={handleRegister}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Họ tên</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="VD: Nguyễn Văn A" 
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required 
                    disabled={otpVerified}
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Số điện thoại</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="VD: 0901234567"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required 
                      disabled={otpVerified}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="VD: nguyenvana@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required 
                      disabled={otpVerified}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Mã xác nhận (SMS)</label>
                  <div className="input-group">
                    <input 
                      type="text" 
                      maxLength="6" 
                      placeholder="Mã OTP 6 số"
                      className="form-control text-center fw-bold font-monospace"
                      value={regOtp}
                      onChange={(e) => setRegOtp(e.target.value)}
                      disabled={!otpSent || otpVerified}
                      required
                    />
                    <button 
                      type="button" 
                      className="btn btn-emerald text-nowrap"
                      onClick={handleSendOtp}
                      disabled={otpVerified}
                    >
                      {otpSent ? 'Gửi lại' : 'Gửi mã'}
                    </button>
                  </div>
                  {otpMsg.text && (
                    <div className={`small fw-semibold mt-1 ${otpMsg.type === 'success' ? 'text-success' : otpMsg.type === 'danger' ? 'text-danger' : 'text-muted'}`}>
                      {otpMsg.text}
                    </div>
                  )}
                </div>

                {otpVerified && (
                  <div className="border-top pt-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Thiết lập mật khẩu</label>
                      <div className="input-group">
                        <input 
                          type={showRegPass ? 'text' : 'password'} 
                          className="form-control" 
                          placeholder="Tối thiểu 8 ký tự" 
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary"
                          onClick={() => setShowRegPass(!showRegPass)}
                        >
                          {showRegPass ? 'Ẩn' : 'Hiện'}
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Xác nhận mật khẩu</label>
                      <div className="input-group">
                        <input 
                          type={showRegConfirmPass ? 'text' : 'password'} 
                          className="form-control" 
                          placeholder="Nhập lại mật khẩu" 
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          required
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary"
                          onClick={() => setShowRegConfirmPass(!showRegConfirmPass)}
                        >
                          {showRegConfirmPass ? 'Ẩn' : 'Hiện'}
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="form-check mb-2">
                        <input type="checkbox" className="form-check-input" id="modalAgreeData" required />
                        <label className="form-check-label small text-muted" htmlFor="modalAgreeData">
                          Tôi xác nhận đã đọc, hiểu rõ và tự nguyện đồng ý với Chính Sách Bảo Vệ Dữ Liệu Cá Nhân.
                        </label>
                      </div>
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="modalAgreeElig" required />
                        <label className="form-check-label small fw-semibold" htmlFor="modalAgreeElig">
                          Tôi tự xác định thuộc đối tượng mua Nhà Ở Xã Hội và xin chịu trách nhiệm trước pháp luật.
                        </label>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-emerald w-100 btn-lg" disabled={isLoading}>
                      {isLoading ? 'Đang Đăng Ký...' : 'Đăng Ký'}
                    </button>
                  </div>
                )}

                <p className="text-center small text-muted mt-3 mb-0">
                  Đã có tài khoản?{' '}
                  <a href="#" className="text-emerald fw-bold" onClick={(e) => { e.preventDefault(); switchTo('loginModal'); }}>
                    Đăng nhập
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay loading */}
      {isLoading && (
        <div id="authLoadingOverlay" className="auth-loading-overlay">
          <div className="bg-white rounded-3 shadow text-center p-4" style={{ maxWidth: '280px' }}>
            <div className="spinner-border text-success mx-auto mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Đang xử lý...</span>
            </div>
            <div className="fw-semibold">Đang tạo tài khoản...</div>
            <div className="small text-muted mt-1">Vui lòng đợi trong giây lát.</div>
          </div>
        </div>
      )}
    </>
  );
}
