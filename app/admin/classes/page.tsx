'use client';
import { useEffect, useState } from 'react';

interface Cls { id: number; name: string }

export default function ClassesPage() {
  const [classes, setClasses] = useState<Cls[]>([]);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Cls | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/admin/classes');
    setClasses(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addClass() {
    setError('');
    const res = await fetch('/api/admin/classes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setNewName('');
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    setError('');
    const res = await fetch('/api/admin/classes', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.id, name: editing.name }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setEditing(null);
    load();
  }

  async function deleteClass(id: number) {
    setError('');
    const res = await fetch('/api/admin/classes', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    load();
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Classes</h2>

      {/* Add form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">Add New Class</h3>
        <div className="flex gap-2">
          <input
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
            placeholder="e.g. Class 8D"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addClass()}
          />
          <button onClick={addClass}
            disabled={!newName.trim()}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ background: '#1B2F5E' }}>
            Add
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {loading && <p className="px-5 py-8 text-center text-gray-400">Loading…</p>}
        {!loading && classes.length === 0 && <p className="px-5 py-8 text-center text-gray-400">No classes yet</p>}
        {classes.map(cls => (
          <div key={cls.id} className="flex items-center px-5 py-3 gap-3">
            {editing?.id === cls.id ? (
              <>
                <input
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
                <button onClick={saveEdit} className="text-green-600 text-sm font-medium">Save</button>
                <button onClick={() => setEditing(null)} className="text-gray-400 text-sm">Cancel</button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium text-gray-800">{cls.name}</span>
                <button onClick={() => setEditing(cls)} className="text-sm text-[#1B2F5E] hover:underline">Rename</button>
                <button onClick={() => deleteClass(cls.id)} className="text-sm text-red-500 hover:underline">Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
