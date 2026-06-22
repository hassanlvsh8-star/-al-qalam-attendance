'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface StudentRow {
  id: number; name: string; student_number: string;
  status: 'present' | 'absent' | 'late' | 'excused' | null;
}

const STATUSES = ['present', 'absent', 'late', 'excused'] as const;
type Status = typeof STATUSES[number];

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  present: { bg: '#dcfce7', text: '#166534', label: 'Present' },
  absent: { bg: '#fee2e2', text: '#991b1b', label: 'Absent' },
  late: { bg: '#fef9c3', text: '#854d0e', label: 'Late' },
  excused: { bg: '#dbeafe', text: '#1e40af', label: 'Excused' },
};

function AttendancePage() {
  const params = useSearchParams();
  const router = useRouter();
  const classId = params.get('class_id') || '';
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(params.get('date') || today);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [className, setClassName] = useState('');

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setSaved(false);
    setError('');
    const res = await fetch(`/api/teacher/attendance?class_id=${classId}&date=${date}`);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error);
      setLoading(false);
      return;
    }
    const data: StudentRow[] = await res.json();
    setStudents(data.map(s => ({ ...s, status: s.status || 'present' })));
    // get class name from admin API
    const cRes = await fetch('/api/admin/classes');
    const classes = await cRes.json();
    const cls = classes.find((c: { id: number; name: string }) => String(c.id) === classId);
    if (cls) setClassName(cls.name);
    setLoading(false);
  }, [classId, date]);

  useEffect(() => { load(); }, [load]);

  function markAll(status: Status) {
    setStudents(s => s.map(st => ({ ...st, status })));
  }

  function toggleStudent(id: number, status: Status) {
    setStudents(s => s.map(st => st.id === id ? { ...st, status } : st));
  }

  async function save() {
    setSaving(true);
    setError('');
    const records = students.map(s => ({ student_id: s.id, status: s.status || 'present' }));
    const res = await fetch('/api/teacher/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: Number(classId), date, records }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setSaved(true);
  }

  const counts = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
    excused: students.filter(s => s.status === 'excused').length,
  };

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push('/teacher')}
          className="text-gray-400 hover:text-gray-700 text-xl leading-none">‹</button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{className || 'Class'} — Attendance</h2>
          <p className="text-sm text-gray-400">Mark who is present for the selected date</p>
        </div>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
        <label className="text-sm font-medium text-gray-700">Date:</label>
        <input type="date" max={today} value={date}
          onChange={e => setDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
        {date !== today && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Editing past date</span>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Object.entries(counts).map(([status, count]) => {
              const s = STATUS_STYLES[status as Status];
              return (
                <div key={status} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                  <div className="text-xl font-bold" style={{ color: s.text }}>{count}</div>
                  <div className="text-xs" style={{ color: s.text }}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Mark all buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-gray-500 self-center mr-1">Mark all:</span>
            {STATUSES.map(status => {
              const s = STATUS_STYLES[status];
              return (
                <button key={status} onClick={() => markAll(status)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ background: s.bg, color: s.text, borderColor: s.text + '33' }}>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Student list */}
          <div className="space-y-2 mb-6">
            {students.map(student => {
              const currentStyle = student.status ? STATUS_STYLES[student.status] : null;
              return (
                <div key={student.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{student.name}</div>
                    <div className="text-xs text-gray-400 font-mono">#{student.student_number}</div>
                  </div>
                  {/* Status toggles */}
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {STATUSES.map(status => {
                      const s = STATUS_STYLES[status];
                      const active = student.status === status;
                      return (
                        <button key={status} onClick={() => toggleStudent(student.id, status)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border min-w-[64px]"
                          style={active
                            ? { background: s.bg, color: s.text, borderColor: s.text }
                            : { background: 'white', color: '#9ca3af', borderColor: '#e5e7eb' }}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {students.length === 0 && (
              <div className="text-center py-12 text-gray-400">No active students in this class</div>
            )}
          </div>

          {/* Save button */}
          {students.length > 0 && (
            <div className="sticky bottom-4">
              <button onClick={save} disabled={saving}
                className="w-full py-4 rounded-xl text-white text-base font-bold shadow-lg transition-all disabled:opacity-60"
                style={{ background: saved ? '#16a34a' : '#1B2F5E' }}>
                {saving ? 'Saving…' : saved ? '✓ Saved Successfully' : 'Save Attendance'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AttendancePageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">Loading…</div>}>
      <AttendancePage />
    </Suspense>
  );
}
