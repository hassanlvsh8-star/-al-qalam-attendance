'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface StudentRow {
  id: number; name: string; student_number: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'camera_off' | 'mic_off' | null;
  lessons_missed: number | null;
  notes: string | null;
}

const STATUSES = ['present', 'late', 'excused', 'camera_off', 'mic_off', 'absent'] as const;
type Status = typeof STATUSES[number];

const STATUS_STYLES: Record<Status, { bg: string; text: string; border: string; label: string }> = {
  present:    { bg: '#dcfce7', text: '#166534', border: '#166534', label: 'Present' },
  late:       { bg: '#fef9c3', text: '#854d0e', border: '#854d0e', label: 'Late' },
  excused:    { bg: '#dbeafe', text: '#1e40af', border: '#1e40af', label: 'Excused' },
  camera_off: { bg: '#f3e8ff', text: '#6b21a8', border: '#6b21a8', label: 'Camera Off' },
  mic_off:    { bg: '#fce7f3', text: '#9d174d', border: '#9d174d', label: 'Mic Off' },
  absent:     { bg: '#fee2e2', text: '#991b1b', border: '#991b1b', label: 'Absent' },
};

const LESSON_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

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
  const [openNotes, setOpenNotes] = useState<Set<number>>(new Set());
  const [sendingNote, setSendingNote] = useState<number | null>(null);
  const [sentNote, setSentNote] = useState<Set<number>>(new Set());
  const [sendError, setSendError] = useState<Record<number, string>>({});

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
    setStudents(data.map(s => ({ ...s, status: s.status || 'present', lessons_missed: s.lessons_missed ?? null, notes: s.notes ?? null })));
    const cRes = await fetch('/api/admin/classes');
    const classes = await cRes.json();
    const cls = classes.find((c: { id: number; name: string }) => String(c.id) === classId);
    if (cls) setClassName(cls.name);
    setLoading(false);
  }, [classId, date]);

  useEffect(() => { load(); }, [load]);

  function markAll(status: Status) {
    setStudents(s => s.map(st => ({ ...st, status, lessons_missed: status === 'absent' ? (st.lessons_missed ?? 1) : st.lessons_missed })));
  }

  function toggleStudent(id: number, status: Status) {
    setStudents(s => s.map(st => st.id === id ? { ...st, status } : st));
  }

  function setLessons(id: number, lessons_missed: number) {
    setStudents(s => s.map(st => st.id === id ? { ...st, lessons_missed } : st));
  }

  function setNotes(id: number, notes: string) {
    setStudents(s => s.map(st => st.id === id ? { ...st, notes: notes || null } : st));
  }

  async function sendNote(student: StudentRow) {
    if (!student.notes?.trim()) return;
    setSendingNote(student.id);
    setSendError(e => { const n = { ...e }; delete n[student.id]; return n; });
    const res = await fetch('/api/teacher/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: student.id, message: student.notes.trim() }),
    });
    setSendingNote(null);
    if (!res.ok) {
      const d = await res.json();
      setSendError(e => ({ ...e, [student.id]: d.error || 'Failed to send' }));
    } else {
      setSentNote(prev => new Set(prev).add(student.id));
      setTimeout(() => setSentNote(prev => { const n = new Set(prev); n.delete(student.id); return n; }), 3000);
    }
  }

  function toggleNotes(id: number) {
    setOpenNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError('');
    const records = students.map(s => ({
      student_id: s.id,
      status: s.status || 'present',
      lessons_missed: s.status === 'absent' ? (s.lessons_missed ?? null) : null,
      notes: s.notes ?? null,
    }));
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
    present:    students.filter(s => s.status === 'present').length,
    late:       students.filter(s => s.status === 'late').length,
    excused:    students.filter(s => s.status === 'excused').length,
    camera_off: students.filter(s => s.status === 'camera_off').length,
    mic_off:    students.filter(s => s.status === 'mic_off').length,
    absent:     students.filter(s => s.status === 'absent').length,
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
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            {(Object.entries(counts) as [Status, number][]).map(([status, count]) => {
              const s = STATUS_STYLES[status];
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
                  style={{ background: s.bg, color: s.text, borderColor: s.border + '55' }}>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Student list */}
          <div className="space-y-2 mb-6">
            {students.map(student => (
              <div key={student.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <div>
                      <div className="font-medium text-gray-800">{student.name}</div>
                      <div className="text-xs text-gray-400 font-mono">#{student.student_number}</div>
                    </div>
                    <button
                      onClick={() => toggleNotes(student.id)}
                      title="Add note"
                      className="ml-1 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                      style={
                        student.notes
                          ? { background: '#dbeafe', color: '#1e40af' }
                          : openNotes.has(student.id)
                          ? { background: '#f3f4f6', color: '#374151' }
                          : { background: 'transparent', color: '#d1d5db' }
                      }>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6.414l-2.707 2.707A1 1 0 012 17V5z" clipRule="evenodd" />
                      </svg>
                    </button>
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
                            ? { background: s.bg, color: s.text, borderColor: s.border }
                            : { background: 'white', color: '#9ca3af', borderColor: '#e5e7eb' }}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes — shown when toggled or when a note already exists */}
                {(openNotes.has(student.id) || student.notes) && (
                  <div className="mt-3 pl-1 space-y-2">
                    <textarea
                      value={student.notes ?? ''}
                      onChange={e => { setNotes(student.id, e.target.value); setSentNote(prev => { const n = new Set(prev); n.delete(student.id); return n; }); }}
                      placeholder="Write a comment or message about this student…"
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder-gray-300 resize-none focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sendNote(student)}
                        disabled={!student.notes?.trim() || sendingNote === student.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                        style={sentNote.has(student.id)
                          ? { background: '#dcfce7', color: '#166534' }
                          : { background: '#1B2F5E', color: 'white' }}>
                        {sendingNote === student.id ? (
                          <span>Sending…</span>
                        ) : sentNote.has(student.id) ? (
                          <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>Sent</>
                        ) : (
                          <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M2.87 2.298a.75.75 0 0 0-.812.808l.7 5.255a.75.75 0 0 0 .59.628L8 9.8v.7a.75.75 0 0 0 1.28.53l4.5-4.5a.75.75 0 0 0 0-1.06l-4.5-4.5A.75.75 0 0 0 8 1.5v.7L3.348 3.13a.75.75 0 0 0-.478-.832Z" /></svg>Send Notification</>
                        )}
                      </button>
                      {sendError[student.id] && (
                        <span className="text-xs text-red-500">{sendError[student.id]}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Absent lessons dropdown — shown only when absent is selected */}
                {student.status === 'absent' && (
                  <div className="mt-3 flex items-center gap-2 pl-1">
                    <span className="text-xs text-red-700 font-medium">Lessons absent:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {LESSON_OPTIONS.map(n => (
                        <button
                          key={n}
                          onClick={() => setLessons(student.id, n)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                          style={student.lessons_missed === n
                            ? { background: '#fee2e2', color: '#991b1b', borderColor: '#991b1b' }
                            : { background: 'white', color: '#9ca3af', borderColor: '#e5e7eb' }}>
                          {n}
                        </button>
                      ))}
                      <span className="text-xs text-gray-400 self-center ml-1">
                        {student.lessons_missed == null ? 'whole day' : `lesson${student.lessons_missed > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

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
