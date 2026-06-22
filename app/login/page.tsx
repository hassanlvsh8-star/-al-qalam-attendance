'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Role = 'admin' | 'teacher' | 'student';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Login failed');
      return;
    }
    router.push(data.redirect);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #1B2F5E 0%, #122040 100%)' }}>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header band */}
        <div className="flex flex-col items-center py-8 px-6" style={{ background: '#1B2F5E' }}>
          <Image
            src="/logo.png"
            alt="Al-Qalam Institute logo"
            width={88}
            height={88}
            className="rounded-xl mb-4"
            priority
          />
          <h1 className="text-white text-2xl font-bold tracking-wide text-center">
            Al-Qalam Institute
          </h1>
          <p className="text-[#C9973A] text-sm mt-1 tracking-widest font-medium">
            Learn • Practice • Propagate
          </p>
          <p className="text-blue-200 text-xs mt-2 opacity-80">
            Attendance Register
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          {/* Role tabs */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
            {(['student', 'teacher', 'admin'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setError(''); }}
                className="flex-1 py-2 text-sm font-medium capitalize transition-colors"
                style={role === r
                  ? { background: '#1B2F5E', color: 'white' }
                  : { background: 'white', color: '#555' }}
              >
                {r === 'student' ? 'Student / Parent' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {role === 'student' ? 'Student Number' : 'Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={role === 'student' ? 'e.g. 1001' : role === 'teacher' ? 'teacher' : 'admin'}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-gray-900"
                style={{ '--tw-ring-color': '#C9973A' } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-gray-900"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-base transition-opacity disabled:opacity-60"
              style={{ background: loading ? '#888' : '#C9973A' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {role === 'student' && (
            <p className="text-center text-xs text-gray-400 mt-5">
              Your student number and password are provided by the school.
              <br />Contact admin if you have trouble logging in.
            </p>
          )}
        </div>
      </div>

      <p className="text-blue-200 text-xs mt-6 opacity-50">
        © {new Date().getFullYear()} Al-Qalam Institute, Leicester
      </p>
    </div>
  );
}
