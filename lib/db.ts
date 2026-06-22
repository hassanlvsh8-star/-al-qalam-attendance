import { createClient, Client } from '@libsql/client';
import bcrypt from 'bcryptjs';

let _client: Client | null = null;
let _schemaReady = false;

function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

// Convenience helpers mirroring better-sqlite3's API but async
export const db = {
  async get<T>(sql: string, args: unknown[] = []): Promise<T | undefined> {
    await ensureSchema();
    const result = await getClient().execute({ sql, args });
    return result.rows[0] as T | undefined;
  },
  async all<T>(sql: string, args: unknown[] = []): Promise<T[]> {
    await ensureSchema();
    const result = await getClient().execute({ sql, args });
    return result.rows as unknown as T[];
  },
  async run(sql: string, args: unknown[] = []) {
    await ensureSchema();
    return getClient().execute({ sql, args });
  },
};

async function ensureSchema() {
  if (_schemaReady) return;
  _schemaReady = true;
  const client = getClient();

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      class_id INTEGER NOT NULL REFERENCES classes(id),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id),
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
      marked_by TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, date)
    );
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id),
      subscription TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id)
    );
  `);

  await seedDefaults(client);
}

async function seedDefaults(client: Client) {
  const adminRow = await client.execute({ sql: 'SELECT id FROM admins WHERE username = ?', args: ['admin'] });
  if (adminRow.rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await client.execute({ sql: 'INSERT INTO admins (username, password_hash) VALUES (?, ?)', args: ['admin', hash] });
  }

  const teacherRow = await client.execute({ sql: 'SELECT id FROM teachers WHERE username = ?', args: ['teacher'] });
  if (teacherRow.rows.length === 0) {
    const hash = bcrypt.hashSync('teacher123', 10);
    await client.execute({ sql: 'INSERT INTO teachers (username, password_hash) VALUES (?, ?)', args: ['teacher', hash] });
  }

  // Remove legacy seed classes and their students/attendance
  const legacyClasses = ['Class 5A', 'Class 6B', 'Class 7C'];
  for (const name of legacyClasses) {
    const row = await client.execute({ sql: 'SELECT id FROM classes WHERE name = ?', args: [name] });
    if (row.rows.length > 0) {
      const id = (row.rows[0] as unknown as { id: number }).id;
      const students = await client.execute({ sql: 'SELECT id FROM students WHERE class_id = ?', args: [id] });
      for (const s of students.rows as unknown as { id: number }[]) {
        await client.execute({ sql: 'DELETE FROM attendance WHERE student_id = ?', args: [s.id] });
        await client.execute({ sql: 'DELETE FROM push_subscriptions WHERE student_id = ?', args: [s.id] });
        await client.execute({ sql: 'DELETE FROM students WHERE id = ?', args: [s.id] });
      }
      await client.execute({ sql: 'DELETE FROM classes WHERE id = ?', args: [id] });
    }
  }

  // Ensure all Al-Qalam classes exist (INSERT OR IGNORE = safe to run every time)
  const alQalamClasses = [
    'Year 1 AM Brothers', 'Year 1 AM Sisters',
    'Year 2 AM Brothers', 'Year 2 AM Sisters',
    'Year 3 AM Brothers', 'Year 3 AM Sisters',
    'Year 4 AM Brothers', 'Year 4 AM Sisters',
    'Year 5 AM Brothers', 'Year 5 AM Sisters',
    'Year 1 PM Brothers', 'Year 1 PM Sisters',
    'Year 2 PM Brothers', 'Year 2 PM Sisters',
    'Year 3 PM Brothers', 'Year 3 PM Sisters',
    'Year 4 PM Brothers', 'Year 4 PM Sisters',
    'Year 5 PM Brothers', 'Year 5 PM Sisters',
  ];
  for (const name of alQalamClasses) {
    await client.execute({ sql: 'INSERT OR IGNORE INTO classes (name) VALUES (?)', args: [name] });
  }

}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function getAdminByUsername(username: string) {
  return db.get<{ id: number; username: string; password_hash: string }>(
    'SELECT * FROM admins WHERE username = ?', [username]
  );
}

export async function getTeacherByUsername(username: string) {
  return db.get<{ id: number; username: string; password_hash: string }>(
    'SELECT * FROM teachers WHERE username = ?', [username]
  );
}

export async function getStudentByNumber(student_number: string) {
  return db.get<{ id: number; student_number: string; name: string; password_hash: string; class_id: number; active: number }>(
    'SELECT * FROM students WHERE student_number = ? AND active = 1', [student_number]
  );
}

export async function getAllClasses() {
  return db.all<{ id: number; name: string }>('SELECT * FROM classes ORDER BY name');
}

export async function getAllStudents() {
  return db.all<{ id: number; student_number: string; name: string; class_id: number; class_name: string; active: number }>(
    `SELECT s.*, c.name as class_name FROM students s JOIN classes c ON s.class_id = c.id ORDER BY c.name, s.name`
  );
}

export async function getStudentsByClass(class_id: number) {
  return db.all<{ id: number; student_number: string; name: string }>(
    'SELECT * FROM students WHERE class_id = ? AND active = 1 ORDER BY name', [class_id]
  );
}

export async function getNextStudentNumber() {
  const row = await db.get<{ student_number: string }>(
    'SELECT student_number FROM students ORDER BY CAST(student_number AS INTEGER) DESC LIMIT 1'
  );
  if (!row) return '1001';
  return String(parseInt(row.student_number) + 1);
}

export async function getAttendanceForClassDate(class_id: number, date: string) {
  return db.all<{ student_id: number; status: string }>(
    `SELECT a.student_id, a.status FROM attendance a
     JOIN students s ON a.student_id = s.id
     WHERE s.class_id = ? AND a.date = ? AND s.active = 1`,
    [class_id, date]
  );
}

export async function upsertAttendance(student_id: number, date: string, status: string, marked_by: string) {
  await db.run(
    `INSERT INTO attendance (student_id, date, status, marked_by) VALUES (?, ?, ?, ?)
     ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by, timestamp = datetime('now')`,
    [student_id, date, status, marked_by]
  );
}

export async function savePushSubscription(student_id: number, subscription: string) {
  await db.run(
    `INSERT INTO push_subscriptions (student_id, subscription) VALUES (?, ?)
     ON CONFLICT(student_id) DO UPDATE SET subscription = excluded.subscription, created_at = datetime('now')`,
    [student_id, subscription]
  );
}

export async function deletePushSubscription(student_id: number) {
  await db.run('DELETE FROM push_subscriptions WHERE student_id = ?', [student_id]);
}

export async function getPushSubscription(student_id: number): Promise<string | null> {
  const row = await db.get<{ subscription: string }>(
    'SELECT subscription FROM push_subscriptions WHERE student_id = ?', [student_id]
  );
  return row?.subscription ?? null;
}

export async function getStudentAttendance(student_id: number) {
  return db.all<{ date: string; status: string }>(
    'SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC', [student_id]
  );
}

export async function getAttendanceReport(class_id?: number, from?: string, to?: string) {
  let sql = `
    SELECT s.name, s.student_number, c.name as class_name, a.date, a.status
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE 1=1
  `;
  const args: unknown[] = [];
  if (class_id) { sql += ' AND s.class_id = ?'; args.push(class_id); }
  if (from) { sql += ' AND a.date >= ?'; args.push(from); }
  if (to) { sql += ' AND a.date <= ?'; args.push(to); }
  sql += ' ORDER BY a.date DESC, c.name, s.name';
  return db.all<{ name: string; student_number: string; class_name: string; date: string; status: string }>(sql, args);
}
