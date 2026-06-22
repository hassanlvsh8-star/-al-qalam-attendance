import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import TeacherShell from './TeacherShell';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session.role !== 'teacher') redirect('/login');
  return <TeacherShell>{children}</TeacherShell>;
}
