'use client';
import { usePathname } from 'next/navigation';
import AppHeader from '@/components/AppHeader';

const NAV = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Students', href: '/admin/students' },
  { label: 'Classes', href: '/admin/classes' },
  { label: 'Reports', href: '/admin/reports' },
];

export default function AdminShell({ children, username }: { children: React.ReactNode; username: string }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader role="admin" name={username} navItems={NAV} activePath={pathname} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
