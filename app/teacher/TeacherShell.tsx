'use client';
import AppHeader from '@/components/AppHeader';

export default function TeacherShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader role="teacher" name="Teacher" />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
