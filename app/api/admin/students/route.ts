import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { db, getAllStudents, getNextStudentNumber } from '@/lib/db';

async function requireAdmin() {
  const session = await getSession();
  if (session.role !== 'admin') return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ students: await getAllStudents(), nextNumber: await getNextStudentNumber() });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, student_number, class_id, password } = await req.json();
  if (!name?.trim() || !student_number?.trim() || !class_id || !password?.trim()) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = await db.run(
      'INSERT INTO students (name, student_number, class_id, password_hash) VALUES (?, ?, ?, ?)',
      [name.trim(), student_number.trim(), class_id, hash]
    );
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Student number already exists' }, { status: 409 });
  }
}
