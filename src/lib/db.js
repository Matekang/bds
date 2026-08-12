import fs from 'fs';
import path from 'path';
import os from 'os';
import { initialUsers, initialApplications } from './initialData';

const PROJECT_DB_FILE = path.join(process.cwd(), 'db.json');
const TMP_DB_FILE = path.join(os.tmpdir(), 'bds-db-v2.json');

// Khởi tạo database mặc định
const getInitialDbState = () => {
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
  if (globalThis.__bds_memory_db) {
    return ensureDbDefaults(globalThis.__bds_memory_db);
  }

  // 1. Đọc từ TMP_DB_FILE nếu có (file do saveDb vừa ghi trên Vercel /tmp)
  if (fs.existsSync(TMP_DB_FILE)) {
    try {
      const content = fs.readFileSync(TMP_DB_FILE, 'utf-8');
      globalThis.__bds_memory_db = ensureDbDefaults(JSON.parse(content));
      return globalThis.__bds_memory_db;
    } catch (e) {
      console.error('Error reading TMP_DB_FILE:', e.message);
    }
  }

  // 2. Đọc từ PROJECT_DB_FILE (gốc từ Git)
  if (fs.existsSync(PROJECT_DB_FILE)) {
    try {
      const content = fs.readFileSync(PROJECT_DB_FILE, 'utf-8');
      globalThis.__bds_memory_db = ensureDbDefaults(JSON.parse(content));
      try {
        fs.writeFileSync(TMP_DB_FILE, JSON.stringify(globalThis.__bds_memory_db, null, 2), 'utf-8');
      } catch (e) {}
      return globalThis.__bds_memory_db;
    } catch (error) {
      console.error('Error reading PROJECT_DB_FILE:', error.message);
    }
  }

  // 3. Fallback dùng getInitialDbState()
  const initialState = ensureDbDefaults(getInitialDbState());
  globalThis.__bds_memory_db = initialState;
  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
  } catch (e) {}
  return globalThis.__bds_memory_db;
};

export const saveDb = (data) => {
  const db = ensureDbDefaults(data);
  globalThis.__bds_memory_db = db;

  // Ghi vào PROJECT_DB_FILE nếu writable (Local environment)
  try {
    fs.writeFileSync(PROJECT_DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {}

  // Ghi vào TMP_DB_FILE (Luôn writable trên Vercel Serverless /tmp)
  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Could not write to TMP_DB_FILE:', error.message);
  }
};
