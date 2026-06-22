import { getDb } from '@/lib/db';
import Link from 'next/link';

export default function AdminDashboard() {
  const db = getDb();
  const classCount = (db.prepare('SELECT COUNT(*) as c FROM classes').get() as { c: number }).c;
  const studentCount = (db.prepare('SELECT COUNT(*) as c FROM students WHERE active = 1').get() as { c: number }).c;
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayMarked = (db.prepare('SELECT COUNT(DISTINCT student_id) as c FROM attendance WHERE date = ?').get(todayDate) as { c: number }).c;
  const totalRecords = (db.prepare('SELECT COUNT(*) as c FROM attendance').get() as { c: number }).c;

  const recentAttendance = db.prepare(`
    SELECT a.date, c.name as class_name,
           COUNT(*) as total,
           SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    GROUP BY a.date, s.class_id
    ORDER BY a.date DESC, c.name
    LIMIT 10
  `).all() as { date: string; class_name: string; total: number; present: number }[];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Classes', value: classCount, color: '#1B2F5E' },
          { label: 'Active Students', value: studentCount, color: '#1B2F5E' },
          { label: 'Marked Today', value: todayMarked, color: '#C9973A' },
          { label: 'Total Records', value: totalRecords, color: '#1B2F5E' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-5 border-l-4"
            style={{ borderLeftColor: stat.color }}>
            <div className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/students" className="flex items-center gap-3 bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border border-gray-100">
          <span className="text-2xl">👥</span>
          <div>
            <div className="font-semibold text-gray-800">Manage Students</div>
            <div className="text-xs text-gray-500">Add, edit or deactivate</div>
          </div>
        </Link>
        <Link href="/admin/classes" className="flex items-center gap-3 bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border border-gray-100">
          <span className="text-2xl">🏫</span>
          <div>
            <div className="font-semibold text-gray-800">Manage Classes</div>
            <div className="text-xs text-gray-500">Add or rename classes</div>
          </div>
        </Link>
        <Link href="/admin/reports" className="flex items-center gap-3 bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border border-gray-100">
          <span className="text-2xl">📊</span>
          <div>
            <div className="font-semibold text-gray-800">Attendance Reports</div>
            <div className="text-xs text-gray-500">View & export CSV</div>
          </div>
        </Link>
      </div>

      {/* Recent attendance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Recent Attendance</h3>
          <Link href="/admin/reports" className="text-sm text-[#C9973A] hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Class</th>
                <th className="px-5 py-3 font-medium">Present / Total</th>
                <th className="px-5 py-3 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {recentAttendance.map((row, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-600">{row.date}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{row.class_name}</td>
                  <td className="px-5 py-3 text-gray-600">{row.present} / {row.total}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: row.present / row.total > 0.8 ? '#dcfce7' : '#fef9c3',
                        color: row.present / row.total > 0.8 ? '#166534' : '#854d0e'
                      }}>
                      {Math.round((row.present / row.total) * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
              {recentAttendance.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No attendance records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
