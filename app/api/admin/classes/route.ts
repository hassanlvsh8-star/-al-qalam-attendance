import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db, getAllClasses } from '@/lib/db';

async function requireAdmin() {
  const session = await getSession();
  if (session.role !== 'admin') return null;
  return session;
}

export async function GET() {
  const session = await getSession();
  if (session.role !== 'admin' && session.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await getAllClasses());
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  try {
    const result = await db.run('INSERT INTO classes (name) VALUES (?)', [name.trim()]);
    return NextResponse.json({ id: result.lastInsertRowid, name: name.trim() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Class name already exists' }, { status: 409 });
  }
}

export async function PUT(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, name } = await req.json();
  if (!id || !name?.trim()) return NextResponse.json({ error: 'ID and name required' }, { status: 400 });
  try {
    await db.run('UPDATE classes SET name = ? WHERE id = ?', [name.trim(), id]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Class name already exists' }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  const hasStudents = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM students WHERE class_id = ? AND active = 1', [id]);
  if (hasStudents && hasStudents.c > 0) return NextResponse.json({ error: 'Cannot delete a class with active students' }, { status: 409 });
  await db.run('DELETE FROM classes WHERE id = ?', [id]);
  return NextResponse.json({ ok: true });
}
