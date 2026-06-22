'use client';
import AppHeader from '@/components/AppHeader';

export default function StudentShell({ children, name }: { children: React.ReactNode; name: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader role="student" name={name} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
