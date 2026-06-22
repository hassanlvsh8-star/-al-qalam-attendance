import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db, getStudentAttendance } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (session.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const records = await getStudentAttendance(session.userId);

  const total = records.length;
  const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : null;

  const classInfo = await db.get<{ class_name: string }>(
    `SELECT c.name as class_name FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = ?`,
    [session.userId]
  );

  return NextResponse.json({
    records,
    stats: { total, present, percentage },
    className: classInfo?.class_name,
  });
}
