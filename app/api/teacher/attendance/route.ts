import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db, getStudentsByClass, getAttendanceForClassDate, upsertAttendance, getPushSubscription, deletePushSubscription } from '@/lib/db';
import { sendPushNotification } from '@/lib/push';

async function requireTeacher() {
  const session = await getSession();
  if (session.role !== 'teacher' && session.role !== 'admin') return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireTeacher();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const class_id = parseInt(searchParams.get('class_id') || '');
  const date = searchParams.get('date') || '';

  if (!class_id || !date) return NextResponse.json({ error: 'class_id and date required' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  if (date > today) return NextResponse.json({ error: 'Cannot view attendance for a future date' }, { status: 400 });

  const students = await getStudentsByClass(class_id);
  const existing = await getAttendanceForClassDate(class_id, date);
  const statusMap = Object.fromEntries(existing.map(r => [r.student_id, { status: r.status, lessons_missed: r.lessons_missed, notes: r.notes }]));

  return NextResponse.json(students.map(s => ({
    ...s,
    status: statusMap[s.id]?.status || null,
    lessons_missed: statusMap[s.id]?.lessons_missed ?? null,
    notes: statusMap[s.id]?.notes ?? null,
  })));
}

export async function POST(req: NextRequest) {
  const session = await requireTeacher();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { class_id, date, records } = await req.json();

  const today = new Date().toISOString().slice(0, 10);
  if (date > today) return NextResponse.json({ error: 'Cannot mark attendance for a future date' }, { status: 400 });

  if (!class_id || !date || !Array.isArray(records)) {
    return NextResponse.json({ error: 'class_id, date, and records required' }, { status: 400 });
  }

  const markedBy = session.username || 'teacher';

  const validStatuses = ['present', 'absent', 'late', 'excused', 'camera_off', 'mic_off'];
  for (const { student_id, status, lessons_missed, notes } of records) {
    if (!validStatuses.includes(status)) continue;
    await upsertAttendance(student_id, date, status, markedBy, status === 'absent' ? (lessons_missed ?? null) : null, notes ?? null);
  }

  const notifyStatuses = new Set(['absent', 'late']);
  const toNotify = records.filter((r: { student_id: number; status: string }) => notifyStatuses.has(r.status));

  if (toNotify.length > 0) {
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const ids = toNotify.map((r: { student_id: number }) => r.student_id);
    const placeholders = ids.map(() => '?').join(',');
    const studentRows = await db.all<{ id: number; name: string }>(
      `SELECT id, name FROM students WHERE id IN (${placeholders})`, ids
    );
    const nameMap = Object.fromEntries(studentRows.map(s => [s.id, s.name]));

    Promise.all(
      toNotify.map(async (r: { student_id: number; status: string }) => {
        const sub = await getPushSubscription(r.student_id);
        if (!sub) return;
        try {
          const statusLabel = r.status === 'late' ? 'marked as late' : 'marked absent';
          await sendPushNotification(sub, {
            title: 'Al-Qalam Institute — Attendance',
            body: `${nameMap[r.student_id] || 'Your child'} has been ${statusLabel} on ${formattedDate}.`,
            icon: '/logo.png',
            badge: '/logo.png',
            data: { url: '/student' },
          });
        } catch (err) {
          if ((err as Error).message === 'SUBSCRIPTION_EXPIRED') {
            await deletePushSubscription(r.student_id);
          }
        }
      })
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
