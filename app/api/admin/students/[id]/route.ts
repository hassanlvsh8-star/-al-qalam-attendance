import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';

async function requireAdmin() {
  const session = await getSession();
  if (session.role !== 'admin') return null;
  return session;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  if (body.action === 'reset_password') {
    if (!body.password?.trim()) return NextResponse.json({ error: 'Password required' }, { status: 400 });
    const hash = bcrypt.hashSync(body.password, 10);
    await db.run('UPDATE students SET password_hash = ? WHERE id = ?', [hash, id]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'deactivate') {
    await db.run('UPDATE students SET active = 0 WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'activate') {
    await db.run('UPDATE students SET active = 1 WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  }

  const { name, class_id } = body;
  if (!name?.trim() || !class_id) return NextResponse.json({ error: 'Name and class required' }, { status: 400 });
  await db.run('UPDATE students SET name = ?, class_id = ? WHERE id = ?', [name.trim(), class_id, id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await db.run('UPDATE students SET active = 0 WHERE id = ?', [id]);
  return NextResponse.json({ ok: true });
}
