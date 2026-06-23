import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMessagesForStudent, markMessagesRead } from '@/lib/db';

async function requireStudent() {
  const session = await getSession();
  if (session.role !== 'student' || !session.userId) return null;
  return session;
}

export async function GET() {
  const session = await requireStudent();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const messages = await getMessagesForStudent(session.userId);
  return NextResponse.json(messages);
}

export async function POST() {
  const session = await requireStudent();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await markMessagesRead(session.userId);
  return NextResponse.json({ ok: true });
}
