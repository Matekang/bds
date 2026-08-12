import fs from 'fs';
import path from 'path';
import { initialUsers, initialApplications } from './initialData';

const DB_FILE = path.join(process.cwd(), 'db.json');

// Khởi tạo database mặc định
const getInitialDbState = () => {
  // Tạo danh sách căn hộ mẫu cho Tòa B
  const units = [];
  const floors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

  floors.forEach(floor => {
    for (let roomIdx = 1; roomIdx <= 8; roomIdx++) {
      const roomNum = `B-${floor}${String(roomIdx).padStart(2, '0')}`;
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

      units.push({
        id: roomNum,
        tower: 'B',
        floor,
        roomNumber: roomNum,
        area,
        type,
        status: 'available',
        reservedByUserId: null,
        reservedAt: null
      });
    }
  });

  return {
    users: initialUsers || [],
    otps: [],
    applications: initialApplications || [],
    units,
    settings: {
      countdownDeadline: '2026-08-20T17:00:00.000Z'
    }
  };
};

let memoryDb = null;

const ensureDbDefaults = (db) => {
  if (!db) db = {};
  if (!Array.isArray(db.users) || db.users.length === 0) db.users = initialUsers || [];
  if (!Array.isArray(db.otps)) db.otps = [];
  if (!Array.isArray(db.applications) || db.applications.length === 0) db.applications = initialApplications || [];
  if (!Array.isArray(db.units) || db.units.length === 0) {
    db.units = getInitialDbState().units;
  }
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
