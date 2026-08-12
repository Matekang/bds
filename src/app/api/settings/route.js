import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const db = getDb();
    const defaultSettings = {
      countdownDeadline: "2026-08-30T17:00:00.000Z",
      operatingHours: {
        openTime: "08:00",
        closeTime: "17:30",
        enabled: true,
      },
      slaSettings: {
        overallDays: 30,
        intakeDays: 5,
        controlDays: 10,
        hardCopyDays: 5,
      }
    };

    const mergedSettings = { ...defaultSettings, ...db.settings };
    return NextResponse.json({ success: true, settings: mergedSettings });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Lỗi tải cài đặt.' });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Quyền truy cập bị từ chối.' }, { status: 403 });
    }

    const body = await request.json();
    const db = getDb();

    if (!db.settings) db.settings = {};

    if (body.countdownDeadline) db.settings.countdownDeadline = body.countdownDeadline;
    if (body.operatingHours) db.settings.operatingHours = body.operatingHours;
    if (body.slaSettings) db.settings.slaSettings = body.slaSettings;

    saveDb(db);

    return NextResponse.json({ success: true, message: 'Cập nhật cài đặt hệ thống thành công!', settings: db.settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống.' });
  }
}
