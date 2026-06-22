'use client';
import { useEffect, useState } from 'react';

interface AttendanceRow {
  name: string; student_number: string; class_name: string; date: string; status: string;
}
interface Cls { id: number; name: string }

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
  excused: 'bg-blue-100 text-blue-700',
};

export default function ReportsPage() {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [classes, setClasses] = useState<Cls[]>([]);
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/classes').then(r => r.json()).then(setClasses);
  }, []);

  async function loadReport() {
    setLoading(true);
    const params = new URLSearchParams();
    if (classId) params.set('class_id', classId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch('/api/admin/reports?' + params);
    setRecords(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadReport(); }, []); // initial load

  function downloadCSV() {
    const params = new URLSearchParams({ format: 'csv' });
    if (classId) params.set('class_id', classId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    window.open('/api/admin/reports?' + params);
  }

  // Summary stats
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Attendance Reports</h2>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button onClick={loadReport} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: '#1B2F5E' }}>
            Apply
          </button>
          <button onClick={downloadCSV} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: '#C9973A' }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: total, color: '#1B2F5E' },
            { label: 'Present', value: present, color: '#16a34a' },
            { label: 'Absent', value: absent, color: '#dc2626' },
            { label: 'Late/Excused', value: late + records.filter(r => r.status === 'excused').length, color: '#d97706' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-4 border-l-4 text-center"
              style={{ borderLeftColor: s.color }}>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">No.</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!loading && records.map((r: AttendanceRow, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-3 text-gray-600">{r.class_name}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">{r.student_number}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
