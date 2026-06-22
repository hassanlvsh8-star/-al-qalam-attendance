import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { savePushSubscription, deletePushSubscription } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const subscription = await req.json();
  await savePushSubscription(session.userId, JSON.stringify(subscription));
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSession();
  if (session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await deletePushSubscription(session.userId);
  return NextResponse.json({ ok: true });
}
