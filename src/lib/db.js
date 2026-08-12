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

      const status = 'available';

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

  // Tài khoản Admin cao cấp mặc định
  const defaultAdmin = {
    id: 'admin-id',
    fullName: 'Quản trị viên Hapro (Super Admin)',
    phoneNumber: '0999999999',
    email: 'admin@hapro.vn',
    passwordHash: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  // Cán bộ Tổ tiếp nhận (Chỉ xử lý Giai đoạn 1)
  const officerIntake = {
    id: 'officer-intake-id',
    fullName: 'Nguyễn Văn Tùng (Tổ tiếp nhận)',
    phoneNumber: '0911111111',
    email: 'tung.nv@hapro.vn',
    passwordHash: 'intake123',
    role: 'officer_intake',
    createdAt: new Date().toISOString()
  };

  // Cán bộ Tổ kiểm soát (Chỉ xử lý Giai đoạn 2)
  const officerControl = {
    id: 'officer-control-id',
    fullName: 'Lê Hoàng Nam (Tổ kiểm soát)',
    phoneNumber: '0922222222',
    email: 'nam.lh@hapro.vn',
    passwordHash: 'control123',
    role: 'officer_control',
    createdAt: new Date().toISOString()
  };

  // Cán bộ Tiếp nhận bản gốc (Chỉ xử lý Giai đoạn 3)
  const officerHardcopy = {
    id: 'officer-hardcopy-id',
    fullName: 'Trần Thị Mai (Tiếp nhận bản gốc)',
    phoneNumber: '0933333333',
    email: 'mai.tt@hapro.vn',
    passwordHash: 'hardcopy123',
    role: 'officer_hardcopy',
    createdAt: new Date().toISOString()
  };

  // Cán bộ Lưu trữ (Chỉ quản lý Giai đoạn 4 & Căn hộ)
  const officerArchive = {
    id: 'officer-archive-id',
    fullName: 'Phạm Quốc Bảo (Bộ phận lưu trữ)',
    phoneNumber: '0944444444',
    email: 'bao.pq@hapro.vn',
    passwordHash: 'archive123',
    role: 'officer_archive',
    createdAt: new Date().toISOString()
  };

  // Tài khoản User người dân mặc định
  const defaultUser = {
    id: 'user-id',
    fullName: 'Đào Minh Hoàn',
    phoneNumber: '0901234567',
    email: 'hoan.dao@seabank.com.vn',
    passwordHash: 'demo',
    role: 'user',
    createdAt: new Date().toISOString()
  };

  return {
    users: [defaultAdmin, officerIntake, officerControl, officerHardcopy, officerArchive, defaultUser],
    otps: [],
    applications: [],
    units,
    settings: {
      countdownDeadline: '2026-08-20T17:00:00.000Z'
    }
  };
};

let memoryDb = null;

const ensureDbDefaults = (db) => {
  if (!db) db = {};
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.otps)) db.otps = [];
  if (!Array.isArray(db.applications)) db.applications = [];
  if (!Array.isArray(db.units)) db.units = [];
  if (!db.settings) db.settings = { countdownDeadline: '2026-08-20T17:00:00.000Z' };
  return db;
};

export const getDb = () => {
  if (memoryDb) {
    return ensureDbDefaults(memoryDb);
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialState = ensureDbDefaults(getInitialDbState());
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not write initial db.json to filesystem, using in-memory state:', e.message);
    }
    memoryDb = initialState;
    return memoryDb;
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    memoryDb = ensureDbDefaults(JSON.parse(content));
    return memoryDb;
  } catch (error) {
    console.error('Error reading database file, resetting...', error);
    const initialState = ensureDbDefaults(getInitialDbState());
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
    } catch (e) {}
    memoryDb = initialState;
    return memoryDb;
  }
};

export const saveDb = (data) => {
  memoryDb = ensureDbDefaults(data);
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Could not write to db.json (read-only filesystem or permission error):', error.message);
  }
};
