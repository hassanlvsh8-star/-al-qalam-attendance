import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db, getPushSubscription, deletePushSubscription, saveMessage } from '@/lib/db';
import { sendPushNotification } from '@/lib/push';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session.role !== 'teacher' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { student_id, message } = await req.json();
  if (!student_id || !message?.trim()) {
    return NextResponse.json({ error: 'student_id and message required' }, { status: 400 });
  }

  const sentBy = session.username || 'Teacher';

  // Always save to DB so student sees it on their dashboard
  await saveMessage(student_id, sentBy, message.trim());

  // Try push notification — silently skip if no subscription
  const sub = await getPushSubscription(student_id);
  if (sub) {
    const student = await db.get<{ name: string }>('SELECT name FROM students WHERE id = ?', [student_id]);
    try {
      await sendPushNotification(sub, {
        title: `Al-Qalam Institute — Message for ${student?.name ?? 'Student'}`,
        body: message.trim(),
        icon: '/logo.png',
        badge: '/logo.png',
        data: { url: '/student' },
      });
    } catch (err) {
      if ((err as Error).message === 'SUBSCRIPTION_EXPIRED') {
        await deletePushSubscription(student_id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
