import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, session: null, message: 'No session found' }, { status: 200 });
    }
    const db = getDb();
    const user = db.users.find(u => u.id === session.userId);
    return NextResponse.json({ success: true, session, userFound: !!user });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
