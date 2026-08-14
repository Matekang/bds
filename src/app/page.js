'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function HomePage() {
  // --- Countdown State ---
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [countdownExpired, setCountdownExpired] = useState(false);
  const [deadline, setDeadline] = useState('2026-08-20T17:00:00.000Z');

  // --- Location Tabs ---
  const [activeLocTab, setActiveLocTab] = useState('noikhu');

  // --- Amenities Hover ---
  const [activeAmenTab, setActiveAmenTab] = useState('noikhu');
  const [activeAmenImg, setActiveAmenImg] = useState({
    noikhu: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/2%20s%E1%BA%A3nh%20%C4%91%C3%B3n.jpg',
    ngoaikhu: 'https://marinaliving.vn/images/TI%E1%BB%82N%20%C3%8DCH%20NGO%E1%BA%A0I%20KHU/SIS%20Halong.jpg'
  });
  const [activeAmenItem, setActiveAmenItem] = useState({
    noikhu: '2 sảnh đón mỗi tòa',
    ngoaikhu: 'Trường quốc tế Singapore SIS'
  });

  // --- Floorplan State ---
  const [activeFloor, setActiveFloor] = useState(1);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [session, setSession] = useState(null);

  // --- Creators State ---
  const [activeCreatorIdx, setActiveCreatorIdx] = useState(0);

  // Fallback image helper
  const handleImageError = (e, fallbackUrl) => {
    if (e.target.src !== fallbackUrl) {
      e.target.src = fallbackUrl;
    }
  };

  // --- Fetch Settings, Session, and Initial Units ---
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings?.countdownDeadline) {
          setDeadline(data.settings.countdownDeadline);
        }
      })
      .catch(console.error);

    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.success) {
          setSession(data.session);
        }
      })
      .catch(console.error);

    fetchUnits(1);
  }, []);

  const fetchUnits = (floorNum) => {
    fetch(`/api/units?floor=${floorNum}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUnits(data.units);
        }
      })
      .catch(console.error);
  };

  const handleFloorChange = (floorNum) => {
    setActiveFloor(floorNum);
    setSelectedUnit(null);
    fetchUnits(floorNum);
  };

  const handleReserve = async (unit) => {
    if (!session) {
      alert('Vui lòng Đăng nhập hệ thống để thực hiện đặt giữ chỗ căn hộ.');
      const btn = document.querySelector('.brand-login');
      if (btn) btn.click();
      return;
    }

    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: unit.id })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(data.message);
        fetchUnits(activeFloor);
        setSelectedUnit(null);
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Đã xảy ra lỗi kết nối.');
    }
  };

  // --- Countdown Logic ---
  useEffect(() => {
    const targetDate = new Date(deadline).getTime();
    
    const tick = () => {
      const diff = targetDate - Date.now();
      if (diff <= 0) {
        setCountdownExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      
      setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
      setCountdownExpired(false);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  // --- Drag & Wheel Scroll ---
  const locScrollRef = useRef(null);
  const creatorScrollRef = useRef(null);

  const scrollLocLeft = () => {
    if (locScrollRef.current) {
      locScrollRef.current.scrollBy({ left: -380, behavior: 'smooth' });
    }
  };

  const scrollLocRight = () => {
    if (locScrollRef.current) {
      locScrollRef.current.scrollBy({ left: 380, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const box = locScrollRef.current;
    if (!box) return;

    let isPointerDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onPointerDown = (e) => {
      isPointerDown = true;
      try {
        box.setPointerCapture(e.pointerId);
      } catch (err) {}
      startX = e.clientX;
      scrollLeft = box.scrollLeft;
      box.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
      if (!isPointerDown) return;
      e.preventDefault();
      const dx = (e.clientX - startX) * 1.8;
      box.scrollLeft = scrollLeft - dx;
    };

    const onPointerUp = (e) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      try {
        box.releasePointerCapture(e.pointerId);
      } catch (err) {}
      box.style.cursor = 'grab';
    };

    const onWheel = (e) => {
      if (e.deltaY !== 0) {
        box.scrollLeft += e.deltaY;
      }
    };

    const onDragStart = (e) => e.preventDefault();

    box.addEventListener('pointerdown', onPointerDown);
    box.addEventListener('pointermove', onPointerMove);
    box.addEventListener('pointerup', onPointerUp);
    box.addEventListener('pointercancel', onPointerUp);
    box.addEventListener('dragstart', onDragStart);
    box.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      box.removeEventListener('pointerdown', onPointerDown);
      box.removeEventListener('pointermove', onPointerMove);
      box.removeEventListener('pointerup', onPointerUp);
      box.removeEventListener('pointercancel', onPointerUp);
      box.removeEventListener('dragstart', onDragStart);
      box.removeEventListener('wheel', onWheel);
    };
  }, [activeLocTab]);

  return (
    <>
      {/* 1. HERO + COUNTDOWN + STATS */}
      <section id="hero" className="hero">
        <div className="container">
          <div className="row align-items-center gy-4">
            <div className="col-lg-6">
              <h1 className="mb-3">MARINA LIVING HALONG</h1>
              <p className="lead mb-4">
                Dự án đầu tiên thuộc dòng sản phẩm nhà ở xã hội Marina Living do BIM Land phát triển, 
                nơi mỗi mái nhà trở thành điểm khởi đầu cho cuộc sống ổn định, an tâm và tương lai tươi sáng.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <a href="javascript:void(0)" className="btn btn-gold btn-lg text-decoration-none" data-bs-toggle="modal" data-bs-target="#registerModal">
                  Đăng ký ngay ➜
                </a>
              </div>
            </div>
            
            <div className="col-lg-6">
              <div className="countdown-box">
                <div className="mb-2 fw-semibold">Hạn nộp hồ sơ Đợt 1</div>
                {countdownExpired ? (
                  <div className="alert alert-warning py-2 mb-3">Đã hết hạn nộp hồ sơ.</div>
                ) : (
                  <div id="countdown" className="d-flex gap-3 justify-content-between mb-3">
                    <div className="cd-block"><div className="num">{String(timeLeft.days).padStart(2, '0')}</div><div className="lbl">Ngày</div></div>
                    <div className="cd-block"><div className="num">{String(timeLeft.hours).padStart(2, '0')}</div><div className="lbl">Giờ</div></div>
                    <div className="cd-block"><div className="num">{String(timeLeft.minutes).padStart(2, '0')}</div><div className="lbl">Phút</div></div>
                    <div className="cd-block"><div className="num">{String(timeLeft.seconds).padStart(2, '0')}</div><div className="lbl">Giây</div></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TỔNG QUAN DỰ ÁN */}
      <section id="tongquan" className="bg-cream">
        <div className="container">
          <div className="row gy-5">
            <div className="col-lg-8">
              <h2 className="v2-title text-center text-lg-start">NƠI MỖI MÁI NHÀ MỞ RA MỘT TƯƠNG LAI VỮNG VÀNG HƠN</h2>
              <p className="v2-overview-lead text-muted mb-0">
                Hơn cả một nơi an cư, Marina Living kiến tạo tổ ấm bền vững với môi trường sống chất lượng và những giá trị sống trọn vẹn.
                Là dự án nhà ở xã hội kiểu mẫu được phát triển tại Khu đô thị vịnh biển Halong Marina, dự án thừa hưởng hạ tầng đồng bộ,
                hiện đại cùng hệ tiện ích đã hiện hữu. Được quy hoạch theo định hướng nâng cao chất lượng sống, Marina Living mang đến
                không gian an cư xanh, tiện nghi, nơi cư dân tận hưởng môi trường sống trong lành bên Vịnh Di sản.
              </p>

              <div className="v2-facts mt-4">
                <div className="v2-fact">
                  <div className="v2-fact-value">18.316,45 m²</div>
                  <div className="v2-fact-label">Quy mô dự án</div>
                </div>
                <div className="v2-fact">
                  <div className="v2-fact-value">30 tầng nổi - 2 hầm</div>
                  <div className="v2-fact-label">Số tầng</div>
                </div>
                <div className="v2-fact">
                  <div className="v2-fact-value">2093 căn hộ</div>
                  <div className="v2-fact-label">Studio-1PN-2PN-3PN</div>
                </div>
                <div className="v2-fact">
                  <div className="v2-fact-value">16</div>
                  <div className="v2-fact-label">Thang máy/tòa</div>
                </div>
                <div className="v2-fact">
                  <div className="v2-fact-value">45.33%</div>
                  <div className="v2-fact-label">Mật độ xây dựng</div>
                </div>
                <div className="v2-fact">
                  <div className="v2-fact-value">Đất ở lâu dài</div>
                  <div className="v2-fact-label">Pháp lý</div>
                </div>
              </div>
            </div>

            <aside className="col-lg-4">
              <div className="vml-news">
                <div className="vml-news-tabs">
                  <span className="vml-news-tab is-active">Tin mới nhất</span>
                </div>
                <div className="vml-news-list">
                  <a className="vml-news-item" href="https://www.quangninh.gov.vn/So/soxaydung/Trang/ChiTietTinTuc.aspx?nid=5479" target="_blank" rel="noopener">
                    <span className="vml-news-thumb" style={{ backgroundImage: `url('https://marinaliving.vn/images/thietkehiendai.png'), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=400')` }}></span>
                    <span className="vml-news-info">
                      <span className="vml-news-title">Công khai giá bán nhà ở xã hội Marina Living Halong</span>
                      <span className="vml-news-meta">22/07/2026</span>
                    </span>
                  </a>
                  <a className="vml-news-item" href="https://baoquangninh.vn/bim-land-cong-bo-thong-tin-du-an-nha-o-xa-hoi-marina-living-halong-3415665.html" target="_blank" rel="noopener">
                    <span className="vml-news-thumb" style={{ backgroundImage: `url('https://marinaliving.vn/images/thietkehiendai.png'), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=400')` }}></span>
                    <span className="vml-news-info">
                      <span className="vml-news-title">BIM Land công bố thông tin dự án nhà ở xã hội Marina Living Halong</span>
                      <span className="vml-news-meta">20/07/2026</span>
                    </span>
                  </a>
                  <a className="vml-news-item" href="https://www.quangninh.gov.vn/So/soxaydung/Trang/ChiTietTinTuc.aspx?nid=5433" target="_blank" rel="noopener">
                    <span className="vml-news-thumb" style={{ backgroundImage: `url('https://marinaliving.vn/images/khonggianmo.jpeg'), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400')` }}></span>
                    <span className="vml-news-info">
                      <span className="vml-news-title">Công bố thông tin dự án Khu nhà ở xã hội tại Đa giác 3, Khu đô thị dịch vụ Hùng Thắng</span>
                      <span className="vml-news-meta">16/06/2026</span>
                    </span>
                  </a>
                  <a className="vml-news-item" href="https://www.quangninh.gov.vn/So/soxaydung/Trang/ChiTietTinTuc.aspx?nid=5440" target="_blank" rel="noopener">
                    <span className="vml-news-thumb" style={{ backgroundImage: `url('https://marinaliving.vn/images/canhquanxanhtrungtam.png'), url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=400')` }}></span>
                    <span className="vml-news-info">
                      <span className="vml-news-title">Công khai thông tin về việc tiếp nhận hồ sơ đăng ký</span>
                      <span className="vml-news-meta">18/06/2026</span>
                    </span>
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* 2b. VỊ TRÍ KẾT NỐI */}
      <section id="vitri" style={{ background: '#dbedef', paddingTop: 0, paddingBottom: 0 }}>
        <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
          <img 
            src="https://marinaliving.vn/images/t%C3%B2a%20nh%C3%A0.jpg" 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
            alt="Vị trí kết nối Marina Living"
            onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1600')}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.65) 0%, rgba(0,0,0,.25) 45%, rgba(0,0,0,0) 100%)', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}>
            <div className="container v2-loc-banner-inner">
              <h2 className="v2-loc-banner-title">TÂM ĐIỂM KẾT NỐI<br />MỌI HÀNH TRÌNH</h2>
              <p className="v2-loc-banner-text">
                Tọa lạc tại Khu đô thị vịnh biển Halong Marina, Marina Living Halong sở hữu vị trí thuận tiện kết nối trung tâm Bãi Cháy cùng các trục giao thông huyết mạch. Dự án dễ dàng tiếp cận từ đường Hoàng Quốc Việt và cao tốc Hạ Long – Hải Phòng, đồng thời thừa hưởng hệ thống giáo dục, y tế, thương mại, dịch vụ, chợ truyền thống và các tiện ích giải trí hiện đại, mang đến cuộc sống tiện nghi với mọi nhu cầu trong tầm tay.
              </p>
            </div>
          </div>
        </div>

        <img 
          src="https://marinaliving.vn/images/marina%20living_location%20map.jpg" 
          className="v2-loc-map-img"
          alt="Location map" 
          onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=1200')}
        />

        <div className="v2-loc-fluid mt-3">
          <div className="v2-loc-wrap">
            <ul className="nav v2-loc-tabs" role="tablist">
              <li className="nav-item">
                <button className={`v2-loc-tab ${activeLocTab === 'noikhu' ? 'active' : ''}`} onClick={() => setActiveLocTab('noikhu')}>
                  <span className="v2-loc-tab-label">Kết nối nội khu</span>
                  <span className="v2-loc-chev" aria-hidden="true">›</span>
                </button>
              </li>
              <li className="nav-item">
                <button className={`v2-loc-tab ${activeLocTab === 'ngoaikhu' ? 'active' : ''}`} onClick={() => setActiveLocTab('ngoaikhu')}>
                  <span className="v2-loc-tab-label">Kết nối ngoại khu</span>
                  <span className="v2-loc-chev" aria-hidden="true">›</span>
                </button>
              </li>
              <li className="nav-item">
                <button className={`v2-loc-tab ${activeLocTab === 'vung' ? 'active' : ''}`} onClick={() => setActiveLocTab('vung')}>
                  <span className="v2-loc-tab-label">Kết nối vùng</span>
                  <span className="v2-loc-chev" aria-hidden="true">›</span>
                </button>
              </li>
            </ul>

            <div className="tab-content v2-loc-panes">
              <div className="tab-pane fade show active" role="tabpanel">
                <div className="v2-loc-scroll" ref={locScrollRef}>
                  {activeLocTab === 'noikhu' && (
                    <>
                      {[
                        { num: '02', name: 'Trường quốc tế Singapore SIS', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/1.sis%20halong.jpg' },
                        { num: '02', name: 'Hồ nhạc nước', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/2.%20h%E1%BB%93%20nh%E1%BA%A1c%20n%C6%B0%E1%BB%9Bc.jpg' },
                        { num: '02', name: 'Quảng trường biển', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/3.%20quang_truong_bien.png' },
                        { num: '02', name: 'InterContinental Halong Bay Resort', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/4.%20intercontinental_halong_bay_resort.jpg' },
                        { num: '02', name: 'Chã Small Village', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/5.%20Ch%C3%A3%20Small%20Village.jpg' },
                        { num: '02', name: 'Bến du thuyền', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/6.%20ben_du_thuyen.jpg' },
                        { num: '02', name: 'Mini Mart', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/7.%20Mini%20Mart.jpg' },
                        { num: '02', name: 'TTTM Lotte Mart Halong', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/8.lotte_mart.jpg' },
                        { num: '02', name: 'Công viên cảnh quan & sân thể thao', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/9.%20tennis.jpg' },
                        { num: '03', name: 'Cầu cảnh quan biểu tượng', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/10.%20cau_canh_quan.jpg' },
                        { num: '04', name: 'Nhà hàng Hồng Hạnh Signature', img: 'https://marinaliving.vn/images/1.k%E1%BA%BFt%20n%E1%BB%91i%20n%E1%BB%99i%20khu/11.%20Nh%C3%A0%20h%C3%A0ng%20H%E1%BB%93ng%20H%E1%BA%A1nh%20Signature.jpg' }
                      ].map((item, idx) => (
                        <article className="v2-loc-card" key={idx} style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,.8) 0%, rgba(0,0,0,0) 100%), url('${item.img}'), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800')` }}>
                          <div className="v2-loc-overlay">
                            <div className="v2-loc-time">
                              <span className="v2-loc-num">{item.num}</span>
                              <span className="v2-loc-unit">phút</span>
                            </div>
                            <h5 className="v2-loc-name">{item.name}</h5>
                          </div>
                        </article>
                      ))}
                    </>
                  )}

                  {activeLocTab === 'ngoaikhu' && (
                    <>
                      {[
                        { num: '04', name: 'Chợ truyền thống Cái Dăm', img: 'https://marinaliving.vn/images/2.K%E1%BA%BET%20N%E1%BB%90I%20NGO%E1%BA%A0I%20KHU/1.%20cho_cai_dam.png' },
                        { num: '10', name: 'AEON MALL Hạ Long', img: 'https://marinaliving.vn/images/2.K%E1%BA%BET%20N%E1%BB%90I%20NGO%E1%BA%A0I%20KHU/2.%20aeon_mall.png' },
                        { num: '10', name: 'Cảng tàu quốc tế', img: 'https://marinaliving.vn/images/2.K%E1%BA%BET%20N%E1%BB%90I%20NGO%E1%BA%A0I%20KHU/3.%20cang_tau.png' },
                        { num: '12', name: 'Cầu Bãi Cháy', img: 'https://marinaliving.vn/images/2.K%E1%BA%BET%20N%E1%BB%90I%20NGO%E1%BA%A0I%20KHU/4.%20cau_bai_chay.png' }
                      ].map((item, idx) => (
                        <article className="v2-loc-card" key={idx} style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,.8) 0%, rgba(0,0,0,0) 100%), url('${item.img}'), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800')` }}>
                          <div className="v2-loc-overlay">
                            <div className="v2-loc-time">
                              <span className="v2-loc-num">{item.num}</span>
                              <span className="v2-loc-unit">phút</span>
                            </div>
                            <h5 className="v2-loc-name">{item.name}</h5>
                          </div>
                        </article>
                      ))}
                    </>
                  )}

                  {activeLocTab === 'vung' && (
                    <>
                      {[
                        { num: '10', name: 'Vân Đồn', img: 'https://marinaliving.vn/images/3.K%E1%BA%BET%20N%E1%BB%90I%20V%C3%99NG/van_don.png' },
                        { num: '30', name: 'Hải Phòng', img: 'https://marinaliving.vn/images/3.K%E1%BA%BET%20N%E1%BB%90I%20V%C3%99NG/hai_phong.png' },
                        { num: '105', name: 'Hà Nội', img: 'https://marinaliving.vn/images/3.K%E1%BA%BET%20N%E1%BB%90I%20V%C3%99NG/hanoi.png' }
                      ].map((item, idx) => (
                        <article className="v2-loc-card" key={idx} style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,.8) 0%, rgba(0,0,0,0) 100%), url('${item.img}'), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800')` }}>
                          <div className="v2-loc-overlay">
                            <div className="v2-loc-time">
                              <span className="v2-loc-num">{item.num}</span>
                              <span className="v2-loc-unit">phút</span>
                            </div>
                            <h5 className="v2-loc-name">{item.name}</h5>
                          </div>
                        </article>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2c. TẦM NHÌN */}
      <section id="tamnhin">
        <div className="row g-0 align-items-center thietke-row">
          <div className="col-lg-5 d-flex align-items-center">
            <div className="thietke-content">
              <h2 className="v2-title mb-3">TẦM NHÌN RỘNG MỞ<br />ÔM TRỌN THIÊN NHIÊN &amp; ĐÔ THỊ</h2>
              <p className="v2-view-lead mb-3">
                Với đa dạng hướng nhìn, mỗi căn hộ tại Marina Living Halong đều đón trọn vẻ đẹp của thiên nhiên và đô thị, mang đến không gian sống khoáng đạt mỗi ngày.
              </p>
              <ul className="v2-view-list mb-0">
                <li>Hướng núi Hùng Thắng – Đón sắc xanh thiên nhiên.</li>
                <li>Hướng lõi nội khu – Ôm trọn cảnh quan xanh và tiện ích.</li>
                <li>Hướng bán đảo Halong Marina – Mở tầm nhìn hướng Vịnh Hạ Long.</li>
                <li>Hướng trục đô thị – Cảm nhận nhịp sống đô thị hiện đại.</li>
              </ul>
            </div>
          </div>
          <div className="col-lg-7">
            <div className="thietke-figure">
              <img 
                src="https://marinaliving.vn/images/NOXH-HungThang_TT-ZU.png" 
                alt="Phối cảnh tổng thể Marina Living Halong" 
                loading="lazy" 
                onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1200')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2d. SỐNG XANH */}
      <section id="songxanh">
        <div className="container">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="v2-title" style={{ margin: 0 }}>THIẾT KẾ CHUẨN MỰC</h2>
              <h4>Kiến tạo không gian xanh – kết nối – bền vững</h4>
              <p className="v2-overview-lead text-muted mx-auto mb-0 mt-3">
                Marina Living được BIM Land cùng các đối tác kinh nghiệm quốc tế phát triển với sự chỉnh chu trong quy hoạch và thiết kế, theo định hướng lấy cư dân làm trung tâm. Các mảng xanh rộng mở, hệ tiện ích thiết thực và các khu sinh hoạt cộng đồng được bố trí khoa học. Mỗi không gian đều hướng đến việc nâng cao chất lượng sống, khuyến khích kết nối giữa các thế hệ và mang đến môi trường an cư bền vững.
              </p>
            </div>
          </div>
        </div>
        <img 
          src="https://marinaliving.vn/images/green%20open%20space%201.png" 
          style={{ width: '100%' }} 
          alt="Green open space" 
          onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200')}
        />
      </section>

      {/* 2e. THIẾT KẾ ROW (4 HÀNG SO LE) */}
      <section id="thietke">
        <div className="row g-0 align-items-center thietke-row">
          <div className="col-lg-7">
            <div className="thietke-figure">
              <img 
                src="https://marinaliving.vn/images/thietkehiendai.78b1y8k3k6.png" 
                alt="Thiết kế hiện đại Marina Living Halong" 
                loading="lazy" 
                onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200')}
              />
            </div>
          </div>
          <div className="col-lg-5 d-flex align-items-center">
            <div className="thietke-content">
              <h2 className="v2-title mb-3">Thiết kế hiện đại<br />Tối ưu thẩm mỹ &amp; trải nghiệm</h2>
              <p className="v2-view-lead mb-0">
                Kiến trúc hiện đại kết hợp cùng cảnh quan xanh và vật liệu được lựa chọn đồng bộ,
                tạo nên diện mạo thanh lịch, hài hòa với cảnh quan bên Vịnh.
              </p>
            </div>
          </div>
        </div>

        <div className="row g-0 align-items-center thietke-row thietke-row--offset">
          <div className="col-lg-5 order-lg-1 order-2 d-flex align-items-center">
            <div className="thietke-content">
              <h2 className="v2-title mb-3">Không gian mở<br />Đón ánh sáng tự nhiên</h2>
              <p className="v2-view-lead mb-0">
                Các khối nhà được thiết kế tối ưu khoảng thoáng, tầm nhìn và khả năng lưu thông không khí.
                Ban công rộng thoáng cùng nhiều mặt tiếp xúc ánh sáng tự nhiên giúp mỗi căn hộ luôn tràn
                ngập ánh sáng, thoáng và dễ chịu.
              </p>
            </div>
          </div>
          <div className="col-lg-7 order-lg-2 order-1">
            <div className="thietke-figure">
              <img 
                src="https://marinaliving.vn/images/khonggianmo.v7i5bozlqk.jpeg" 
                alt="Không gian mở đón ánh sáng tự nhiên" 
                loading="lazy" 
                onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200')}
              />
            </div>
          </div>
        </div>

        <div className="row g-0 align-items-center thietke-row">
          <div className="col-lg-7">
            <div className="thietke-figure">
              <img 
                src="https://marinaliving.vn/images/sanhv1.png" 
                alt="ĐA DẠNG LOẠI HÌNH CĂN" 
                loading="lazy" 
                onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=1200')}
              />
            </div>
          </div>
          <div className="col-lg-5 d-flex align-items-center">
            <div className="thietke-content">
              <h2 className="v2-title mb-3">Đa dạng loại hình căn<br />Phù hợp mọi nhu cầu an cư</h2>
              <p className="v2-view-lead mb-0">
                Đa dạng từ studio đến căn hộ 1, 2 và 3 phòng ngủ, đáp ứng linh hoạt nhu cầu an cư. Mặt bằng vuông vắn, bố trí khoa học, tối ưu công năng cho cuộc sống tiện nghi mỗi ngày.
              </p>
            </div>
          </div>
        </div>

        <div className="row g-0 align-items-center thietke-row thietke-row--offset mb-5">
          <div className="col-lg-5 order-lg-1 order-2 d-flex align-items-center">
            <div className="thietke-content">
              <h2 className="v2-title mb-3">Cảnh quan xanh trung tâm<br />Trái tim kết nối cộng đồng</h2>
              <p className="v2-view-lead mb-0">
                Khoảng xanh nội khu vừa là điểm kết nối cộng đồng, vừa mang đến môi trường sống trong lành và thư thái mỗi ngày.
              </p>
            </div>
          </div>
          <div className="col-lg-7 order-lg-2 order-1">
            <div className="thietke-figure">
              <img 
                src="https://marinaliving.vn/images/canhquanxanhtrungtam.png" 
                alt="Cảnh quan xanh trung tâm" 
                loading="lazy" 
                onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. MẶT BẰNG CĂN HỘ (LAYOUT SPLIT GỐC + BẢNG HÀNG TƯƠNG TÁC) */}
      <section id="matbang" className="v2-section-shell v2-floorplan-section">
        <div className="v2-floorplan-split" id="floorplanCarousel">
          <div className="v2-fp-left">
            <div className="v2-fp-inner">
              <h2 className="v2-fp-name">Tòa B</h2>
              <div className="v2-fp-thumb">
                <img 
                  src="https://marinaliving.vn/images/thietkehiendai.png" 
                  alt="Mặt bằng tầng điển hình" 
                  loading="lazy" 
                  onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800')}
                />
              </div>
              <div className="v2-fp-nav">
                <button type="button" className="v2-fp-arrow" aria-label="Xem tòa trước">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 6 9 12 15 18" /></svg>
                </button>
                <button type="button" className="v2-fp-arrow" aria-label="Xem tòa kế tiếp">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18" /></svg>
                </button>
              </div>
            </div>
          </div>

          <div className="v2-fp-right">
            <img 
              src="https://marinaliving.vn/images/NOXH-HungThang_TT-ZU.png" 
              alt="Phối cảnh tòa nhà" 
              loading="lazy" 
              onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1200')}
            />
            <button type="button" className="v2-fp-badge" data-bs-toggle="modal" data-bs-target="#floorplanModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M3 9h6" /></svg>
              <span>MẶT BẰNG TÒA B</span>
              <svg className="v2-fp-badge-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
            </button>
          </div>
        </div>

        {/* BẢNG HÀNG TRỰC TUYẾN ĐẶT CĂN */}
        <div className="container py-5">
          <div className="text-center mb-4">
            <span className="v2-kicker">Hệ thống đặt chỗ trực tuyến</span>
            <h3 className="v2-title mt-2 mb-1">BẢNG HÀNG THỜI GIAN THỰC - TÒA B</h3>
            <p className="text-muted">Chọn tầng và click vào căn hộ để kiểm tra trạng thái hoặc đặt giữ chỗ trực tuyến.</p>
          </div>

          <div className="row gy-4">
            <div className="col-lg-4">
              <div className="p-4 bg-white border rounded-4 shadow-sm">
                <label className="form-label fw-bold text-dark">Chọn tầng xem căn hộ:</label>
                <select 
                  className="form-select form-select-lg border-success border-opacity-25 mb-4" 
                  value={activeFloor}
                  onChange={(e) => handleFloorChange(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map(f => (
                    <option key={f} value={f}>Tầng {f}</option>
                  ))}
                </select>

                <div className="d-flex flex-column gap-2 small">
                  <div className="d-flex justify-content-between p-2 rounded bg-success bg-opacity-10">
                    <span>🟢 Căn trống:</span> <strong className="text-success">Khả dụng đặt giữ chỗ</strong>
                  </div>
                  <div className="d-flex justify-content-between p-2 rounded bg-warning bg-opacity-10">
                    <span>🟡 Giữ chỗ:</span> <strong className="text-warning">Đã có người đặt chỗ</strong>
                  </div>
                  <div className="d-flex justify-content-between p-2 rounded bg-secondary bg-opacity-10">
                    <span>⚪ Đã bán:</span> <strong className="text-secondary">Đã hoàn tất HĐMB</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="p-4 bg-white border rounded-4 shadow-sm">
                <h5 className="fw-bold text-emerald mb-3">Danh Sách Căn Hộ Tầng {activeFloor}</h5>
                <div className="row g-3">
                  {units.map((unit) => (
                    <div className="col-6 col-sm-4" key={unit.id}>
                      <div 
                        className={`card border cursor-pointer lift ${
                          unit.status === 'sold' ? 'bg-light border-secondary opacity-75' :
                          unit.status === 'reserved' ? 'border-warning bg-warning bg-opacity-10' :
                          'border-success bg-success bg-opacity-10'
                        } ${selectedUnit?.id === unit.id ? 'border-primary border-3' : ''}`}
                        onClick={() => setSelectedUnit(unit)}
                        style={{ borderRadius: '12px' }}
                      >
                        <div className="card-body p-3 text-center">
                          <h6 className="fw-bold mb-1 text-dark">{unit.roomNumber}</h6>
                          <div className="small text-muted" style={{ fontSize: '0.78rem' }}>
                            {unit.type} • {unit.area} m²
                          </div>
                          <span className={`badge mt-2 px-2.5 py-1 ${
                            unit.status === 'sold' ? 'bg-secondary' :
                            unit.status === 'reserved' ? 'bg-warning text-dark' : 'bg-success'
                          }`}>
                            {unit.status === 'sold' ? 'Đã bán' :
                             unit.status === 'reserved' ? 'Giữ chỗ' : 'Còn trống'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedUnit && (
                  <div className="mt-4 p-3 border rounded-3 bg-light">
                    <h6 className="fw-bold text-emerald mb-2">Chi tiết Căn hộ {selectedUnit.roomNumber}</h6>
                    <div className="row g-2 small mb-3">
                      <div className="col-6">Tòa nhà: <strong>Tòa B</strong></div>
                      <div className="col-6">Tầng: <strong>{selectedUnit.floor}</strong></div>
                      <div className="col-6">Diện tích: <strong>{selectedUnit.area} m²</strong></div>
                      <div className="col-6">Loại căn: <strong>{selectedUnit.type}</strong></div>
                    </div>

                    {selectedUnit.status === 'sold' ? (
                      <button className="btn btn-secondary btn-sm w-100 rounded-2" disabled>Căn hộ này đã bán</button>
                    ) : (
                      <button 
                        className={`btn ${selectedUnit.status === 'reserved' ? 'btn-danger' : 'btn-emerald'} btn-sm w-100 rounded-2 py-2`}
                        onClick={() => handleReserve(selectedUnit)}
                      >
                        {selectedUnit.status === 'reserved' 
                          ? (selectedUnit.reservedByUserId === session?.userId ? '❌ Hủy Đặt Giữ Chỗ' : 'Đã Có Khách Đặt Giữ Chỗ')
                          : '⚡ Đăng Ký Giữ Chỗ Căn Hộ'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TIỆN ÍCH */}
      <section id="tienich" className="bg-cream">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="v2-title">TIỆN ÍCH ĐA DẠNG <br />TRỌN VẸN TRẢI NGHIỆM</h2>
          </div>

          <div className="v2-amen">
            <div className="v2-amen-tabs" role="tablist">
              <button 
                className={`v2-amen-tab ${activeAmenTab === 'noikhu' ? 'active' : ''}`}
                onClick={() => { setActiveAmenTab('noikhu'); setActiveAmenImg(prev => ({ ...prev, noikhu: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/2%20s%E1%BA%A3nh%20%C4%91%C3%B3n.jpg' })); }}
              >
                Nội khu
              </button>
              <button 
                className={`v2-amen-tab ${activeAmenTab === 'ngoaikhu' ? 'active' : ''}`}
                onClick={() => { setActiveAmenTab('ngoaikhu'); setActiveAmenImg(prev => ({ ...prev, ngoaikhu: 'https://marinaliving.vn/images/TI%E1%BB%82N%20%C3%8DCH%20NGO%E1%BA%A0I%20KHU/SIS%20Halong.jpg' })); }}
              >
                Ngoại khu
              </button>
            </div>

            <div className={`v2-amen-pane ${activeAmenTab === 'noikhu' ? 'active' : ''}`}>
              <ul className="v2-amen-list">
                {[
                  { label: '2 sảnh đón mỗi tòa', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/2%20s%E1%BA%A3nh%20%C4%91%C3%B3n.jpg' },
                  { label: 'Vườn thư giãn', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/V%C6%B0%E1%BB%9Dn%20th%C6%B0%20gi%C3%A3n.jpg' },
                  { label: 'Mini Plaza', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/Mini%20Plaza.jpg' },
                  { label: 'Vườn cờ', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/v%C6%B0%E1%BB%9Dn%20c%E1%BB%9D.png' },
                  { label: 'Dãy shop thương mại', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/D%C3%A3y%20shop%20th%C6%B0%C6%A1ng%20m%E1%BA%A1i.png' },
                  { label: 'Hồ bơi ngoài trời', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/H%E1%BB%93%20b%C6%A1i%20ngo%C3%A0i%20tr%E1%BB%9Di.jpg' },
                  { label: 'Hồ bơi trẻ em', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/h%E1%BB%93%20b%C6%A1i%20tr%E1%BA%BB%20em.jpg' },
                  { label: 'Sân chơi cho trẻ em', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/S%C3%A2n%20ch%C6%A1i%20cho%20tr%E1%BA%BB%20em.jpg' },
                  { label: 'Bãi cỏ đa năng', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/b%C3%A3i%20c%E1%BB%8F%20%C4%91a%20n%C4%83ng.jpg' },
                  { label: 'Vườn nướng BBQ', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/V%C6%B0%E1%BB%9Dn%20n%C6%B0%E1%BB%9Bng%20BBQ.jpg' },
                  { label: 'Khu thể thao ngoài trời', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/Khu%20th%E1%BB%83%20thao%20ngo%C3%A0i%20tr%E1%BB%9Di.png' },
                  { label: 'Đường dạo bộ nội khu', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/%C4%90%C6%B0%E1%BB%9Dng%20d%E1%BA%A1o%20b%E1%BB%99%20n%E1%BB%99i%20khu.jpg' },
                  { label: 'Khu vui chơi trẻ em', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/khu%20vui%20ch%C6%A1i%20tr%E1%BA%BB%20em.jpg' },
                  { label: 'Thư viện', img: 'https://marinaliving.vn/images/13.TI%E1%BB%82N%20%C3%8DCH%20N%E1%BB%99I%20KHU/th%C6%B0%20vi%E1%BB%87n.png' }
                ].map((item, idx) => (
                  <li className={`v2-amen-item ${activeAmenItem.noikhu === item.label ? 'active' : ''}`} key={idx}>
                    <button 
                      type="button" 
                      onMouseEnter={() => {
                        setActiveAmenImg(prev => ({ ...prev, noikhu: item.img }));
                        setActiveAmenItem(prev => ({ ...prev, noikhu: item.label }));
                      }}
                    >
                      {item.label}
                    </button>
                    <span className="v2-amen-ul" aria-hidden="true"></span>
                  </li>
                ))}
              </ul>
              <div className="v2-amen-divider" aria-hidden="true"></div>
              <div className="v2-amen-figure">
                <img 
                  src={activeAmenImg.noikhu} 
                  alt="Tiện ích nội khu" 
                  loading="lazy" 
                  onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200')}
                />
              </div>
            </div>

            <div className={`v2-amen-pane ${activeAmenTab === 'ngoaikhu' ? 'active' : ''}`}>
              <ul className="v2-amen-list">
                {[
                  { label: 'Phố đi bộ', img: 'https://marinaliving.vn/images/TI%E1%BB%82N%20%C3%8DCH%20NGO%E1%BA%A0I%20KHU/Ph%E1%BB%91%20%C4%91i%20b%E1%BB%99.jpg' },
                  { label: 'Cầu cảnh quan biểu tượng', img: 'https://marinaliving.vn/images/TI%E1%BB%82N%20%C3%8DCH%20NGO%E1%BA%A0I%20KHU/c%E1%BA%A7u%20c%E1%BA%A3nh%20quan.jpg' },
                  { label: 'Nhà hàng Hồng Hạnh Signature', img: 'https://marinaliving.vn/images/TI%E1%BB%82N%20%C3%8DCH%20NGO%E1%BA%A0I%20KHU/H%E1%BB%93ng%20H%E1%BA%A1nh%202.jpg' },
                  { label: 'CLB giải trí ven biển Sailing Club', img: 'https://marinaliving.vn/images/TI%E1%BB%82N%20%C3%8DCH%20NGO%E1%BA%A0I%20KHU/Sailing%20Club.png' }
                ].map((item, idx) => (
                  <li className={`v2-amen-item ${activeAmenItem.ngoaikhu === item.label ? 'active' : ''}`} key={idx}>
                    <button 
                      type="button" 
                      onMouseEnter={() => {
                        setActiveAmenImg(prev => ({ ...prev, ngoaikhu: item.img }));
                        setActiveAmenItem(prev => ({ ...prev, ngoaikhu: item.label }));
                      }}
                    >
                      {item.label}
                    </button>
                    <span className="v2-amen-ul" aria-hidden="true"></span>
                  </li>
                ))}
              </ul>
              <div className="v2-amen-divider" aria-hidden="true"></div>
              <div className="v2-amen-figure">
                <img 
                  src={activeAmenImg.ngoaikhu} 
                  alt="Tiện ích ngoại khu" 
                  loading="lazy" 
                  onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200')}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4b. ĐƠN VỊ KIẾN TẠO */}
      <section id="donvi" className="v2-partners-section">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="v2-title">ĐỘI NGŨ KIẾN TẠO</h2>
          </div>

          <div className="v2-creators">
            <div className="v2-creator-tabs" role="tablist">
              {[
                { name: 'BIM Land', role: 'Đơn vị phát triển' },
                { name: 'Kiến Trúc Việt', role: 'Tư vấn thiết kế kiến trúc' },
                { name: 'Vertical Studio', role: 'Tư vấn thiết kế cảnh quan' },
                { name: 'EWD & Partners', role: 'Tư vấn thiết kế nội thất' }
              ].map((c, idx) => (
                <button 
                  type="button" 
                  key={idx}
                  className={`v2-creator-tab ${activeCreatorIdx === idx ? 'active' : ''}`}
                  onClick={() => setActiveCreatorIdx(idx)}
                >
                  <span className="v2-creator-tab-name">{c.name}</span>
                  <span className="v2-creator-tab-role">{c.role}</span>
                </button>
              ))}
            </div>

            <div className="v2-creator-panel active">
              {activeCreatorIdx === 0 && (
                <>
                  <div className="v2-creator-role">Đơn vị phát triển</div>
                  <div className="v2-creator-main">
                    <div className="v2-creator-logo">
                      <img 
                        src="https://marinaliving.vn/images/Logo%20BIMLAND%20-%20Green.png" 
                        style={{ width: '100%' }} 
                        alt="BIM Land" 
                        onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=400')}
                      />
                    </div>
                    <div className="v2-creator-desc">
                      <p>Là thành viên Tập đoàn BIM, xếp thứ 3 Top 10 doanh nghiệp bất động sản hàng đầu Việt Nam, BIM Land mang theo 31 năm kinh nghiệm kiến tạo các điểm đến tích hợp – nơi quy hoạch, sản phẩm, tiện ích, dịch vụ và vận hành được kết nối hài hòa, tạo nên những không gian sống, nghỉ dưỡng, thương mại và giải trí mang chuẩn mực toàn cầu, tôn vinh bản sắc địa phương và đem lại giá trị lâu dài cho cộng đồng.</p>
                      <p>Với uy tín và kinh nghiệm phát triển những tổ hợp nghỉ dưỡng cao cấp, BIM Land là đối tác chiến lược của các tập đoàn quản lý khách sạn hàng đầu thế giới: IHG – InterContinental Hotels Group, Hyatt, Sailing Club Leisure Group, The Ascott Limited, Frasers Hospitality…</p>
                    </div>
                  </div>

                  <div className="v2-creator-projects" ref={creatorScrollRef}>
                    <figure className="v2-creator-project">
                      <div className="v2-creator-project-img" style={{ backgroundImage: `url('https://marinaliving.vn/images/d%E1%BB%B1%20%C3%A1n%20ti%C3%AAu%20bi%E1%BB%83u%20bim/1.%20park%20hyatt%20phu%20quoc.jpg'), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=600')` }}></div>
                      <figcaption>Park Hyatt Phu Quoc</figcaption>
                    </figure>
                    <figure className="v2-creator-project">
                      <div className="v2-creator-project-img" style={{ backgroundImage: `url('https://marinaliving.vn/images/d%E1%BB%B1%20%C3%A1n%20ti%C3%AAu%20bi%E1%BB%83u%20bim/2.%20InterContinental%20Phu%20Quoc%20Long%20Beach%20Resort.jpg'), url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600')` }}></div>
                      <figcaption>InterContinental Phu Quoc Long Beach Resort</figcaption>
                    </figure>
                    <figure className="v2-creator-project">
                      <div className="v2-creator-project-img" style={{ backgroundImage: `url('https://marinaliving.vn/images/d%E1%BB%B1%20%C3%A1n%20ti%C3%AAu%20bi%E1%BB%83u%20bim/3.%20InterContinental%20Halong%20Bay%20Resort_FN.jpg'), url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600')` }}></div>
                      <figcaption>InterContinental Halong Bay Resort</figcaption>
                    </figure>
                    <figure className="v2-creator-project">
                      <div className="v2-creator-project-img" style={{ backgroundImage: `url('https://marinaliving.vn/images/d%E1%BB%B1%20%C3%A1n%20ti%C3%AAu%20bi%E1%BB%83u%20bim/4.grand.jpg'), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600')` }}></div>
                      <figcaption>Grand Bay Halong</figcaption>
                    </figure>
                    <figure className="v2-creator-project">
                      <div className="v2-creator-project-img" style={{ backgroundImage: `url('https://marinaliving.vn/images/d%E1%BB%B1%20%C3%A1n%20ti%C3%AAu%20bi%E1%BB%83u%20bim/5.%20Citadines%20Marina%20Halong.JPG'), url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600')` }}></div>
                      <figcaption>Citadines Marina Halong</figcaption>
                    </figure>
                  </div>
                </>
              )}

              {activeCreatorIdx === 1 && (
                <>
                  <div className="v2-creator-role">Tư vấn thiết kế kiến trúc</div>
                  <div className="v2-creator-main">
                    <div className="v2-creator-logo">
                      <img 
                        src="https://marinaliving.vn/images/logo_kientao/ki%E1%BA%BFn%20tr%C3%BAc%20vi%E1%BB%87t%20logo.png" 
                        style={{ width: '100%' }} 
                        alt="Kiến Trúc Việt" 
                        onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=400')}
                      />
                    </div>
                    <div className="v2-creator-desc">
                      <p>Kiến Trúc Việt là một trong những đơn vị tư vấn thiết kế uy tín tại Việt Nam với hơn 20 năm kinh nghiệm, hoạt động trong các lĩnh vực quy hoạch, kiến trúc, nội thất, cảnh quan và hạ tầng kỹ thuật.</p>
                      <p>Với đội ngũ hơn 250 nhân sự và hơn 800 dự án đã triển khai, Kiến Trúc Việt khẳng định năng lực qua nhiều công trình tiêu biểu như Vinhomes Green Bay Mễ Trì, Vinhomes Grand Park, Sol Forest...</p>
                    </div>
                  </div>
                </>
              )}

              {activeCreatorIdx === 2 && (
                <>
                  <div className="v2-creator-role">Tư vấn thiết kế cảnh quan</div>
                  <div className="v2-creator-main">
                    <div className="v2-creator-logo">
                      <img 
                        src="https://marinaliving.vn/images/logo_kientao/vertical%20studio.jpg" 
                        style={{ width: '100%' }} 
                        alt="Vertical Studio" 
                        onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=400')}
                      />
                    </div>
                    <div className="v2-creator-desc">
                      <p>Vertical Studio là công ty thiết kế quốc tế hiện diện tại Việt Nam và Hồng Kông, chuyên về quy hoạch tổng thể, thiết kế Kiến trúc, Nội thất và Cảnh quan.</p>
                      <p>Đề cao sự kết nối và hợp tác cùng các chuyên gia thiết kế hàng đầu từ Úc và nhiều quốc gia, Vertical Studio tích hợp các giá trị thẩm mỹ chuẩn quốc tế vào dự án.</p>
                    </div>
                  </div>
                </>
              )}

              {activeCreatorIdx === 3 && (
                <>
                  <div className="v2-creator-role">Tư vấn thiết kế nội thất</div>
                  <div className="v2-creator-main">
                    <div className="v2-creator-logo">
                      <img 
                        src="https://marinaliving.vn/images/logo_kientao/EWD%20LOGO2.jpg" 
                        style={{ width: '100%' }} 
                        alt="EWD & Partners" 
                        onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=400')}
                      />
                    </div>
                    <div className="v2-creator-desc">
                      <p>Là công ty được thành lập với đội ngũ nhân sự có hơn 20 năm kinh nghiệm thiết kế cho các hệ thống khách sạn, tổ hợp nghỉ dưỡng như Vinpearl Phú Quốc, Vinpearl Nha Trang...</p>
                      <p>Hiển nay đơn vị tư vấn EWD & Partners đang triển khai các dự án nổi bật như Vinhomes Bắc Giang, Resort Cửa Tùng 2...</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4c. TIN TỨC */}
      <section id="tintuc">
        <div className="container">
          <div className="v2-news-head text-center">
            <h2 className="v2-title">Tin tức</h2>
            <p className="text-muted mb-0">Cập nhật những thông tin mới nhất về Marina Living Halong và khu đô thị Halong Marina</p>
          </div>

          <div className="v2-news-grid">
            <article className="v2-news-card">
              <div className="v2-news-thumb" style={{ backgroundImage: `url('https://marinaliving.vn/images/thietkehiendai.png'), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=600')` }}></div>
              <div className="v2-news-body">
                <div className="v2-news-meta">
                  <span className="v2-news-date">22/07/2026</span>
                  <span className="v2-news-chip">Cổng thông tin điện tử Sở Xây Dựng</span>
                </div>
                <h3 className="v2-news-title">Công khai giá bán nhà ở xã hội Marina Living Halong</h3>
                <p className="v2-news-excerpt">Công khai giá bán nhà ở xã hội tại Đa giác 3, Khu đô thị dịch vụ Hùng Thắng, phường Bãi Cháy, tỉnh Quảng Ninh</p>
                <a className="v2-news-more" href="https://www.quangninh.gov.vn/So/soxaydung/Trang/ChiTietTinTuc.aspx?nid=5479" target="_blank" rel="noopener">ĐỌC THÊM →</a>
              </div>
            </article>

            <article className="v2-news-card">
              <div className="v2-news-thumb" style={{ backgroundImage: `url('https://marinaliving.vn/images/thietkehiendai.png'), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=600')` }}></div>
              <div className="v2-news-body">
                <div className="v2-news-meta">
                  <span className="v2-news-date">20/07/2026</span>
                  <span className="v2-news-chip">Báo Quảng Ninh</span>
                </div>
                <h3 className="v2-news-title">BIM Land công bố thông tin dự án nhà ở xã hội Marina Living Halong</h3>
                <p className="v2-news-excerpt">Dự án Marina Living Halong tại phường Bãi Cháy dự kiến cung cấp 2.093 căn nhà ở xã hội, góp phần bổ sung nguồn cung...</p>
                <a className="v2-news-more" href="https://baoquangninh.vn/bim-land-cong-bo-thong-tin-du-an-nha-o-xa-hoi-marina-living-halong-3415665.html" target="_blank" rel="noopener">ĐỌC THÊM →</a>
              </div>
            </article>

            <article className="v2-news-card">
              <div className="v2-news-thumb" style={{ backgroundImage: `url('https://marinaliving.vn/images/khonggianmo.jpeg'), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600')` }}></div>
              <div className="v2-news-body">
                <div className="v2-news-meta">
                  <span className="v2-news-date">16/06/2026</span>
                  <span className="v2-news-chip">Cổng thông tin điện tử Sở Xây Dựng</span>
                </div>
                <h3 className="v2-news-title">Công bố thông tin dự án Khu nhà ở xã hội tại Đa giác 3, Khu đô thị dịch vụ Hùng Thắng</h3>
                <p className="v2-news-excerpt">Công bố thông tin dự án Khu nhà ở xã hội tại Đa giác 3, Khu đô thị dịch vụ Hùng Thắng, phường Bãi Cháy, tỉnh Quảng Ninh</p>
                <a className="v2-news-more" href="https://www.quangninh.gov.vn/So/soxaydung/Trang/ChiTietTinTuc.aspx?nid=5433" target="_blank" rel="noopener">ĐỌC THÊM →</a>
              </div>
            </article>

            <article className="v2-news-card">
              <div className="v2-news-thumb" style={{ backgroundImage: `url('https://marinaliving.vn/images/canhquanxanhtrungtam.png'), url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600')` }}></div>
              <div className="v2-news-body">
                <div className="v2-news-meta">
                  <span className="v2-news-date">18/06/2026</span>
                  <span className="v2-news-chip">Cổng thông tin điện tử Sở Xây Dựng</span>
                </div>
                <h3 className="v2-news-title">Công khai thông tin về việc tiếp nhận hồ sơ đăng ký</h3>
                <p className="v2-news-excerpt">Công khai thông tin về việc tiếp nhận hồ sơ đăng ký mua nhà ở xã hội thuộc dự án Khu nhà ở xã hội tại Đa giác 3, Hùng Thắng</p>
                <a className="v2-news-more" href="https://www.quangninh.gov.vn/So/soxaydung/Trang/ChiTietTinTuc.aspx?nid=5440" target="_blank" rel="noopener">ĐỌC THÊM →</a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* POPUP XEM MẶT BẰNG CHI TIẾT GỐC */}
      <div className="modal fade" id="floorplanModal" tabIndex="-1" aria-labelledby="floorplanModalTitle" aria-hidden="true">
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header align-items-center gap-3">
              <h5 className="modal-title fw-bold text-emerald mb-0" id="floorplanModalTitle">MẶT BẰNG TÒA B</h5>
              <button type="button" className="btn-close m-0" data-bs-dismiss="modal" aria-label="Đóng"></button>
            </div>
            <div className="modal-body v2-fp-viewer-wrap">
              <iframe 
                className="v2-fp-viewer" 
                src="https://marinaliving.vn/images/M%E1%BA%B6T%20B%E1%BA%B0NG%20T%C3%92A%20B/TOA%20B_TANG%201.pdf#toolbar=0&navpanes=0&view=FitH" 
                title="Mặt bằng căn hộ Tòa B"
              ></iframe>
            </div>
            <div className="modal-footer justify-content-between">
              <span className="text-muted small">Nếu bản vẽ không hiển thị, hãy mở PDF trong tab mới.</span>
              <a className="btn btn-outline-emerald btn-sm" href="https://marinaliving.vn/images/M%E1%BA%B6T%20B%E1%BA%B0NG%20T%C3%92A%20B/TOA%20B_TANG%201.pdf" target="_blank" rel="noopener">
                Mở PDF trong tab mới
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
