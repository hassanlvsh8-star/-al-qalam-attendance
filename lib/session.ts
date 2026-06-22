import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId: number;
  role: 'admin' | 'teacher' | 'student';
  username?: string;
  studentNumber?: string;
  studentName?: string;
  classId?: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'al-qalam-attendance-secret-key-32chars!!',
  cookieName: 'aq_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
