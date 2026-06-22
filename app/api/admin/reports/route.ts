import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAttendanceReport } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const class_id = searchParams.get('class_id') ? parseInt(searchParams.get('class_id')!) : undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const format = searchParams.get('format');

  const records = await getAttendanceReport(class_id, from, to);

  if (format === 'csv') {
    const header = 'Student Name,Student Number,Class,Date,Status\n';
    const rows = records.map(r =>
      `"${r.name}","${r.student_number}","${r.class_name}","${r.date}","${r.status}"`
    ).join('\n');
    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="attendance.csv"',
      },
    });
  }

  return NextResponse.json(records);
}
