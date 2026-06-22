import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import StudentShell from './StudentShell';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session.role !== 'student') redirect('/login');
  return <StudentShell name={session.studentName!}>{children}</StudentShell>;
}
