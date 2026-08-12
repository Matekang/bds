import jsQR from 'jsqr';

/**
 * Đọc mã QR từ tệp ảnh (File) bằng jsQR và Canvas API
 * @param {File} file 
 * @returns {Promise<string|null>}
 */
export function readQrFromImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Giới hạn kích thước tối đa để tăng tốc xử lý QR
          const maxDim = 1200;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);

          const imageData = ctx.getImageData(0, 0, w, h);
          let code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (!code || !code.data) {
            code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            });
          }

          if (code && code.data) {
            resolve(code.data);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error("Error decoding QR image:", err);
          resolve(null);
        }
      };
      img.onerror = () => reject(new Error('Không thể tải file ảnh.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc tệp.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Phân tích chuỗi mã QR Căn cước công dân Việt Nam
 * Định dạng chuẩn CCCD:
 * Số_CCCD|Số_CMND_Cũ|Họ_tên|Ngày_sinh(DDMMYYYY)|Giới_tính|Địa_chỉ_thường_trú|Ngày_cấp(DDMMYYYY)
 */
export function parseCccdQr(qrString) {
  if (!qrString || typeof qrString !== 'string') return null;
  
  const trimmed = qrString.trim();
  const parts = trimmed.split('|');
  
  if (parts.length >= 6) {
    const cccdNumber = parts[0]?.trim() || '';
    const oldCmnd = parts[1]?.trim() || '';
    const fullName = parts[2]?.trim() || '';
    
    // Đổi định dạng DDMMYYYY -> DD/MM/YYYY
    const rawDob = parts[3]?.trim() || '';
    let dob = rawDob;
    if (rawDob.length === 8 && /^\d+$/.test(rawDob)) {
      dob = `${rawDob.slice(0, 2)}/${rawDob.slice(2, 4)}/${rawDob.slice(4)}`;
    }

    const gender = parts[4]?.trim() || '';
    const address = parts[5]?.trim() || '';

    // Đổi định dạng ngày cấp DDMMYYYY -> DD/MM/YYYY
    const rawIssueDate = parts[6]?.trim() || '';
    let issueDate = rawIssueDate;
    if (rawIssueDate && rawIssueDate.length === 8 && /^\d+$/.test(rawIssueDate)) {
      issueDate = `${rawIssueDate.slice(0, 2)}/${rawIssueDate.slice(2, 4)}/${rawIssueDate.slice(4)}`;
    }

    return {
      cccdNumber,
      oldCmnd,
      fullName,
      dob,
      gender,
      address,
      issueDate,
      rawQr: trimmed,
      scannedAt: new Date().toLocaleString('vi-VN')
    };
  }

  // Thuật toán quét mẫu fallback nếu chuỗi QR chứa thông tin CCCD định dạng khác
  const cccdMatch = trimmed.match(/\b\d{12}\b/);
  if (cccdMatch) {
    return {
      cccdNumber: cccdMatch[0],
      oldCmnd: '',
      fullName: '',
      dob: '',
      gender: '',
      address: '',
      issueDate: '',
      rawQr: trimmed,
      scannedAt: new Date().toLocaleString('vi-VN')
    };
  }

  return null;
}

/**
 * Danh sách mẫu QR CCCD chuẩn Việt Nam phục vụ dùng thử (Demo)
 */
export const sampleCccdQrData = [
  {
    label: "Mẫu 1: Nguyễn Văn An (Hà Nội)",
    qrString: "035200008801|123456789|Nguyễn Văn An|15081992|Nam|Xã Thiên Lộc, Huyện Đông Anh, Thành phố Hà Nội|10052021"
  },
  {
    label: "Mẫu 2: Trần Thị Mai (Quảng Ninh)",
    qrString: "022195001234|987654321|Trần Thị Mai|20111995|Nữ|Phường Bãi Cháy, Thành phố Hạ Long, Tỉnh Quảng Ninh|15092022"
  },
  {
    label: "Mẫu 3: Đào Minh Hoàn (Hải Phòng)",
    qrString: "031090005678|112233445|Đào Minh Hoàn|05041990|Nam|Số 45 Phố Lê Hồng Phong, Quận Ngô Quyền, Thành phố Hải Phòng|02012023"
  }
];
