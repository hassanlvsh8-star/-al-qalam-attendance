'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Props {
  role: string;
  name?: string;
  navItems?: { label: string; href: string }[];
  activePath?: string;
}

export default function AppHeader({ role, name, navItems, activePath }: Props) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header style={{ background: '#1B2F5E' }} className="shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Image src="/logo.png" alt="logo" width={40} height={40} className="rounded-lg" />
        <div className="flex-1">
          <span className="text-white font-bold text-base leading-tight block">Al-Qalam Institute</span>
          <span className="text-[#C9973A] text-xs tracking-wide">
            {role === 'admin' ? 'Admin Portal' : role === 'teacher' ? 'Teacher Portal' : 'Student Portal'}
          </span>
        </div>
        {name && <span className="text-blue-200 text-sm hidden sm:block">{name}</span>}
        <button
          onClick={logout}
          className="text-xs px-3 py-1.5 rounded-lg text-white border border-white/30 hover:bg-white/10 transition-colors"
        >
          Sign out
        </button>
      </div>

      {navItems && navItems.length > 0 && (
        <div style={{ background: '#122040' }} className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
                style={activePath === item.href
                  ? { color: '#C9973A', borderBottom: '2px solid #C9973A' }
                  : { color: '#cbd5e1', borderBottom: '2px solid transparent' }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
