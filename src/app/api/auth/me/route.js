import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ session: null, message: 'No session found' }, { status: 401 });
    }
    const db = getDb();
    const user = db.users.find(u => u.id === session.userId);
    return NextResponse.json({ session, userFound: !!user, userIds: db.users.map(u => u.id) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
