'use client';
import { useEffect, useState } from 'react';

interface Student {
  id: number; student_number: string; name: string;
  class_id: number; class_name: string; active: number;
}
interface Cls { id: number; name: string }

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Cls[]>([]);
  const [nextNumber, setNextNumber] = useState('');
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');

  // Add form
  const [form, setForm] = useState({ name: '', student_number: '', class_id: '', password: '' });
  const [showAdd, setShowAdd] = useState(false);

  // Edit modal
  const [editing, setEditing] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ name: '', class_id: '', newPassword: '' });

  async function load() {
    const [sRes, cRes] = await Promise.all([
      fetch('/api/admin/students'),
      fetch('/api/admin/classes'),
    ]);
    const sData = await sRes.json();
    setStudents(sData.students);
    setNextNumber(sData.nextNumber);
    setClasses(await cRes.json());
    setForm(f => ({ ...f, student_number: sData.nextNumber, class_id: '' }));
  }

  useEffect(() => { load(); }, []);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/students', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, class_id: Number(form.class_id) }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setShowAdd(false);
    setForm({ name: '', student_number: nextNumber, class_id: '', password: '' });
    load();
  }

  function openEdit(s: Student) {
    setEditing(s);
    setEditForm({ name: s.name, class_id: String(s.class_id), newPassword: '' });
    setError('');
  }

  async function saveEdit() {
    if (!editing) return;
    setError('');
    const res = await fetch(`/api/admin/students/${editing.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name, class_id: Number(editForm.class_id) }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    if (editForm.newPassword.trim()) {
      await fetch(`/api/admin/students/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', password: editForm.newPassword }),
      });
    }
    setEditing(null);
    load();
  }

  async function toggleActive(s: Student) {
    await fetch(`/api/admin/students/${s.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: s.active ? 'deactivate' : 'activate' }),
    });
    load();
  }

  const filtered = students.filter(s => {
    if (!showInactive && !s.active) return false;
    if (filterClass && String(s.class_id) !== filterClass) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.student_number.includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Students</h2>
        <button onClick={() => { setShowAdd(true); setForm(f => ({ ...f, student_number: nextNumber })); }}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: '#C9973A' }}>
          + Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[180px]"
          placeholder="Search name or number…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">No.</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-600">{s.student_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.class_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-3">
                    <button onClick={() => openEdit(s)} className="text-[#1B2F5E] hover:underline text-xs">Edit</button>
                    <button onClick={() => toggleActive(s)} className={`text-xs hover:underline ${s.active ? 'text-red-500' : 'text-green-600'}`}>
                      {s.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add New Student" onClose={() => { setShowAdd(false); setError(''); }}>
          <form onSubmit={addStudent} className="space-y-4">
            <Field label="Full Name">
              <input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Student Number">
              <input required className="input" value={form.student_number} onChange={e => setForm(f => ({ ...f, student_number: e.target.value }))} />
            </Field>
            <Field label="Class">
              <select required className="input" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                <option value="">Select class…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Password">
              <input required type="text" className="input" value={form.password} placeholder="e.g. student123"
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </Field>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2.5 rounded-lg text-white font-medium" style={{ background: '#1B2F5E' }}>Add Student</button>
              <button type="button" onClick={() => { setShowAdd(false); setError(''); }} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title={`Edit — ${editing.name}`} onClose={() => { setEditing(null); setError(''); }}>
          <div className="space-y-4">
            <Field label="Full Name">
              <input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Class">
              <select className="input" value={editForm.class_id} onChange={e => setEditForm(f => ({ ...f, class_id: e.target.value }))}>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="New Password (leave blank to keep current)">
              <input type="text" className="input" placeholder="Leave blank to keep"
                value={editForm.newPassword} onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))} />
            </Field>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={saveEdit} className="flex-1 py-2.5 rounded-lg text-white font-medium" style={{ background: '#1B2F5E' }}>Save Changes</button>
              <button onClick={() => { setEditing(null); setError(''); }} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
