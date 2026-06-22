import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import AdminShell from './AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session.role !== 'admin') redirect('/login');
  return <AdminShell username={session.username!}>{children}</AdminShell>;
}
