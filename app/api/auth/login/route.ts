import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminByUsername, getTeacherByUsername, getStudentByNumber } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { role, username, password } = await req.json();

  if (!role || !username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const session = await getSession();

  if (role === 'admin') {
    const admin = await getAdminByUsername(username);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    session.userId = admin.id;
    session.role = 'admin';
    session.username = admin.username;
    await session.save();
    return NextResponse.json({ redirect: '/admin' });
  }

  if (role === 'teacher') {
    const teacher = await getTeacherByUsername(username);
    if (!teacher || !bcrypt.compareSync(password, teacher.password_hash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    session.userId = teacher.id;
    session.role = 'teacher';
    session.username = teacher.username;
    await session.save();
    return NextResponse.json({ redirect: '/teacher' });
  }

  if (role === 'student') {
    const student = await getStudentByNumber(username);
    if (!student || !bcrypt.compareSync(password, student.password_hash)) {
      return NextResponse.json({ error: 'Invalid student number or password' }, { status: 401 });
    }
    session.userId = student.id;
    session.role = 'student';
    session.studentNumber = student.student_number;
    session.studentName = student.name;
    session.classId = student.class_id;
    await session.save();
    return NextResponse.json({ redirect: '/student' });
  }

  return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
}
