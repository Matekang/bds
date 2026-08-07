import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'db.json');

// Khởi tạo database mặc định
const getInitialDbState = () => {
  // Tạo danh sách căn hộ mẫu cho Tòa B
  const units = [];
  const floors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]; // 13 viết thành 14 hoặc bỏ qua số 13
  
  floors.forEach(floor => {
    // Mỗi tầng có khoảng 8 căn hộ tiêu biểu
    for (let roomIdx = 1; roomIdx <= 8; roomIdx++) {
      const roomNum = `B-${floor}${String(roomIdx).padStart(2, '0')}`;
      
      // Phân chia loại hình ngẫu nhiên theo số phòng
      let type = '2PN';
      let area = 65.5;
      if (roomIdx === 1 || roomIdx === 8) {
        type = 'Studio';
        area = 35.2;
      } else if (roomIdx === 2 || roomIdx === 7) {
        type = '1PN';
        area = 45.8;
      } else if (roomIdx === 4) {
        type = '3PN';
        area = 82.4;
      }

      // Trạng thái ngẫu nhiên: 70% available, 10% reserved, 20% sold
      const rand = Math.random();
      let status = 'available';
      if (rand > 0.8) {
        status = 'sold';
      } else if (rand > 0.7) {
        status = 'reserved';
      }

      units.push({
        id: roomNum,
        tower: 'B',
        floor,
        roomNumber: roomNum,
        area,
        type,
        status,
        reservedByUserId: null,
        reservedAt: null
      });
    }
  });

  // Tài khoản Admin mặc định
  const defaultAdmin = {
    id: 'admin-id',
    fullName: 'Quản trị viên Hapro',
    phoneNumber: '0999999999',
    email: 'admin@hapro.vn',
    passwordHash: 'admin123', // Để đơn giản, ta lưu plain password hoặc mã hóa đơn giản trong demo
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  // Tài khoản User mặc định
  const defaultUser = {
    id: 'user-id',
    fullName: 'Đào Minh Hoàn',
    phoneNumber: '0901234567',
    email: 'hoan.dao@seabank.com.vn',
    passwordHash: 'demo', // Trùng mật khẩu ví dụ ở README.md của hapro
    role: 'user',
    createdAt: new Date().toISOString()
  };

  return {
    users: [defaultAdmin, defaultUser],
    otps: [],
    applications: [],
    units,
    settings: {
      countdownDeadline: '2026-08-20T17:00:00.000Z'
    }
  };
};

export const getDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initialState = getInitialDbState();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
    return initialState;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading database file, resetting...', error);
    const initialState = getInitialDbState();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
    return initialState;
  }
};

export const saveDb = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
};
